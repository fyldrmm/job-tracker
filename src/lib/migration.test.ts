import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetIndexedDb } from '../test/dbHelpers'
import { putTracker, putApplication, addStageHistoryEntry, hasAnyLocalGuestData } from './localStore'
import { migrateGuestDataToAccount, markPendingSignup, consumePendingSignup } from './migration'
import type { Application, Tracker } from '../types/application'

interface UpsertCall {
  table: string
  rows: unknown[]
}

const upsertCalls: UpsertCall[] = []
let shouldFail = false

vi.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => ({
      upsert: (rows: unknown[]) => {
        upsertCalls.push({ table, rows })
        return Promise.resolve(shouldFail ? { error: new Error('upsert failed') } : { error: null })
      },
    }),
  },
}))

function makeTracker(overrides: Partial<Tracker> = {}): Tracker {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    user_id: null,
    name: 'Test Tracker',
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

function makeApplication(trackerId: string, overrides: Partial<Application> = {}): Application {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    user_id: null,
    tracker_id: trackerId,
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
    is_archived: false,
    archive_reason: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

describe('migration', () => {
  beforeEach(async () => {
    await resetIndexedDb()
    localStorage.clear()
    upsertCalls.length = 0
    shouldFail = false
  })

  it('only uploads unclaimed guest rows, not already-owned local mirror data, trackers before applications', async () => {
    const guestTracker = makeTracker({ name: 'Guest Tracker' })
    const guestApp = makeApplication(guestTracker.id, { company: 'Guest App' })
    await putTracker(guestTracker)
    await putApplication(guestApp)
    await addStageHistoryEntry({
      id: crypto.randomUUID(),
      application_id: guestApp.id,
      stage: 'applied',
      entered_at: new Date().toISOString(),
    })

    // Leftover mirror data from a different, already-signed-in account --
    // must NOT be re-uploaded as part of this migration.
    const otherTracker = makeTracker({ name: 'Other', user_id: 'other-user' })
    const otherApp = makeApplication(otherTracker.id, { company: 'Other App', user_id: 'other-user' })
    await putTracker(otherTracker)
    await putApplication(otherApp)

    await migrateGuestDataToAccount('user-1')

    const trackerCallIndex = upsertCalls.findIndex((c) => c.table === 'trackers')
    const applicationCallIndex = upsertCalls.findIndex((c) => c.table === 'applications')
    expect(trackerCallIndex).toBeGreaterThanOrEqual(0)
    expect(applicationCallIndex).toBeGreaterThan(trackerCallIndex)

    const uploadedTrackers = upsertCalls[trackerCallIndex].rows as Tracker[]
    const uploadedApplications = upsertCalls[applicationCallIndex].rows as Application[]
    expect(uploadedTrackers.map((t) => t.id)).toEqual([guestTracker.id])
    expect(uploadedTrackers[0].user_id).toBe('user-1')
    expect(uploadedApplications.map((a) => a.id)).toEqual([guestApp.id])
    expect(uploadedApplications[0].user_id).toBe('user-1')
  })

  it('is safe to call twice -- the second call finds nothing left to migrate', async () => {
    const tracker = makeTracker()
    const app = makeApplication(tracker.id)
    await putTracker(tracker)
    await putApplication(app)

    await migrateGuestDataToAccount('user-1')
    const callsAfterFirst = upsertCalls.length
    expect(callsAfterFirst).toBeGreaterThan(0)

    await migrateGuestDataToAccount('user-1')
    expect(upsertCalls.length).toBe(callsAfterFirst)
  })

  it('does not claim local data if the upload fails, so a retry is still possible', async () => {
    shouldFail = true
    await putTracker(makeTracker())

    await expect(migrateGuestDataToAccount('user-1')).rejects.toThrow()
    expect(await hasAnyLocalGuestData()).toBe(true)
  })

  it('markPendingSignup/consumePendingSignup act as a one-time flag', () => {
    expect(consumePendingSignup()).toBe(false)

    markPendingSignup()
    expect(consumePendingSignup()).toBe(true)
    expect(consumePendingSignup()).toBe(false)
  })
})
