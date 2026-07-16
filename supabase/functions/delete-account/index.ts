// Deletes the caller's own account, after verifying their password and
// sending a best-effort confirmation email -- both server-side.
//
// Password verification happens HERE, not just in the browser, because a
// client-side-only check (calling signInWithPassword before invoking this
// function) is a UX gate, not a security boundary -- anyone with a valid
// session token could call this function directly, bypassing the browser
// UI entirely. Requiring the password in the request body and verifying it
// against Supabase Auth here means a bare stolen session token is no longer
// enough on its own to delete the account.
//
// The confirmation email must be sent BEFORE deletion, since the user's
// email no longer exists to send to once delete_own_account() has run.
// Deployed via the Supabase dashboard's Edge Functions editor (see
// PLAN.md for the manual setup steps); SUPABASE_URL and SUPABASE_ANON_KEY
// are injected automatically by the platform.
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401)
  }

  let password: string | undefined
  try {
    const body = await req.json()
    password = body?.password
  } catch {
    // no body -- password stays undefined, handled below
  }
  if (!password) {
    return jsonResponse({ error: 'Password is required' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Bound to the caller's own session -- identifies who's asking, and later
  // scopes the delete RPC to auth.uid() via that same session.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user || !user.email) {
    return jsonResponse({ error: 'Not authenticated' }, 401)
  }

  // Verify the password server-side, on a separate plain client so it
  // doesn't disturb the caller's own session above.
  const verifier = createClient(supabaseUrl, supabaseAnonKey)
  const { error: passwordError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (passwordError) {
    return jsonResponse({ error: 'Incorrect password.' }, 401)
  }

  // Best-effort confirmation email -- a failure here (bad API key, Resend
  // outage, etc.) must not block the user's right to delete their own data.
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('DELETE_EMAIL_FROM') ?? 'noreply@fazare.dev'
  if (resendApiKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: user.email,
          subject: 'Your Job Application Tracker account has been deleted',
          text:
            'This confirms your Job Application Tracker account and all associated data ' +
            'have been permanently deleted. If you did not request this, please contact us immediately.',
        }),
      })
    } catch (err) {
      console.error('delete-account: confirmation email failed', err)
    }
  }

  const { error: deleteError } = await supabase.rpc('delete_own_account')
  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500)
  }

  return jsonResponse({ success: true })
})
