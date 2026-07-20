import { describe, expect, it } from 'vitest'
import { checkQuota } from './quota'

const limits = { perUserMonthlyLimit: 20, globalMonthlyLimit: 5000 }

describe('checkQuota', () => {
  it('allows when both counts are under their limits', () => {
    expect(checkQuota(0, 0, limits)).toEqual({ allowed: true })
    expect(checkQuota(19, 4999, limits)).toEqual({ allowed: true })
  })

  it('rejects with reason "per-user" once the per-user limit is reached, even if global is fine', () => {
    expect(checkQuota(20, 0, limits)).toEqual({ allowed: false, reason: 'per-user' })
    expect(checkQuota(25, 0, limits)).toEqual({ allowed: false, reason: 'per-user' })
  })

  it('rejects with reason "global" once the global limit is reached, even if the user is under their own', () => {
    expect(checkQuota(0, 5000, limits)).toEqual({ allowed: false, reason: 'global' })
  })

  it('checks the per-user limit before the global limit', () => {
    // Both are simultaneously at/over their limits -- per-user should win
    // since it's the more specific, cheaper-to-explain reason.
    expect(checkQuota(20, 5000, limits)).toEqual({ allowed: false, reason: 'per-user' })
  })
})
