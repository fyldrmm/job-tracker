// Minimal Supabase REST access for the Worker -- no supabase-js here, since
// the Worker only ever does two things: confirm who the caller is, and
// upsert/update one row in `subscriptions` via the service-role key. Plain
// fetch against Supabase's Auth and PostgREST endpoints covers both without
// pulling in the SDK's realtime/storage code the Worker never touches.

export interface SupabaseUser {
  id: string
  email: string
}

// Confirms the bearer token the frontend sent is a real, current session --
// never trust a client-supplied user id. Mirrors what every Supabase Edge
// Function in this repo already does implicitly via the platform-injected
// auth context; the Worker has to do it explicitly since it's not running
// on Supabase's own platform.
export async function getUserFromAccessToken(supabaseUrl: string, anonKey: string, accessToken: string): Promise<SupabaseUser | null> {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
  })
  if (!response.ok) return null
  const data = (await response.json()) as { id: string; email: string }
  return { id: data.id, email: data.email }
}

interface SubscriptionRow {
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  status: 'active' | 'canceled' | 'past_due' | 'none'
  plan: 'monthly' | 'quarterly' | 'none'
  currency: 'usd' | 'eur' | 'none'
  current_period_end: string
}

// service-role key bypasses RLS -- this is the only writer to `subscriptions`
// other than the Supabase SQL editor (comp accounts), per
// monetization-mvp-brief.md §5/§7.
export async function upsertSubscription(supabaseUrl: string, serviceRoleKey: string, row: SubscriptionRow): Promise<void> {
  const response = await fetch(`${supabaseUrl}/rest/v1/subscriptions?on_conflict=user_id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(row),
  })
  if (!response.ok) {
    throw new Error(`Supabase upsert failed (${response.status}): ${await response.text()}`)
  }
}

export async function findUserIdByStripeCustomerId(supabaseUrl: string, serviceRoleKey: string, stripeCustomerId: string): Promise<string | null> {
  const response = await fetch(`${supabaseUrl}/rest/v1/subscriptions?stripe_customer_id=eq.${stripeCustomerId}&select=user_id`, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  })
  if (!response.ok) return null
  const rows = (await response.json()) as Array<{ user_id: string }>
  return rows[0]?.user_id ?? null
}
