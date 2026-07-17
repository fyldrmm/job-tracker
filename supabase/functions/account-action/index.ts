// One Edge Function for every password-gated account action. The reusable
// part -- verify the caller's session, then verify their password
// server-side -- is written once here; each sensitive action is a case in
// the dispatch below. Adding a future password-gated action means adding a
// case, NOT deploying another function.
//
// Deliberately built and deployed ONE ACTION AT A TIME: `delete` first,
// curl-tested standalone against a real account before anything else was
// added, then `change-password` added and ALSO curl-tested standalone
// before any UI touched it. An earlier attempt at this function added
// change-password and wired the UI to it without that isolated
// verification step, and it broke in a way that took a long debugging
// session to even localize -- see PLAN.md M7 notes.
//
// Why the password check lives here and not (only) in the browser: a
// client-side check is a UX gate, not a security boundary. Anyone with a
// valid session token could call this function directly, skipping the UI.
// Verifying server-side means a bare stolen session token is not enough on
// its own to delete an account or change its password.
//
// Deployed via the Supabase dashboard's Edge Functions editor (no CLI link
// set up). SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY
// are injected by the platform; RESEND_API_KEY / DELETE_EMAIL_FROM are
// Function secrets.
//
// SUPABASE_SERVICE_ROLE_KEY note: a client built from just the caller's
// Authorization header (global.headers override) is enough for getUser()
// and RPC calls, but auth.updateUser() and auth.signOut() need an actual
// session set via setSession() -- which we don't have (only an access
// token, no refresh token) -- and throw "Auth session missing!" otherwise.
// Confirmed by hitting this exact error live. Fixed by using the admin API
// (service-role client) for updateUserById, and a raw fetch to the
// /auth/v1/logout REST endpoint (same one the JS SDK calls internally) for
// signing out other sessions, since that only needs the bearer token in
// the header, not the SDK's internal session state.
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
  // Best-effort -- a failure here (bad API key, Resend outage) must not
  // block the user's right to delete their own data.
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
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Session-scoped client: identifies the caller, and scopes the delete RPC
  // to their own account via auth.uid().
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Service-role client for admin-only operations (updateUserById). Never
  // exposed to the frontend -- this only ever runs server-side.
  const admin = createClient(supabaseUrl, supabaseServiceRoleKey)

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
      // Email BEFORE deletion -- once delete_own_account() runs, the
      // user's email no longer exists to send to.
      await sendDeletionEmail(user.email)
      const { error } = await supabase.rpc('delete_own_account')
      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ success: true })
    }
    case 'change-password': {
      if (!newPassword || newPassword.length < 6) {
        return jsonResponse({ error: 'New password must be at least 6 characters.' }, 400)
      }
      const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
      if (error) return jsonResponse({ error: error.message }, 500)
      // Sign out every OTHER session/device now that the password changed --
      // keeps the current session (this request's) alive. This revokes
      // refresh tokens; an already-issued access token on another device
      // stays valid until its own short natural expiry, it just can't renew
      // after this point. Raw fetch to the REST endpoint directly (not
      // supabase.auth.signOut()) since that SDK method needs a locally-set
      // session we don't have -- this only needs the bearer token itself.
      try {
        await fetch(`${supabaseUrl}/auth/v1/logout?scope=others`, {
          method: 'POST',
          headers: { Authorization: authHeader, apikey: supabaseAnonKey },
        })
      } catch (err) {
        console.error('account-action: sign-out-others failed after password change', err)
      }
      return jsonResponse({ success: true })
    }
    default:
      return jsonResponse({ error: `Unknown action: ${action}` }, 400)
  }
})
