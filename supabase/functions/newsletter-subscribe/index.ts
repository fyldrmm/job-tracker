// Newsletter subscription -- single opt-in. No auth required -- unlike
// account-action, guests should be able to subscribe.
//
// Deployed via the Supabase dashboard's Edge Functions editor (no CLI link
// set up), same as account-action and extract-job-details. RESEND_API_KEY
// is the Function secret already used by account-action's deletion email.
//
// Security review 2026-07-28, Finding #6 hardened this to rate-limit-by-IP
// + double opt-in (confirm-before-add) after the original single-opt-in
// version let anyone list-bomb third-party addresses. Reverted to single
// opt-in 2026-07-29 at explicit user request (matches how most newsletters
// work: subscribe immediately, unsubscribe link in every email) -- the rate
// limit below is kept as the remaining abuse guard, and the confirm email's
// "click to join" framing (which felt redundant since beta access is
// already granted by this call succeeding, before any click) is gone.
// newsletter_pending_confirmations is repurposed as the unsubscribe-token
// store rather than a migration; see newsletter-confirm, which now handles
// unsubscribe instead of confirm.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const FUNCTION_VERSION = 'newsletter-subscribe@2026-07-29.1'

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

// Shared branded-email shell (mirrors email-templates/base-template.html --
// duplicated per function rather than imported, since these are deployed
// one file at a time via the dashboard editor, not bundled from the repo).
function buildEmailHtml(opts: {
  preheader: string
  headline: string
  bodyHtml: string
  ctaHref: string
  ctaLabel: string
  // 'primary' (green, default) for the main action; 'muted' for a
  // secondary action like unsubscribe that shouldn't visually compete
  // with a real CTA.
  ctaStyle?: 'primary' | 'muted'
  secondaryNoteHtml?: string
}) {
  const isMuted = opts.ctaStyle === 'muted'
  const ctaBg = isMuted ? '#F1F4EE' : '#1fa04e'
  const ctaColor = isMuted ? '#45594C' : '#FFFFFF'
  const ctaBorder = isMuted ? 'border:1px solid #D8E0D9;' : ''
  const secondaryNote = opts.secondaryNoteHtml
    ? `<tr>
        <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:13px; line-height:1.6; color:#8A9A8E; padding:0;">
          ${opts.secondaryNoteHtml}
        </td>
      </tr>`
    : ''
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>OfferTrail</title>
</head>
<body style="margin:0; padding:0; background-color:#F1F4EE; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#F1F4EE;">${opts.preheader}</div>
  <center style="width:100%; background-color:#F1F4EE;">
  <div style="max-width:600px; margin:0 auto;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; border-collapse:collapse;">
      <tr>
        <td align="center" bgcolor="#1c3a27" style="background-color:#1c3a27; background-image:linear-gradient(135deg, #16281D 0%, #1fa04e 100%); padding:32px 24px; border-radius:12px 12px 0 0;">
          <img src="https://offertrail.app/brand/logo-reversed.png" alt="OfferTrail" width="160" style="display:block; width:160px; height:auto; border:0; outline:none; text-decoration:none;">
        </td>
      </tr>
      <tr>
        <td bgcolor="#FFFFFF" style="background-color:#FFFFFF; padding:40px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:22px; line-height:1.35; font-weight:700; color:#16281D; padding:0 0 16px 0;">
                ${opts.headline}
              </td>
            </tr>
            <tr>
              <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:15px; line-height:1.6; color:#45594C; padding:0 0 28px 0;">
                ${opts.bodyHtml}
              </td>
            </tr>
            <tr>
              <td align="left" style="padding:0 0 32px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="${ctaBg}" style="border-radius:8px; background-color:${ctaBg}; ${ctaBorder}">
                      <a href="${opts.ctaHref}" target="_blank" style="display:inline-block; padding:13px 28px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:15px; font-weight:600; color:${ctaColor}; text-decoration:none; border-radius:8px;">
                        ${opts.ctaLabel}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${secondaryNote}
          </table>
        </td>
      </tr>
      <tr>
        <td bgcolor="#F1F4EE" style="background-color:#F1F4EE; padding:28px 32px; border-radius:0 0 12px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding:0 0 12px 0;">
                <img src="https://offertrail.app/brand/icon.png" alt="OfferTrail" width="24" style="display:block; width:24px; height:24px; border:0; outline:none; text-decoration:none; border-radius:6px;">
              </td>
            </tr>
            <tr>
              <td align="center" style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; line-height:1.6; color:#8A9A8E; padding:0 0 6px 0;">
                OfferTrail — track every application, one trail at a time.
              </td>
            </tr>
            <tr>
              <td align="center" style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:12px; line-height:1.8; color:#8A9A8E;">
                <a href="https://offertrail.app/privacy" style="color:#45594C; text-decoration:underline;">Privacy policy</a>
                &nbsp;&middot;&nbsp;
                <a href="https://offertrail.app/terms" style="color:#45594C; text-decoration:underline;">Terms</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  </center>
</body>
</html>`
}

// Adds the address to the Resend Audience immediately -- single opt-in.
// An "already exists" response from Resend counts as success (e.g.
// resubscribing after a prior unsubscribe attempt, or a duplicate signup).
async function addToAudience(email: string, resendApiKey: string, audienceId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    })
    if (!response.ok) {
      const text = await response.text()
      if (!/already exists|already a member|duplicate/i.test(text)) {
        console.error('newsletter-subscribe: Resend add-contact error', response.status, text)
        return false
      }
    }
    return true
  } catch (err) {
    console.error('newsletter-subscribe: request to Resend failed', err)
    return false
  }
}

async function sendSubscribedEmail(email: string, unsubscribeToken: string, functionsBaseUrl: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('DELETE_EMAIL_FROM') ?? 'noreply@fazare.dev'
  if (!resendApiKey) {
    console.error('newsletter-subscribe: missing RESEND_API_KEY')
    return false
  }
  const unsubscribeUrl = `${functionsBaseUrl}/newsletter-confirm?token=${unsubscribeToken}`
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
        subject: "You're subscribed to the OfferTrail newsletter",
        text:
          "You're subscribed to the OfferTrail newsletter -- we'll email you when v1 launches and " +
          `for other important updates.\n\nDon't want these emails? Unsubscribe: ${unsubscribeUrl}`,
        html: buildEmailHtml({
          preheader: "You're subscribed to the OfferTrail newsletter.",
          headline: "You're subscribed",
          bodyHtml:
            "You're on the OfferTrail newsletter — we'll email you when v1 launches and for other " +
            "important updates. No spam, unsubscribe any time.",
          ctaHref: unsubscribeUrl,
          ctaLabel: 'Unsubscribe',
          ctaStyle: 'muted',
        }),
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

  // The row's token now serves as this address's unsubscribe token, not a
  // confirm-before-add token -- see the header comment.
  const { data: pending, error: insertError } = await admin
    .from('newsletter_pending_confirmations')
    .insert({ email })
    .select('token')
    .single()
  if (insertError || !pending) {
    console.error('newsletter-subscribe: failed to insert pending confirmation', insertError)
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 500)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const audienceId = Deno.env.get('RESEND_NEWSLETTER_AUDIENCE_ID')
  if (!resendApiKey || !audienceId) {
    console.error('newsletter-subscribe: missing RESEND_API_KEY or RESEND_NEWSLETTER_AUDIENCE_ID')
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 500)
  }

  // Unlike the old double-opt-in flow, adding to Resend is no longer
  // best-effort -- it's the actual subscription, so a failure here must be
  // surfaced (not silently swallowed the way the confirmation-email send
  // below still is).
  const added = await addToAudience(email, resendApiKey, audienceId)
  if (!added) {
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 502)
  }

  // Best-effort: the notice email is a courtesy, not the subscription
  // itself, so a Resend hiccup here shouldn't fail a request that already
  // succeeded.
  await sendSubscribedEmail(email, pending.token, `${supabaseUrl}/functions/v1`)

  return jsonResponse({ ok: true })
})
