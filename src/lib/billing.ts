import { supabase } from './supabase'

// Talks to the Cloudflare Worker's /api/* routes (worker/index.ts), NOT a
// Supabase Edge Function -- same origin as the app itself, plain fetch
// rather than supabase.functions.invoke. Under `npm run dev` (Vite on
// :5173) these routes don't exist -- Vite serves the SPA directly, with no
// Worker in front of it -- so every call here has to degrade gracefully
// rather than break local development.

export async function getCurrency(): Promise<'usd' | 'eur'> {
  try {
    const response = await fetch('/api/currency')
    if (!response.ok) return 'usd'
    const data = (await response.json()) as { currency?: 'usd' | 'eur' }
    return data.currency === 'eur' ? 'eur' : 'usd'
  } catch {
    // Local dev (no Worker) or a network hiccup -- USD is the same fallback
    // the Worker itself uses for an unresolvable country (monetization-mvp-
    // brief.md §4), so this stays consistent with the real behavior rather
    // than inventing a third state.
    return 'usd'
  }
}

async function authorizedJsonPost(path: string, body?: unknown): Promise<{ url?: string; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('You need to be signed in to do that.')

  const response = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return response.ok ? response.json() : Promise.reject(await responseError(response))
}

async function responseError(response: Response): Promise<Error> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null
  return new Error(data?.error ?? 'Something went wrong. Please try again.')
}

export async function createCheckoutSession(plan: 'monthly' | 'quarterly'): Promise<string> {
  const data = await authorizedJsonPost('/api/create-checkout-session', { plan })
  if (!data.url) throw new Error('Could not start checkout. Please try again.')
  return data.url
}

export async function createPortalSession(): Promise<string> {
  const data = await authorizedJsonPost('/api/create-portal-session')
  if (!data.url) throw new Error('Could not open billing management. Please try again.')
  return data.url
}
