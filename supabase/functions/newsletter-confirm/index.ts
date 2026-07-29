// Unsubscribe handler for the OfferTrail newsletter -- the link inside the
// "You're subscribed" notice email (see newsletter-subscribe). Opened
// directly by the browser, not routed through the SPA, same shape as how
// Supabase's own GoTrue auth-confirmation links work.
//
// Repurposed 2026-07-29 from a double-opt-in CONFIRM handler (security
// review 2026-07-28, Finding #6) into an UNSUBSCRIBE handler, when
// newsletter-subscribe switched back to single opt-in at explicit user
// request. The token/table it reads (newsletter_pending_confirmations) is
// unchanged -- newsletter-subscribe now writes it as an unsubscribe token
// rather than a confirm-before-add token. Deliberately no expiry check
// (unlike the old confirm flow's 7-day window): an unsubscribe link should
// keep working indefinitely, since the whole point is letting someone opt
// out whenever they decide to.
//
// Deployed via the Supabase dashboard's Edge Functions editor (no CLI link
// set up), same as the other three functions in this repo.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const FUNCTION_VERSION = 'newsletter-confirm@2026-07-29.1'

function htmlResponse(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>OfferTrail</title>
    <style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1.5rem;color:#1a2e1a}</style>
    </head><body>${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'x-function-version': FUNCTION_VERSION } },
  )
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return htmlResponse('<h1>Invalid link</h1><p>This unsubscribe link is missing its token.</p>', 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data: pending, error: fetchError } = await admin
    .from('newsletter_pending_confirmations')
    .select('email')
    .eq('token', token)
    .maybeSingle()

  if (fetchError) {
    console.error('newsletter-confirm: lookup failed', fetchError)
    return htmlResponse('<h1>Something went wrong</h1><p>Please try again in a moment.</p>', 500)
  }

  if (!pending) {
    return htmlResponse(
      "<h1>Link already used</h1><p>This unsubscribe link has already been used, or never existed. If you're still receiving emails and want to stop, contact us at fazare@fazare.dev.</p>",
      404,
    )
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const audienceId = Deno.env.get('RESEND_NEWSLETTER_AUDIENCE_ID')
  if (!resendApiKey || !audienceId) {
    console.error('newsletter-confirm: missing RESEND_API_KEY or RESEND_NEWSLETTER_AUDIENCE_ID')
    return htmlResponse('<h1>Something went wrong</h1><p>Please try again in a moment.</p>', 500)
  }

  try {
    const response = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts/${encodeURIComponent(pending.email)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ unsubscribed: true }),
      },
    )
    // A 404 here means the address was never actually added to Resend (or
    // was already removed) -- still a successful outcome from the user's
    // point of view, since either way they're not subscribed.
    if (!response.ok && response.status !== 404) {
      const text = await response.text()
      console.error('newsletter-confirm: Resend unsubscribe error', response.status, text)
      return htmlResponse('<h1>Something went wrong</h1><p>Please try again in a moment.</p>', 502)
    }
  } catch (err) {
    console.error('newsletter-confirm: request to Resend failed', err)
    return htmlResponse('<h1>Something went wrong</h1><p>Please try again in a moment.</p>', 502)
  }

  const { error: deleteError } = await admin.from('newsletter_pending_confirmations').delete().eq('token', token)
  if (deleteError) {
    // Non-fatal -- the unsubscribe itself succeeded; a leftover row just
    // means this same link stays usable (harmlessly, since unsubscribe is
    // idempotent) until someone notices.
    console.error('newsletter-confirm: failed to clean up token row', deleteError)
  }

  return htmlResponse("<h1>You're unsubscribed ✓</h1><p>You won't receive any more emails from the OfferTrail newsletter.</p>")
})
