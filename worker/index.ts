// Cloudflare Worker in front of the SPA (monetization-mvp-brief.md §4).
// Added specifically to read `request.cf.country` at the edge -- this repo's
// Cloudflare deployment was static-assets-only before this, with no server
// code on Cloudflare at all. Handles three things: currency detection for
// the pricing page, Stripe Checkout/Portal session creation, and the Stripe
// webhook that keeps `subscriptions` in sync. Everything else falls through
// to the static asset handler unchanged.
import { currencyForCountry } from './euroCurrencyCountries'
import { createCheckoutSession, createPortalSession, retrieveSubscription, verifyStripeSignature, type StripeSubscription } from './stripe'
import { findUserIdByStripeCustomerId, getUserFromAccessToken, upsertSubscription } from './supabase'

interface Env {
  ASSETS: { fetch: typeof fetch }
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  PUBLIC_APP_URL: string
  STRIPE_PRICE_MONTHLY_EUR: string
  STRIPE_PRICE_MONTHLY_USD: string
  STRIPE_PRICE_QUARTERLY_EUR: string
  STRIPE_PRICE_QUARTERLY_USD: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

function priceIdFor(env: Env, plan: 'monthly' | 'quarterly', currency: 'eur' | 'usd'): string {
  if (plan === 'monthly') return currency === 'eur' ? env.STRIPE_PRICE_MONTHLY_EUR : env.STRIPE_PRICE_MONTHLY_USD
  return currency === 'eur' ? env.STRIPE_PRICE_QUARTERLY_EUR : env.STRIPE_PRICE_QUARTERLY_USD
}

// Reverses priceIdFor() for webhook events, which carry a Stripe Price ID
// on the subscription's line item, not the plan/currency pair the app
// itself thinks in.
function planAndCurrencyForPriceId(env: Env, priceId: string): { plan: 'monthly' | 'quarterly' | 'none'; currency: 'eur' | 'usd' | 'none' } {
  const table: Array<[string, 'monthly' | 'quarterly', 'eur' | 'usd']> = [
    [env.STRIPE_PRICE_MONTHLY_EUR, 'monthly', 'eur'],
    [env.STRIPE_PRICE_MONTHLY_USD, 'monthly', 'usd'],
    [env.STRIPE_PRICE_QUARTERLY_EUR, 'quarterly', 'eur'],
    [env.STRIPE_PRICE_QUARTERLY_USD, 'quarterly', 'usd'],
  ]
  const match = table.find(([id]) => id === priceId)
  return match ? { plan: match[1], currency: match[2] } : { plan: 'none', currency: 'none' }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

async function requireUser(request: Request, env: Env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return getUserFromAccessToken(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, authHeader.slice('Bearer '.length))
}

async function handleCurrency(request: Request): Promise<Response> {
  const country = request.headers.get('CF-IPCountry')
  return json({ currency: currencyForCountry(country) })
}

async function handleCreateCheckoutSession(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env)
  if (!user) return json({ error: 'Not signed in' }, 401)

  const { plan } = (await request.json()) as { plan?: 'monthly' | 'quarterly' }
  if (plan !== 'monthly' && plan !== 'quarterly') return json({ error: 'plan must be "monthly" or "quarterly"' }, 400)

  const currency = currencyForCountry(request.headers.get('CF-IPCountry'))
  const priceId = priceIdFor(env, plan, currency)

  const session = await createCheckoutSession(env.STRIPE_SECRET_KEY, {
    priceId,
    userId: user.id,
    customerEmail: user.email,
    // Must be a path the SPA actually serves. This app has no router --
    // Board.tsx maps pathnames to a `view` by hand and only recognizes
    // '/privacy' and '/' -- so anything else lands on the asset handler's
    // SPA fallback and silently renders the board with the query string
    // ignored. '/' is handled, and Board reads ?checkout= on mount.
    successUrl: `${env.PUBLIC_APP_URL}/?checkout=success`,
    cancelUrl: `${env.PUBLIC_APP_URL}/?checkout=canceled`,
  })
  return json({ url: session.url })
}

async function handleCreatePortalSession(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env)
  if (!user) return json({ error: 'Not signed in' }, 401)

  const lookup = await fetch(`${env.SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${user.id}&select=stripe_customer_id`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY },
  })
  const rows = (await lookup.json()) as Array<{ stripe_customer_id: string | null }>
  const customerId = rows[0]?.stripe_customer_id
  if (!customerId) return json({ error: 'No billing account on file' }, 404)

  // '/' for the same reason as the Checkout URLs above -- '/account' is not
  // a route this SPA serves.
  const portalSession = await createPortalSession(env.STRIPE_SECRET_KEY, customerId, `${env.PUBLIC_APP_URL}/`)
  return json({ url: portalSession.url })
}

async function syncSubscriptionRow(env: Env, subscription: StripeSubscription, userId: string): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id
  const { plan, currency } = priceId ? planAndCurrencyForPriceId(env, priceId) : { plan: 'none' as const, currency: 'none' as const }

  await upsertSubscription(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    user_id: userId,
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    // Stripe has more granular statuses (trialing, incomplete, ...) than the
    // app's four-value enum; anything not active/canceled/past_due is
    // treated as 'none' rather than widening the app's own status model.
    status: subscription.status === 'active' || subscription.status === 'canceled' || subscription.status === 'past_due' ? subscription.status : 'none',
    plan,
    currency,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  })
}

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get('Stripe-Signature')
  const payload = await request.text()
  if (!signature || !(await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET))) {
    return json({ error: 'Invalid signature' }, 400)
  }

  const event = JSON.parse(payload) as { type: string; data: { object: Record<string, unknown> } }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { subscription: string; metadata?: { user_id?: string } }
    const subscription = await retrieveSubscription(env.STRIPE_SECRET_KEY, session.subscription)
    const userId = subscription.metadata.user_id
    if (userId) await syncSubscriptionRow(env, subscription, userId)
  } else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as unknown as StripeSubscription
    const userId = subscription.metadata.user_id ?? (await findUserIdByStripeCustomerId(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, subscription.customer))
    if (userId) await syncSubscriptionRow(env, subscription, userId)
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as unknown as StripeSubscription
    const userId = subscription.metadata.user_id ?? (await findUserIdByStripeCustomerId(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, subscription.customer))
    if (userId) {
      await upsertSubscription(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        user_id: userId,
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        status: 'canceled',
        plan: 'none',
        currency: 'none',
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
    }
  }

  return json({ received: true })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/currency' && request.method === 'GET') return handleCurrency(request)
    if (url.pathname === '/api/create-checkout-session' && request.method === 'POST') return handleCreateCheckoutSession(request, env)
    if (url.pathname === '/api/create-portal-session' && request.method === 'POST') return handleCreatePortalSession(request, env)
    if (url.pathname === '/api/stripe-webhook' && request.method === 'POST') return handleStripeWebhook(request, env)

    return env.ASSETS.fetch(request)
  },
}
