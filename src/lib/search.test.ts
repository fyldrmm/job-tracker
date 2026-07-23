import { describe, expect, it } from 'vitest'
import { matchesCompanyOrRoleSearch } from './search'
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

describe('matchesCompanyOrRoleSearch', () => {
  const app = makeApplication({ company: 'Acme Corp', role_title: 'Senior Engineer' })

  it('matches an empty query', () => {
    expect(matchesCompanyOrRoleSearch(app, '')).toBe(true)
    expect(matchesCompanyOrRoleSearch(app, '   ')).toBe(true)
  })

  it('matches a company substring, case-insensitively', () => {
    expect(matchesCompanyOrRoleSearch(app, 'acme')).toBe(true)
    expect(matchesCompanyOrRoleSearch(app, 'ACME')).toBe(true)
  })

  it('matches a role substring, case-insensitively', () => {
    expect(matchesCompanyOrRoleSearch(app, 'engineer')).toBe(true)
    expect(matchesCompanyOrRoleSearch(app, 'senior')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(matchesCompanyOrRoleSearch(app, 'nonexistent')).toBe(false)
  })
})
