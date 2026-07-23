import { describe, expect, it } from 'vitest'
import { canScheduleInterviews } from './entitlements'

describe('canScheduleInterviews', () => {
  it('returns true -- interview scheduling ships free until a paid tier exists', () => {
    expect(canScheduleInterviews()).toBe(true)
  })
})
