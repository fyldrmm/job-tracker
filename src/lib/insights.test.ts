import { describe, expect, it } from 'vitest'
import {
  computeApplicationsOverTime,
  computeFunnel,
  computeKpis,
  computeOutcomes,
  computeResponseRateBySegment,
  computeStageTiming,
  computeTrackerComparison,
  filterApplicationsForScope,
} from './insights'
import type { Application, StageHistoryEntry, Tracker } from '../types/application'

function makeApplication(overrides: Partial<Application>): Application {
  return {
    id: overrides.id ?? 'a',
    user_id: null,
    tracker_id: 't1',
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
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeHistoryEntry(overrides: Partial<StageHistoryEntry>): StageHistoryEntry {
  return {
    id: overrides.id ?? 'h1',
    application_id: overrides.application_id ?? 'a',
    stage: overrides.stage ?? 'interview',
    entered_at: overrides.entered_at ?? '2026-01-05T00:00:00.000Z',
  }
}

describe('filterApplicationsForScope', () => {
  const apps = [makeApplication({ id: 'a', tracker_id: 't1' }), makeApplication({ id: 'b', tracker_id: 't2' })]

  it('returns everything for global scope', () => {
    expect(filterApplicationsForScope(apps, 'global')).toHaveLength(2)
  })

  it('filters to one tracker for a tracker scope', () => {
    expect(filterApplicationsForScope(apps, 't1').map((a) => a.id)).toEqual(['a'])
  })
})

describe('computeFunnel', () => {
  it('counts an app toward every stage it ever reached, not just its current one', () => {
    // Reached interview, then dragged back to applied -- should still count
    // toward the interview funnel step.
    const apps = [makeApplication({ id: 'a', current_stage: 'applied' })]
    const history = [makeHistoryEntry({ application_id: 'a', stage: 'interview', entered_at: '2026-01-03' })]
    const funnel = computeFunnel(apps, history)
    expect(funnel.find((f) => f.stage === 'eyes_on')?.count).toBe(1)
    expect(funnel.find((f) => f.stage === 'applied')?.count).toBe(1)
    expect(funnel.find((f) => f.stage === 'interview')?.count).toBe(1)
    expect(funnel.find((f) => f.stage === 'offer')?.count).toBe(0)
  })

  it('counts an app with no stage_history using only current_stage', () => {
    const apps = [makeApplication({ id: 'a', current_stage: 'offer' })]
    const funnel = computeFunnel(apps, [])
    expect(funnel.map((f) => f.count)).toEqual([1, 1, 1, 1])
  })

  it('is monotonically non-increasing left to right', () => {
    const apps = [
      makeApplication({ id: 'a', current_stage: 'eyes_on' }),
      makeApplication({ id: 'b', current_stage: 'applied' }),
      makeApplication({ id: 'c', current_stage: 'offer' }),
    ]
    const counts = computeFunnel(apps, []).map((f) => f.count)
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
    }
  })

  it('does not credit a stage that was reached and reversed within seconds (a drag-through-every-column test)', () => {
    // Created into eyes_on, dragged all the way to offer, then immediately
    // back down to applied -- all inside a few seconds. Nothing above
    // "applied" (where it settled) was held long enough to trust.
    const apps = [makeApplication({ id: 'a', current_stage: 'applied', created_at: '2026-01-01T00:00:00.000Z' })]
    const history = [
      makeHistoryEntry({ id: 'h0', application_id: 'a', stage: 'eyes_on', entered_at: '2026-01-01T00:00:00.000Z' }),
      makeHistoryEntry({ id: 'h1', application_id: 'a', stage: 'applied', entered_at: '2026-01-01T00:00:02.000Z' }),
      makeHistoryEntry({ id: 'h2', application_id: 'a', stage: 'interview', entered_at: '2026-01-01T00:00:04.000Z' }),
      makeHistoryEntry({ id: 'h3', application_id: 'a', stage: 'offer', entered_at: '2026-01-01T00:00:06.000Z' }),
      makeHistoryEntry({ id: 'h4', application_id: 'a', stage: 'applied', entered_at: '2026-01-01T00:00:08.000Z' }),
    ]
    const funnel = computeFunnel(apps, history)
    expect(funnel.find((f) => f.stage === 'eyes_on')?.count).toBe(1)
    expect(funnel.find((f) => f.stage === 'applied')?.count).toBe(1)
    expect(funnel.find((f) => f.stage === 'interview')?.count).toBe(0)
    expect(funnel.find((f) => f.stage === 'offer')?.count).toBe(0)
  })

  it('still credits a stage that was held for a real interval before being reversed', () => {
    // Reached interview, stayed there for two weeks (a real rejection playing
    // out), then got dragged back to applied -- this is the genuine
    // regression case and should still count.
    const apps = [makeApplication({ id: 'a', current_stage: 'applied', created_at: '2026-01-01T00:00:00.000Z' })]
    const history = [
      makeHistoryEntry({ id: 'h0', application_id: 'a', stage: 'interview', entered_at: '2026-01-02T00:00:00.000Z' }),
      makeHistoryEntry({ id: 'h1', application_id: 'a', stage: 'applied', entered_at: '2026-01-16T00:00:00.000Z' }),
    ]
    const funnel = computeFunnel(apps, history)
    expect(funnel.find((f) => f.stage === 'interview')?.count).toBe(1)
  })

  it('never penalizes a rapid forward catch-up that ends at the true furthest stage', () => {
    // Batch-updating several real stage changes back-to-back at day's end --
    // every entry is seconds apart, but nothing is ever above current_stage,
    // so the dwell check never applies and everything counts.
    const apps = [makeApplication({ id: 'a', current_stage: 'offer', created_at: '2026-01-01T00:00:00.000Z' })]
    const history = [
      makeHistoryEntry({ id: 'h0', application_id: 'a', stage: 'applied', entered_at: '2026-01-01T00:00:00.000Z' }),
      makeHistoryEntry({ id: 'h1', application_id: 'a', stage: 'interview', entered_at: '2026-01-01T00:00:02.000Z' }),
      makeHistoryEntry({ id: 'h2', application_id: 'a', stage: 'offer', entered_at: '2026-01-01T00:00:04.000Z' }),
    ]
    const funnel = computeFunnel(apps, history)
    expect(funnel.map((f) => f.count)).toEqual([1, 1, 1, 1])
  })
})

describe('computeOutcomes', () => {
  it('counts archived applications by reason, ignoring active ones', () => {
    const apps = [
      makeApplication({ id: 'a', is_archived: true, archive_reason: 'rejected' }),
      makeApplication({ id: 'b', is_archived: true, archive_reason: 'rejected' }),
      makeApplication({ id: 'c', is_archived: true, archive_reason: 'accepted' }),
      makeApplication({ id: 'd', is_archived: false }),
    ]
    const outcomes = computeOutcomes(apps)
    expect(outcomes.find((o) => o.reason === 'rejected')?.count).toBe(2)
    expect(outcomes.find((o) => o.reason === 'accepted')?.count).toBe(1)
    expect(outcomes.find((o) => o.reason === 'withdrawn')?.count).toBe(0)
  })
})

describe('computeApplicationsOverTime', () => {
  it('buckets by month of date_applied and splits active vs archived', () => {
    const apps = [
      makeApplication({ id: 'a', date_applied: '2026-01-15', is_archived: false }),
      makeApplication({ id: 'b', date_applied: '2026-01-20', is_archived: true }),
      makeApplication({ id: 'c', date_applied: '2026-02-01', is_archived: false }),
    ]
    const series = computeApplicationsOverTime(apps)
    expect(series).toEqual([
      { period: '2026-01', active: 1, archived: 1 },
      { period: '2026-02', active: 1, archived: 0 },
    ])
  })
})

describe('computeStageTiming', () => {
  it('is zero days for the first stage', () => {
    const apps = [makeApplication({ id: 'a' })]
    expect(computeStageTiming(apps, [])[0].avgDaysToReach).toBe(0)
  })

  it('computes days from created_at to the earliest history entry for a stage', () => {
    const apps = [makeApplication({ id: 'a', current_stage: 'interview', created_at: '2026-01-01T00:00:00.000Z' })]
    const history = [
      makeHistoryEntry({ application_id: 'a', stage: 'interview', entered_at: '2026-01-06T00:00:00.000Z' }),
    ]
    const timing = computeStageTiming(apps, history)
    expect(timing.find((t) => t.stage === 'interview')?.avgDaysToReach).toBe(5)
    expect(timing.find((t) => t.stage === 'offer')?.avgDaysToReach).toBeNull()
  })

  it('treats a legacy app created directly into a stage (no history) as zero days, not unreached', () => {
    const apps = [makeApplication({ id: 'a', current_stage: 'interview' })]
    const timing = computeStageTiming(apps, [])
    const interview = timing.find((t) => t.stage === 'interview')
    expect(interview?.avgDaysToReach).toBe(0)
    expect(interview?.sampleSize).toBe(1)
  })

  it('counts a card in its creation stage via the recorded initial history row', () => {
    // A card created into Applied (with the initial history row now written on
    // create) and later moved to Interview should appear in BOTH stages'
    // timing samples: Applied at day zero, Interview at its move delta.
    const apps = [makeApplication({ id: 'a', current_stage: 'interview', created_at: '2026-01-01T00:00:00.000Z' })]
    const history = [
      makeHistoryEntry({ id: 'h0', application_id: 'a', stage: 'applied', entered_at: '2026-01-01T00:00:00.000Z' }),
      makeHistoryEntry({ id: 'h1', application_id: 'a', stage: 'interview', entered_at: '2026-01-04T00:00:00.000Z' }),
    ]
    const timing = computeStageTiming(apps, history)
    const applied = timing.find((t) => t.stage === 'applied')
    expect(applied?.avgDaysToReach).toBe(0)
    expect(applied?.sampleSize).toBe(1)
    expect(timing.find((t) => t.stage === 'interview')?.avgDaysToReach).toBe(3)
  })

  it('excludes an untrusted rapid pass-through from the timing sample too', () => {
    // Same drag-through-everything-then-back scenario as computeFunnel's
    // equivalent test -- the phantom "reached interview" shouldn't drag the
    // interview timing average toward zero either.
    const apps = [makeApplication({ id: 'a', current_stage: 'applied', created_at: '2026-01-01T00:00:00.000Z' })]
    const history = [
      makeHistoryEntry({ id: 'h0', application_id: 'a', stage: 'eyes_on', entered_at: '2026-01-01T00:00:00.000Z' }),
      makeHistoryEntry({ id: 'h1', application_id: 'a', stage: 'applied', entered_at: '2026-01-01T00:00:02.000Z' }),
      makeHistoryEntry({ id: 'h2', application_id: 'a', stage: 'interview', entered_at: '2026-01-01T00:00:04.000Z' }),
      makeHistoryEntry({ id: 'h3', application_id: 'a', stage: 'applied', entered_at: '2026-01-01T00:00:06.000Z' }),
    ]
    const timing = computeStageTiming(apps, history)
    const interview = timing.find((t) => t.stage === 'interview')
    expect(interview?.avgDaysToReach).toBeNull()
    expect(interview?.sampleSize).toBe(0)
  })
})

describe('computeResponseRateBySegment', () => {
  const options = [
    { value: 'remote', label: 'Remote' },
    { value: 'on_site', label: 'On-site' },
  ]

  it('counts interview-or-beyond and non-no_response archives as a response', () => {
    const apps = [
      makeApplication({ id: 'a', work_mode: 'remote', current_stage: 'interview' }),
      makeApplication({ id: 'b', work_mode: 'remote', is_archived: true, archive_reason: 'no_response' }),
      makeApplication({ id: 'c', work_mode: 'on_site', is_archived: true, archive_reason: 'rejected' }),
    ]
    const rates = computeResponseRateBySegment(apps, [], 'work_mode', options)
    const remote = rates.find((r) => r.value === 'remote')!
    expect(remote.total).toBe(2)
    expect(remote.responded).toBe(1)
    expect(remote.rate).toBe(50)
    const onSite = rates.find((r) => r.value === 'on_site')!
    expect(onSite.rate).toBe(100)
  })

  it('returns a null rate for a segment with no applications', () => {
    const rates = computeResponseRateBySegment([], [], 'work_mode', options)
    expect(rates.every((r) => r.rate === null)).toBe(true)
  })
})

describe('computeTrackerComparison', () => {
  it('computes per-tracker totals and interview rates', () => {
    const trackers: Tracker[] = [
      { id: 't1', user_id: null, name: 'Grad roles', created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 't2', user_id: null, name: 'Senior roles', created_at: '2026-01-01', updated_at: '2026-01-01' },
    ]
    const apps = [
      makeApplication({ id: 'a', tracker_id: 't1', current_stage: 'interview' }),
      makeApplication({ id: 'b', tracker_id: 't1', current_stage: 'applied' }),
      makeApplication({ id: 'c', tracker_id: 't2', current_stage: 'offer' }),
    ]
    const comparison = computeTrackerComparison(apps, [], trackers)
    expect(comparison.find((c) => c.trackerId === 't1')).toMatchObject({ total: 2, interviewRate: 50 })
    expect(comparison.find((c) => c.trackerId === 't2')).toMatchObject({ total: 1, interviewRate: 100 })
  })
})

describe('computeKpis', () => {
  it('computes totals and rates across all applications', () => {
    const apps = [
      makeApplication({ id: 'a', current_stage: 'interview' }),
      makeApplication({ id: 'b', current_stage: 'offer' }),
      makeApplication({ id: 'c', current_stage: 'applied', is_archived: true, archive_reason: 'no_response' }),
    ]
    const kpis = computeKpis(apps, [])
    expect(kpis.total).toBe(3)
    expect(kpis.active).toBe(2)
    expect(kpis.interviewRate).toBeCloseTo((2 / 3) * 100)
    expect(kpis.offerRate).toBeCloseTo((1 / 3) * 100)
  })

  it('returns null rates when there are no applications', () => {
    const kpis = computeKpis([], [])
    expect(kpis.interviewRate).toBeNull()
    expect(kpis.offerRate).toBeNull()
  })
})
