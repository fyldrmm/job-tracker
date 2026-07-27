import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useEntitlement } from './useEntitlement'

describe('useEntitlement', () => {
  it('is free without a network call when there is no user (guest)', async () => {
    const { result } = renderHook(() => useEntitlement(null))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isPro).toBe(false)
    expect(result.current.plan).toBe('none')
  })

  it('reflects a Pro subscription for a signed-in user', async () => {
    vi.resetModules()
    const future = new Date(Date.now() + 86_400_000).toISOString()
    vi.doMock('../lib/supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { is_comp_account: false, status: 'active', plan: 'quarterly', currency: 'eur', current_period_end: future },
                error: null,
              }),
          }),
        }),
      },
    }))
    const { useEntitlement: freshUseEntitlement } = await import('./useEntitlement')
    const { result } = renderHook(() => freshUseEntitlement('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isPro).toBe(true)
    expect(result.current.plan).toBe('quarterly')
    expect(result.current.currency).toBe('eur')
  })
})
