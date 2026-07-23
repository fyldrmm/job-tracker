import { describe, expect, it } from 'vitest'
import { buildApplicationsCsv, escapeCsvField } from './csvExport'
import type { Application, Interview, Tracker } from '../types/application'

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

const trackers: Tracker[] = [
  { id: 't1', user_id: null, name: 'Grad roles', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 't2', user_id: null, name: 'Senior roles', created_at: '2026-01-01', updated_at: '2026-01-01' },
]

const noInterviews: Interview[] = []

describe('escapeCsvField', () => {
  it('leaves plain values untouched', () => {
    expect(escapeCsvField('Acme')).toBe('Acme')
  })

  it('quotes and escapes values containing commas', () => {
    expect(escapeCsvField('Acme, Inc')).toBe('"Acme, Inc"')
  })

  it('quotes and doubles internal quotes', () => {
    expect(escapeCsvField('Say "hi"')).toBe('"Say ""hi"""')
  })

  it('quotes values containing newlines', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
  })
})

describe('buildApplicationsCsv', () => {
  it('returns just the header row for an empty list', () => {
    const csv = buildApplicationsCsv([], trackers, noInterviews)
    expect(csv).toBe(
      'Company,Role,Tracker,Stage,Date applied,Salary range,Location,Employment type,Work mode,Priority,Archived,Archive reason,Archived at,Job link,Notes,Next interview,Rounds',
    )
  })

  it('renders a full row with resolved labels', () => {
    const app = makeApplication({
      company: 'Acme',
      role_title: 'Engineer',
      tracker_id: 't1',
      current_stage: 'interview',
      date_applied: '2026-02-01',
      salary_range: '100k-120k',
      location: 'Remote',
      employment_type: 'full_time',
      work_mode: 'remote',
      is_priority: true,
      is_archived: true,
      archive_reason: 'rejected',
      archived_at: '2026-03-01T00:00:00.000Z',
      job_link: 'https://example.com/job',
      notes: 'Great fit',
    })
    const csv = buildApplicationsCsv([app], trackers, noInterviews)
    const [, row] = csv.split('\n')
    expect(row).toBe(
      'Acme,Engineer,Grad roles,Interview,2026-02-01,100k-120k,Remote,Full-time,Remote,Yes,Yes,Rejected,2026-03-01T00:00:00.000Z,https://example.com/job,Great fit,,0',
    )
  })

  it('renders empty cells for null optional fields', () => {
    const app = makeApplication({ tracker_id: 't2' })
    const csv = buildApplicationsCsv([app], trackers, noInterviews)
    const [, row] = csv.split('\n')
    expect(row).toBe('Acme,Engineer,Senior roles,Applied,2026-01-01,,,,,No,No,,,,,,0')
  })

  it('escapes fields with commas or quotes', () => {
    const app = makeApplication({ company: 'Acme, Inc', notes: 'Said "great" fit' })
    const csv = buildApplicationsCsv([app], trackers, noInterviews)
    const [, row] = csv.split('\n')
    expect(row).toContain('"Acme, Inc"')
    expect(row).toContain('"Said ""great"" fit"')
  })

  it('falls back to an empty tracker name if the tracker is missing', () => {
    const app = makeApplication({ tracker_id: 'missing' })
    const csv = buildApplicationsCsv([app], trackers, noInterviews)
    const [, row] = csv.split('\n')
    expect(row.split(',')[2]).toBe('')
  })

  it('includes the soonest upcoming interview and the total round count', () => {
    const app = makeApplication({ id: 'app-1' })
    const interviews: Interview[] = [
      {
        id: 'i1',
        application_id: 'app-1',
        round: 1,
        scheduled_at: '2026-01-01T00:00:00.000Z',
        duration_minutes: 60,
        is_remote: false,
        location: null,
        notes: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'i2',
        application_id: 'app-1',
        round: 2,
        scheduled_at: '2099-06-15T14:00:00.000Z',
        duration_minutes: 60,
        is_remote: false,
        location: null,
        notes: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]
    const csv = buildApplicationsCsv([app], trackers, interviews)
    const [, row] = csv.split('\n')
    // The formatted date itself contains a comma ("Jun 15, 5:00 PM"), so it's
    // quoted -- naive row.split(',') would cut through it. Check the raw
    // row string instead of splitting.
    expect(row.endsWith(',2')).toBe(true)
    expect(row).toContain('Jun 15')
  })
})
