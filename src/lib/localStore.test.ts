import { beforeEach, describe, expect, it } from 'vitest'
import { resetIndexedDb } from '../test/dbHelpers'
import {
  putTracker,
  putApplication,
  addStageHistoryEntry,
  deleteTracker,
  getAllTrackers,
  getAllApplications,
  getAllStageHistory,
  hasAnyLocalGuestData,
  claimLocalGuestDataForUser,
  backfillDefaultTracker,
} from './localStore'
import type { Application, Tracker, StageHistoryEntry } from '../types/application'

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

function makeStageHistoryEntry(applicationId: string, overrides: Partial<StageHistoryEntry> = {}): StageHistoryEntry {
  return {
    id: crypto.randomUUID(),
    application_id: applicationId,
    stage: 'applied',
    entered_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('localStore', () => {
  beforeEach(async () => {
    await resetIndexedDb()
  })

  it('deleteTracker cascades to its applications and their stage_history, leaving other trackers alone', async () => {
    const trackerA = makeTracker({ name: 'Tracker A' })
    const trackerB = makeTracker({ name: 'Tracker B' })
    const appA1 = makeApplication(trackerA.id, { company: 'A1' })
    const appB1 = makeApplication(trackerB.id, { company: 'B1' })
    const historyA1 = makeStageHistoryEntry(appA1.id)
    const historyB1 = makeStageHistoryEntry(appB1.id)

    await putTracker(trackerA)
    await putTracker(trackerB)
    await putApplication(appA1)
    await putApplication(appB1)
    await addStageHistoryEntry(historyA1)
    await addStageHistoryEntry(historyB1)

    await deleteTracker(trackerA.id)

    const trackers = await getAllTrackers()
    const applications = await getAllApplications()
    const history = await getAllStageHistory()

    expect(trackers.map((t) => t.id)).toEqual([trackerB.id])
    expect(applications.map((a) => a.id)).toEqual([appB1.id])
    expect(history.map((h) => h.id)).toEqual([historyB1.id])
  })

  it('hasAnyLocalGuestData detects unclaimed rows and claimLocalGuestDataForUser stamps them', async () => {
    expect(await hasAnyLocalGuestData()).toBe(false)

    const guestTracker = makeTracker()
    const guestApp = makeApplication(guestTracker.id)
    await putTracker(guestTracker)
    await putApplication(guestApp)

    expect(await hasAnyLocalGuestData()).toBe(true)

    await claimLocalGuestDataForUser('user-1')

    expect(await hasAnyLocalGuestData()).toBe(false)
    const [claimedTracker] = await getAllTrackers()
    const [claimedApp] = await getAllApplications()
    expect(claimedTracker.user_id).toBe('user-1')
    expect(claimedApp.user_id).toBe('user-1')
  })

  it('backfillDefaultTracker only creates a tracker when orphaned applications exist', async () => {
    await backfillDefaultTracker()
    expect(await getAllTrackers()).toEqual([])

    const orphan = makeApplication('', { company: 'Orphaned' })
    await putApplication(orphan)

    await backfillDefaultTracker()

    const trackers = await getAllTrackers()
    expect(trackers).toHaveLength(1)
    expect(trackers[0].name).toBe('My Applications')

    const [backfilled] = await getAllApplications()
    expect(backfilled.tracker_id).toBe(trackers[0].id)
  })
})
