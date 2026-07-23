import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetIndexedDb } from '../test/dbHelpers'
import {
  putTracker,
  putApplication,
  putInterview,
  addStageHistoryEntry,
  hasAnyLocalGuestData,
} from './localStore'
import { migrateGuestDataToAccount, markPendingSignup, consumePendingSignup } from './migration'
import type { Application, Interview, Tracker } from '../types/application'

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
    is_priority: false,
    is_archived: false,
    archive_reason: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

function makeInterview(applicationId: string, overrides: Partial<Interview> = {}): Interview {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    application_id: applicationId,
    round: 1,
    scheduled_at: '2026-08-04T13:00:00.000Z',
    duration_minutes: 60,
    is_remote: false,
    location: null,
    notes: null,
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

  it('uploads interviews scoped to guest applications, leaving already-owned ones alone', async () => {
    const guestTracker = makeTracker()
    const guestApp = makeApplication(guestTracker.id)
    const guestInterview = makeInterview(guestApp.id, { round: 1 })
    await putTracker(guestTracker)
    await putApplication(guestApp)
    await putInterview(guestInterview)

    // An interview belonging to an application some OTHER already-signed-in
    // account owns -- must not be swept up into this migration just because
    // it happens to share this browser's IndexedDB.
    const otherTracker = makeTracker({ user_id: 'other-user' })
    const otherApp = makeApplication(otherTracker.id, { user_id: 'other-user' })
    await putTracker(otherTracker)
    await putApplication(otherApp)
    await putInterview(makeInterview(otherApp.id, { round: 1 }))

    await migrateGuestDataToAccount('user-1')

    const interviewsCallIndex = upsertCalls.findIndex((c) => c.table === 'interviews')
    expect(interviewsCallIndex).toBeGreaterThanOrEqual(0)
    const uploaded = upsertCalls[interviewsCallIndex].rows as Interview[]
    expect(uploaded.map((i) => i.id)).toEqual([guestInterview.id])
  })

  it('does not upload an interviews row when there are none, but still migrates the rest', async () => {
    const guestTracker = makeTracker()
    const guestApp = makeApplication(guestTracker.id)
    await putTracker(guestTracker)
    await putApplication(guestApp)

    await migrateGuestDataToAccount('user-1')

    expect(upsertCalls.some((c) => c.table === 'interviews')).toBe(false)
    expect(upsertCalls.some((c) => c.table === 'applications')).toBe(true)
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

  describe('markPendingSignup / consumePendingSignup', () => {
    // markPendingSignup stamps the REAL system clock (Date.now()), so any
    // "matching" fixture needs a created_at that's actually fresh relative
    // to whenever the test runs -- a hardcoded past date fails the
    // freshness check for the wrong reason. matchingUser() is a function,
    // not a constant, precisely so each call gets a genuinely current
    // timestamp rather than one fixed at describe-block setup time.
    function matchingUser() {
      return { email: 'ada@example.com', created_at: new Date().toISOString() }
    }

    it('is a one-time flag: true on first consume with a matching user, false after', () => {
      expect(consumePendingSignup(matchingUser())).toBe(false)

      markPendingSignup('ada@example.com')
      expect(consumePendingSignup(matchingUser())).toBe(true)
      expect(consumePendingSignup(matchingUser())).toBe(false)
    })

    it('matches email case-insensitively both ways', () => {
      markPendingSignup('Ada@Example.com')
      expect(consumePendingSignup(matchingUser())).toBe(true)
    })

    it('rejects a different email -- guards against a later login to an unrelated account', () => {
      markPendingSignup('ada@example.com')
      expect(consumePendingSignup({ ...matchingUser(), email: 'someone-else@example.com' })).toBe(false)
    })

    it('rejects when user.email is undefined', () => {
      markPendingSignup('ada@example.com')
      expect(consumePendingSignup({ ...matchingUser(), email: undefined })).toBe(false)
    })

    it('rejects a matching email whose account predates the signup attempt -- the already-registered-email case', () => {
      markPendingSignup('ada@example.com')
      // Simulates Supabase's anti-enumeration success response for an
      // email that already has an account: the email matches, but that
      // account was created long before this "signup" attempt.
      expect(
        consumePendingSignup({ email: 'ada@example.com', created_at: '2020-01-01T00:00:00.000Z' }),
      ).toBe(false)
    })

    it('always clears the flag, even when the consuming check fails', () => {
      markPendingSignup('ada@example.com')
      consumePendingSignup({ ...matchingUser(), email: 'someone-else@example.com' })
      // Second consume finds nothing left, regardless of who asks.
      expect(consumePendingSignup(matchingUser())).toBe(false)
    })

    it('treats a legacy bare "true" value (pre-validation flag) as absent', () => {
      localStorage.setItem('job-tracker:pending-signup', 'true')
      expect(consumePendingSignup(matchingUser())).toBe(false)
      expect(localStorage.getItem('job-tracker:pending-signup')).toBeNull()
    })

    it('returns false with no flag set at all', () => {
      expect(consumePendingSignup(matchingUser())).toBe(false)
    })
  })
})
