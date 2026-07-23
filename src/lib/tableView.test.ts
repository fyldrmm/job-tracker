import { describe, expect, it } from 'vitest'
import { sortApplicationsForTable } from './tableView'
import type { Application } from '../types/application'

function makeApplication(overrides: Partial<Application>): Application {
  return {
    id: overrides.id ?? 'a',
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
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('sortApplicationsForTable', () => {
  const apps = [
    makeApplication({ id: 'b', company: 'Beta', date_applied: '2026-02-01', current_stage: 'offer' }),
    makeApplication({ id: 'a', company: 'Acme', date_applied: '2026-03-01', current_stage: 'eyes_on' }),
    makeApplication({ id: 'c', company: 'Cee', date_applied: '2026-01-01', current_stage: 'interview' }),
  ]

  it('sorts by company ascending', () => {
    expect(sortApplicationsForTable(apps, 'company', 'asc').map((a) => a.id)).toEqual(['a', 'b', 'c'])
  })

  it('sorts by company descending', () => {
    expect(sortApplicationsForTable(apps, 'company', 'desc').map((a) => a.id)).toEqual(['c', 'b', 'a'])
  })

  it('sorts by date_applied ascending', () => {
    expect(sortApplicationsForTable(apps, 'date_applied', 'asc').map((a) => a.id)).toEqual(['c', 'b', 'a'])
  })

  it('sorts by pipeline stage order, not alphabetically', () => {
    expect(sortApplicationsForTable(apps, 'current_stage', 'asc').map((a) => a.id)).toEqual(['a', 'c', 'b'])
  })

  it('does not mutate the input array', () => {
    const copy = [...apps]
    sortApplicationsForTable(apps, 'company', 'desc')
    expect(apps).toEqual(copy)
  })
})
