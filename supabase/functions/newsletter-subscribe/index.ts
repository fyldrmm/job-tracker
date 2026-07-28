// Starts a double-opt-in newsletter subscription. No auth required --
// unlike account-action, guests should be able to subscribe.
//
// Deployed via the Supabase dashboard's Edge Functions editor (no CLI link
// set up), same as account-action and extract-job-details. RESEND_API_KEY
// is the Function secret already used by account-action's deletion email;
// RESEND_NEWSLETTER_AUDIENCE_ID is used by newsletter-confirm, not here.
//
// Security review 2026-07-28, Finding #6: this used to add straight to the
// Resend Audience on every call -- unauthenticated, unrate-limited, no
// confirmation step, so anyone could list-bomb third-party addresses or run
// up the Resend bill. Now: rate-limit by IP, then insert a pending row and
// email a confirmation link -- the address only reaches Resend once that
// link is clicked (see newsletter-confirm). Deliberately NOT wired to beta
// access: this function's success response is all LandingPage.tsx's
// onSubscribed/submitted UX depends on, so the beta funnel is unaffected by
// whether the email ever gets confirmed.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const FUNCTION_VERSION = 'newsletter-subscribe@2026-07-28.1'

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
// pretending to fully validate RFC 5322. Resend's own API (via
// newsletter-confirm) is the real backstop against a malformed address.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const RATE_LIMIT_PER_WINDOW = 5
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60

async function hashIp(ip: string): Promise<string> {
  // Not a secret-keyed HMAC -- this is a bucketing key for rate limiting,
  // not a security boundary, so a plain hash is enough. The point is to
  // avoid storing a raw IP at rest, not to make the hash unguessable.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sendConfirmationEmail(email: string, token: string, functionsBaseUrl: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('DELETE_EMAIL_FROM') ?? 'noreply@fazare.dev'
  if (!resendApiKey) {
    console.error('newsletter-subscribe: missing RESEND_API_KEY')
    return false
  }
  const confirmUrl = `${functionsBaseUrl}/newsletter-confirm?token=${token}`
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: 'Confirm your OfferTrail beta signup',
        text:
          'Almost there -- click the link below to confirm your email and join the OfferTrail ' +
          `waitlist:\n\n${confirmUrl}\n\nIf you didn't request this, you can ignore this email.`,
      }),
    })
    if (!response.ok) {
      console.error('newsletter-subscribe: Resend send failed', response.status, await response.text())
      return false
    }
    return true
  } catch (err) {
    console.error('newsletter-subscribe: request to Resend failed', err)
    return false
  }
}

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, supabaseServiceRoleKey)

  const forwardedFor = req.headers.get('x-forwarded-for') ?? 'unknown'
  const ip = forwardedFor.split(',')[0].trim()
  const ipHash = await hashIp(ip)

  const { data: allowed, error: rateLimitError } = await admin.rpc('check_newsletter_rate_limit', {
    p_ip_hash: ipHash,
    p_limit: RATE_LIMIT_PER_WINDOW,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
  })
  if (rateLimitError) {
    console.error('newsletter-subscribe: rate limit check failed', rateLimitError)
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 500)
  }
  if (!allowed) {
    return jsonResponse({ error: 'Too many attempts. Please try again later.' }, 429)
  }

  const { data: pending, error: insertError } = await admin
    .from('newsletter_pending_confirmations')
    .insert({ email })
    .select('token')
    .single()
  if (insertError || !pending) {
    console.error('newsletter-subscribe: failed to insert pending confirmation', insertError)
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 500)
  }

  // Best-effort: this response must not leak whether the send succeeded
  // (matches the enumeration-resistance discipline elsewhere in this
  // function) and a Resend hiccup shouldn't block the beta-access grant,
  // which only depends on this response being {ok:true}.
  await sendConfirmationEmail(email, pending.token, `${supabaseUrl}/functions/v1`)

  return jsonResponse({ ok: true })
})
