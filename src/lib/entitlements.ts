import { supabase } from './supabase'

// The seam interview scheduling was built behind (PLAN.md M13, decision
// 2026-07-23): the feature shipped free rather than waiting on a paid tier
// that doesn't exist yet, on the condition that gating it later is a
// one-line change here, not a hunt through every call site that schedules
// a new round. Only NEW scheduling is gated -- viewing, editing or deleting
// an already-scheduled round is never blocked by this, since revoking
// access to data a user already entered would be a much bigger UX call than
// this stub is meant to make.
//
// Decided 2026-07-26, when the paid tier finally arrived: this stays
// `return true` permanently. Interview tracking, including its .ics/
// calendar export, is free forever -- never wired to isPro() below.
export function canScheduleInterviews(): boolean {
  return true
}

export interface SubscriptionSummary {
  isPro: boolean
  isCompAccount: boolean
  plan: 'monthly' | 'quarterly' | 'none'
  currency: 'usd' | 'eur' | 'none'
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

// No subscription row (guest, or a signed-in user who's never subscribed)
// is exactly the free tier -- same shape either way, so callers don't need
// a separate null/undefined branch.
export const FREE_SUBSCRIPTION: SubscriptionSummary = {
  isPro: false,
  isCompAccount: false,
  plan: 'none',
  currency: 'none',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
}

// The real entitlement check (monetization-mvp-brief.md §5), used by the
// extraction quota RPC, the XLSX/CSV export gate, and account settings'
// plan display. RLS on `subscriptions` already restricts a `select` to the
// caller's own row, so no explicit user_id filter is needed here.
export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('is_comp_account, status, plan, currency, current_period_end, cancel_at_period_end')
    .maybeSingle()

  if (error || !data) return FREE_SUBSCRIPTION

  const isActiveAndCurrent =
    data.status === 'active' && data.current_period_end !== null && new Date(data.current_period_end) > new Date()

  return {
    isPro: data.is_comp_account || isActiveAndCurrent,
    isCompAccount: data.is_comp_account,
    plan: data.plan,
    currency: data.currency,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  }
}

export async function isPro(): Promise<boolean> {
  return (await getSubscriptionSummary()).isPro
}
