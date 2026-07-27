// Minimal Stripe REST client over fetch -- no stripe-node SDK, since its
// HTTP client isn't a reliable fit for the Workers runtime. Stripe's API is
// plain form-encoded POST/GET over HTTPS, so a few fetch wrappers cover
// everything this Worker needs (Checkout, the Customer Portal, subscription
// lookups, and webhook signature verification).

const STRIPE_API = 'https://api.stripe.com/v1'

function formEncode(params: Record<string, unknown>, prefix = ''): string[] {
  const pairs: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    const fullKey = prefix ? `${prefix}[${key}]` : key
    if (typeof value === 'object' && !Array.isArray(value)) {
      pairs.push(...formEncode(value as Record<string, unknown>, fullKey))
    } else {
      pairs.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`)
    }
  }
  return pairs
}

async function stripeRequest(secretKey: string, method: 'GET' | 'POST', path: string, params?: Record<string, unknown>) {
  const body = params ? formEncode(params).join('&') : undefined
  const url = method === 'GET' && body ? `${STRIPE_API}${path}?${body}` : `${STRIPE_API}${path}`
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' ? body : undefined,
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Stripe API error (${response.status}): ${JSON.stringify(data)}`)
  }
  return data
}

export function createCheckoutSession(
  secretKey: string,
  params: {
    priceId: string
    userId: string
    customerEmail: string
    successUrl: string
    cancelUrl: string
  },
) {
  return stripeRequest(secretKey, 'POST', '/checkout/sessions', {
    mode: 'subscription',
    line_items: [{ price: params.priceId, quantity: 1 }],
    customer_email: params.customerEmail,
    // Carried onto the Subscription object Stripe creates, so later
    // customer.subscription.* webhooks can be traced back to the app's
    // user without a second lookup -- see worker/index.ts's webhook handler.
    subscription_data: { metadata: { user_id: params.userId } },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  }) as Promise<{ url: string }>
}

export function createPortalSession(secretKey: string, customerId: string, returnUrl: string) {
  return stripeRequest(secretKey, 'POST', '/billing_portal/sessions', {
    customer: customerId,
    return_url: returnUrl,
  }) as Promise<{ url: string }>
}

export function retrieveSubscription(secretKey: string, subscriptionId: string) {
  return stripeRequest(secretKey, 'GET', `/subscriptions/${subscriptionId}`) as Promise<StripeSubscription>
}

export interface StripeSubscription {
  id: string
  customer: string
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid' | 'paused'
  current_period_end: number
  metadata: { user_id?: string }
  items: { data: Array<{ price: { id: string } }> }
}

// Stripe signs webhook payloads as `t=<timestamp>,v1=<hex hmac>` in the
// Stripe-Signature header. Verifying by hand (Web Crypto's HMAC-SHA256)
// rather than pulling in stripe-node purely for this one function.
export async function verifyStripeSignature(payload: string, signatureHeader: string, webhookSecret: string): Promise<boolean> {
  const parts = Object.fromEntries(signatureHeader.split(',').map((p) => p.split('=') as [string, string]))
  const timestamp = parts.t
  const expectedSignature = parts.v1
  if (!timestamp || !expectedSignature) return false

  // 5-minute tolerance matches Stripe's own recommended default, guards
  // against a captured payload being replayed long after the fact.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (age > 300) return false

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`))
  const computedSignature = [...new Uint8Array(signed)].map((b) => b.toString(16).padStart(2, '0')).join('')

  return timingSafeEqual(computedSignature, expectedSignature)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}
