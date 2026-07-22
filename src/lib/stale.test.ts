import { describe, expect, it } from 'vitest'
import { isStale, STALE_THRESHOLD_DAYS } from './stale'
import type { Application } from '../types/application'

function makeApplication(updatedAt: string): Application {
  return {
    id: 'a',
    user_id: null,
    tracker_id: 't',
    company: 'Acme',
    role_title: 'Engineer',
    job_link: null,
    date_applied: '2026-01-01',
    current_stage: 'applied',
    salary_range: null,
    location: null,
    employment_type: null,
    work_mode: null,
    notes: null,
    is_priority: false,
    is_archived: false,
    archive_reason: null,
    archived_at: null,
    created_at: updatedAt,
    updated_at: updatedAt,
  }
}

describe('isStale', () => {
  it('is false for a recently-updated application', () => {
    expect(isStale(makeApplication(new Date().toISOString()))).toBe(false)
  })

  it(`is true once updated_at is more than ${STALE_THRESHOLD_DAYS} days old`, () => {
    const old = new Date(Date.now() - (STALE_THRESHOLD_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString()
    expect(isStale(makeApplication(old))).toBe(true)
  })
})
