// Deletes the caller's own account, after best-effort emailing them a
// confirmation first. Runs server-side because the confirmation email MUST
// be sent before deletion -- once delete_own_account() runs, the auth.users
// row (and the caller's email address) is gone, so there is no "after" to
// send it from. Deployed via the Supabase dashboard's Edge Functions editor
// (see PLAN.md for the manual setup steps); SUPABASE_URL and
// SUPABASE_ANON_KEY are injected automatically by the platform.
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Best-effort confirmation email -- a failure here (bad API key, Resend
  // outage, etc.) must not block the user's right to delete their own data.
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('DELETE_EMAIL_FROM') ?? 'noreply@fazare.dev'
  if (resendApiKey && user.email) {
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
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
