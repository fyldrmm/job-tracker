import { afterEach, describe, expect, it } from 'vitest'
import { resetIndexedDb } from '../test/dbHelpers'
import { putApplication, putInterview, putTracker } from './localStore'
import { buildExportData } from './export'
import type { Application, Interview, Tracker } from '../types/application'

afterEach(async () => {
  await resetIndexedDb()
})

function makeTracker(overrides: Partial<Tracker> = {}): Tracker {
  const now = new Date().toISOString()
  return { id: 't1', user_id: null, name: 'My Applications', created_at: now, updated_at: now, ...overrides }
}

function makeApplication(overrides: Partial<Application> = {}): Application {
  const now = new Date().toISOString()
  return {
    id: 'app-1',
    user_id: null,
    tracker_id: 't1',
    company: 'Acme',
    role_title: 'Engineer',
    job_link: null,
    date_applied: '2026-01-01',
    current_stage: 'interview',
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

function makeInterview(overrides: Partial<Interview> & { id: string }): Interview {
  const now = new Date().toISOString()
  return {
    application_id: 'app-1',
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

describe('buildExportData (guest)', () => {
  it('includes interviews alongside trackers/applications/stage_history', async () => {
    await putTracker(makeTracker())
    await putApplication(makeApplication())
    await putInterview(makeInterview({ id: 'i1', round: 1, scheduled_at: '2026-08-10T09:00:00.000Z' }))
    await putInterview(makeInterview({ id: 'i2', round: 2, scheduled_at: '2026-08-01T09:00:00.000Z' }))

    const data = await buildExportData(null)

    expect(data.interviews).toHaveLength(2)
    // Same ordering rule as the remote path (getAllRemoteInterviews orders
    // by scheduled_at) -- otherwise a guest export and a signed-in export
    // of the same data would disagree (AUDIT.md M3's reasoning, applied to
    // the new table).
    expect(data.interviews.map((i) => i.id)).toEqual(['i2', 'i1'])
  })

  it('returns an empty interviews array when there are none, not undefined', async () => {
    await putTracker(makeTracker())
    await putApplication(makeApplication())

    const data = await buildExportData(null)
    expect(data.interviews).toEqual([])
  })
})
