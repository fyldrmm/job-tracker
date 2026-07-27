// Adds an email to the OfferTrail newsletter's Resend Audience. No auth
// required -- unlike account-action, guests should be able to subscribe.
//
// Deployed via the Supabase dashboard's Edge Functions editor (no CLI link
// set up), same as account-action and extract-job-details. RESEND_API_KEY
// is the Function secret already used by account-action's deletion email;
// RESEND_NEWSLETTER_AUDIENCE_ID is a new one, set once the Audience is
// created in Resend's dashboard.
//
// Resend's Audience contact-create endpoint is single opt-in -- it does not
// send its own confirmation email. Consent is captured client-side (an
// unticked-by-default checkbox in NewsletterModal); unsubscribe is handled
// automatically by Resend on every future Broadcast send.

const FUNCTION_VERSION = 'newsletter-subscribe@2026-07-27.1'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'x-function-version': FUNCTION_VERSION,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Deliberately simple -- catches the obvious "not an email" case without
// pretending to fully validate RFC 5322. Resend's own API is the real
// backstop against a malformed address.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  let email: string | undefined
  try {
    const body = await req.json()
    email = typeof body?.email === 'string' ? body.email.trim() : undefined
  } catch {
    // malformed/empty body -- handled by the check below
  }

  if (!email || !EMAIL_PATTERN.test(email)) {
    return jsonResponse({ error: 'Please enter a valid email address.' }, 400)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const audienceId = Deno.env.get('RESEND_NEWSLETTER_AUDIENCE_ID')
  if (!resendApiKey || !audienceId) {
    console.error('newsletter-subscribe: missing RESEND_API_KEY or RESEND_NEWSLETTER_AUDIENCE_ID')
    return jsonResponse({ error: 'Newsletter signup is not available right now.' }, 500)
  }

  try {
    const response = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    })

    // Resend returns a non-2xx for an email already on the audience --
    // treat that as success too, both because re-subscribing should just
    // work and because the response must not leak whether an address is
    // already on the list.
    if (!response.ok) {
      const text = await response.text()
      if (!/already exists|already a member|duplicate/i.test(text)) {
        console.error('newsletter-subscribe: Resend API error', response.status, text)
        return jsonResponse({ error: 'Something went wrong. Please try again.' }, 502)
      }
    }
  } catch (err) {
    console.error('newsletter-subscribe: request to Resend failed', err)
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 502)
  }

  return jsonResponse({ ok: true })
})
