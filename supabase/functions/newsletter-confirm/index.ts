// Completes the newsletter double opt-in started by newsletter-subscribe
// (security review 2026-07-28, Finding #6). This is the link inside the
// confirmation email -- opened directly by the browser, not routed through
// the SPA, same shape as how Supabase's own GoTrue auth-confirmation links
// work. Only clicking this link ever adds an address to the Resend
// Audience; the initial subscribe call never does.
//
// Deployed via the Supabase dashboard's Edge Functions editor (no CLI link
// set up), same as the other three functions in this repo.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const FUNCTION_VERSION = 'newsletter-confirm@2026-07-28.1'
const PENDING_EXPIRY_DAYS = 7

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
    return htmlResponse('<h1>Invalid link</h1><p>This confirmation link is missing its token.</p>', 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data: pending, error: fetchError } = await admin
    .from('newsletter_pending_confirmations')
    .select('email, created_at')
    .eq('token', token)
    .maybeSingle()

  if (fetchError) {
    console.error('newsletter-confirm: lookup failed', fetchError)
    return htmlResponse('<h1>Something went wrong</h1><p>Please try again in a moment.</p>', 500)
  }

  if (!pending) {
    return htmlResponse(
      '<h1>Link already used or invalid</h1><p>This confirmation link has already been used, or never existed. If you still want to subscribe, head back to OfferTrail and try again.</p>',
      404,
    )
  }

  const ageMs = Date.now() - new Date(pending.created_at).getTime()
  if (ageMs > PENDING_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
    await admin.from('newsletter_pending_confirmations').delete().eq('token', token)
    return htmlResponse(
      '<h1>Link expired</h1><p>This confirmation link is more than 7 days old. Head back to OfferTrail and subscribe again.</p>',
      410,
    )
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const audienceId = Deno.env.get('RESEND_NEWSLETTER_AUDIENCE_ID')
  if (!resendApiKey || !audienceId) {
    console.error('newsletter-confirm: missing RESEND_API_KEY or RESEND_NEWSLETTER_AUDIENCE_ID')
    return htmlResponse('<h1>Something went wrong</h1><p>Please try again in a moment.</p>', 500)
  }

  try {
    const response = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: pending.email, unsubscribed: false }),
    })
    // Same as the old newsletter-subscribe behavior -- an "already exists"
    // response from Resend is still a successful outcome here.
    if (!response.ok) {
      const text = await response.text()
      if (!/already exists|already a member|duplicate/i.test(text)) {
        console.error('newsletter-confirm: Resend API error', response.status, text)
        return htmlResponse('<h1>Something went wrong</h1><p>Please try again in a moment.</p>', 502)
      }
    }
  } catch (err) {
    console.error('newsletter-confirm: request to Resend failed', err)
    return htmlResponse('<h1>Something went wrong</h1><p>Please try again in a moment.</p>', 502)
  }

  const { error: deleteError } = await admin.from('newsletter_pending_confirmations').delete().eq('token', token)
  if (deleteError) {
    // Non-fatal -- the subscription itself succeeded; a leftover pending
    // row just means this token stays reusable until it expires naturally.
    console.error('newsletter-confirm: failed to clean up pending row', deleteError)
  }

  return htmlResponse("<h1>You're confirmed ✓</h1><p>Thanks for confirming -- we'll email you when v1 launches.</p>")
})
