import { describe, expect, it, vi } from 'vitest'
import { canScheduleInterviews } from './entitlements'

describe('canScheduleInterviews', () => {
  it('returns true -- interview tracking and its calendar export are free forever', () => {
    expect(canScheduleInterviews()).toBe(true)
  })
})

describe('isPro', () => {
  async function isProWith(row: unknown, error: unknown = null) {
    vi.resetModules()
    vi.doMock('./supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: row, error }),
          }),
        }),
      },
    }))
    const { isPro } = await import('./entitlements')
    return isPro()
  }

  it('is false when there is no subscription row', async () => {
    expect(await isProWith(null)).toBe(false)
  })

  it('is false on a query error, even if a row would otherwise qualify', async () => {
    expect(await isProWith({ is_comp_account: true, status: 'active', current_period_end: null }, new Error('boom'))).toBe(false)
  })

  it('is true for a comp account regardless of status/period_end', async () => {
    expect(await isProWith({ is_comp_account: true, status: 'none', current_period_end: null })).toBe(true)
  })

  it('is true for an active subscription with a future period end', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    expect(await isProWith({ is_comp_account: false, status: 'active', current_period_end: future })).toBe(true)
  })

  it('is false for an active status whose period has already lapsed', async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString()
    expect(await isProWith({ is_comp_account: false, status: 'active', current_period_end: past })).toBe(false)
  })

  it('is false for a canceled subscription', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    expect(await isProWith({ is_comp_account: false, status: 'canceled', current_period_end: future })).toBe(false)
  })
})

describe('getSubscriptionSummary', () => {
  async function summaryWith(row: unknown, error: unknown = null) {
    vi.resetModules()
    vi.doMock('./supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: row, error }),
          }),
        }),
      },
    }))
    const { getSubscriptionSummary } = await import('./entitlements')
    return getSubscriptionSummary()
  }

  it('returns the FREE_SUBSCRIPTION shape when there is no row', async () => {
    expect(await summaryWith(null)).toEqual({
      isPro: false,
      isCompAccount: false,
      plan: 'none',
      currency: 'none',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    })
  })

  it('passes through plan/currency/period-end for an active Pro subscriber', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    const summary = await summaryWith({
      is_comp_account: false,
      status: 'active',
      plan: 'quarterly',
      currency: 'eur',
      current_period_end: future,
      cancel_at_period_end: false,
    })
    expect(summary).toEqual({
      isPro: true,
      isCompAccount: false,
      plan: 'quarterly',
      currency: 'eur',
      currentPeriodEnd: future,
      cancelAtPeriodEnd: false,
    })
  })

  it('reports isCompAccount separately from isPro so the UI can show "Unlimited (team account)"', async () => {
    const summary = await summaryWith({
      is_comp_account: true,
      status: 'none',
      plan: 'none',
      currency: 'none',
      current_period_end: null,
      cancel_at_period_end: false,
    })
    expect(summary.isPro).toBe(true)
    expect(summary.isCompAccount).toBe(true)
  })

  it('passes through cancel_at_period_end so the UI can distinguish "will cancel" from "renews normally"', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    const summary = await summaryWith({
      is_comp_account: false,
      status: 'active',
      plan: 'monthly',
      currency: 'usd',
      current_period_end: future,
      cancel_at_period_end: true,
    })
    expect(summary.isPro).toBe(true)
    expect(summary.cancelAtPeriodEnd).toBe(true)
  })
})
