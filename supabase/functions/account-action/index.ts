// One Edge Function for every password-gated account action (supersedes the
// old single-purpose delete-account function). The reusable part -- verify
// the caller's session, then verify their password server-side -- is written
// once here; each sensitive action is just a case in the dispatch below.
// Adding a future password-gated action means adding a case, NOT deploying
// another function.
//
// Why the password check lives here and not (only) in the browser: a
// client-side check is a UX gate, not a security boundary. Anyone with a
// valid session token could call this function directly, skipping the UI. By
// verifying the password server-side, a bare stolen session token is not
// enough on its own to delete an account or change its password.
//
// Deployed via the Supabase dashboard's Edge Functions editor (no CLI link
// set up -- see PLAN.md M7). SUPABASE_URL and SUPABASE_ANON_KEY are injected
// by the platform; RESEND_API_KEY / DELETE_EMAIL_FROM are Function secrets.
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

async function sendDeletionEmail(email: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('DELETE_EMAIL_FROM') ?? 'noreply@fazare.dev'
  if (!resendApiKey) return
  // Best-effort -- a failure here (bad API key, Resend outage) must not block
  // the user's right to delete their own data.
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: 'Your Job Application Tracker account has been deleted',
        text:
          'This confirms your Job Application Tracker account and all associated data ' +
          'have been permanently deleted. If you did not request this, please contact us immediately.',
      }),
    })
  } catch (err) {
    console.error('account-action: confirmation email failed', err)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401)
  }

  let action: string | undefined
  let password: string | undefined
  let newPassword: string | undefined
  try {
    const body = await req.json()
    action = body?.action
    password = body?.password
    newPassword = body?.newPassword
  } catch {
    // malformed/empty body -- handled by the checks below
  }

  if (!action) return jsonResponse({ error: 'Missing action' }, 400)
  if (!password) return jsonResponse({ error: 'Password is required' }, 400)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Session-scoped client: identifies the caller, and scopes the privileged
  // actions below to their own account (delete RPC uses auth.uid();
  // updateUser uses this session's access token).
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

  // The reusable gate: verify the password on a SEPARATE plain client so it
  // doesn't disturb the caller's own session above.
  const verifier = createClient(supabaseUrl, supabaseAnonKey)
  const { error: passwordError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (passwordError) {
    return jsonResponse({ error: 'Incorrect password.' }, 401)
  }

  switch (action) {
    case 'delete': {
      // Email BEFORE deletion -- once delete_own_account() runs, the user's
      // email no longer exists to send to.
      await sendDeletionEmail(user.email)
      const { error } = await supabase.rpc('delete_own_account')
      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ success: true })
    }
    case 'change-password': {
      if (!newPassword || newPassword.length < 6) {
        return jsonResponse({ error: 'New password must be at least 6 characters.' }, 400)
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ success: true })
    }
    default:
      return jsonResponse({ error: `Unknown action: ${action}` }, 400)
  }
})
