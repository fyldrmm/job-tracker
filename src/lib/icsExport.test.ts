import { describe, expect, it } from 'vitest'
import { buildGoogleCalendarUrl, buildInterviewIcs } from './icsExport'
import type { Application, Interview } from '../types/application'

function makeApplication(overrides: Partial<Application> = {}): Application {
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
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeInterview(overrides: Partial<Interview> = {}): Interview {
  return {
    id: 'interview-1',
    application_id: 'app-1',
    round: 1,
    scheduled_at: '2026-08-04T13:00:00.000Z',
    duration_minutes: 60,
    is_remote: false,
    location: null,
    notes: null,
    created_at: '2026-07-23T10:00:00.000Z',
    updated_at: '2026-07-23T10:00:00.000Z',
    ...overrides,
  }
}

describe('buildInterviewIcs', () => {
  it('formats DTSTART/DTEND as UTC and derives DTEND from duration_minutes', () => {
    const ics = buildInterviewIcs(makeApplication(), makeInterview({ duration_minutes: 90 }))
    expect(ics).toContain('DTSTART:20260804T130000Z')
    expect(ics).toContain('DTEND:20260804T143000Z')
  })

  it('uses the interview id as a stable UID, so re-exporting after an edit targets the same event', () => {
    const ics = buildInterviewIcs(makeApplication(), makeInterview())
    expect(ics).toContain('UID:interview-1@job-tracker')
  })

  it('uses CRLF line endings as RFC 5545 requires', () => {
    const ics = buildInterviewIcs(makeApplication(), makeInterview())
    expect(ics).toContain('\r\n')
    expect(ics.split('\r\n').some((line) => line.includes('\n'))).toBe(false)
  })

  it('includes a 1-hour-before VALARM', () => {
    const ics = buildInterviewIcs(makeApplication(), makeInterview())
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics).toContain('TRIGGER:-PT1H')
  })

  it('falls back LOCATION to "Remote" when remote with no explicit location given', () => {
    const ics = buildInterviewIcs(makeApplication(), makeInterview({ is_remote: true, location: null }))
    expect(ics).toContain('LOCATION:Remote')
  })

  it('uses the explicit location (e.g. a meeting link) over the Remote fallback', () => {
    const ics = buildInterviewIcs(
      makeApplication(),
      makeInterview({ is_remote: true, location: 'https://meet.example.com/abc' }),
    )
    expect(ics).toContain('LOCATION:https://meet.example.com/abc')
  })

  it('omits LOCATION entirely when on-site with no location given', () => {
    const ics = buildInterviewIcs(makeApplication(), makeInterview({ is_remote: false, location: null }))
    expect(ics).not.toContain('LOCATION')
  })

  it('escapes commas, semicolons, backslashes and newlines in free text fields', () => {
    const ics = buildInterviewIcs(
      makeApplication(),
      makeInterview({ location: 'Suite 5; Floor 2, Building A\\B\nRoom 1' }),
    )
    expect(ics).toContain('LOCATION:Suite 5\\; Floor 2\\, Building A\\\\B\\nRoom 1')
  })

  it('folds lines longer than 75 characters with a leading-space continuation', () => {
    const longNotes = 'x'.repeat(200)
    const ics = buildInterviewIcs(makeApplication(), makeInterview({ notes: longNotes }))
    const rawLines = ics.split('\r\n')
    expect(rawLines.every((line) => line.length <= 75)).toBe(true)
    expect(rawLines.some((line) => line.startsWith(' '))).toBe(true)
  })

  it('includes the job link as both URL and part of DESCRIPTION when present', () => {
    const ics = buildInterviewIcs(makeApplication({ job_link: 'https://jobs.example.com/123' }), makeInterview())
    expect(ics).toContain('URL:https://jobs.example.com/123')
    expect(ics).toContain('Job posting: https://jobs.example.com/123')
  })
})

describe('buildGoogleCalendarUrl', () => {
  it('builds a calendar.google.com quick-add link with matching UTC dates', () => {
    const url = buildGoogleCalendarUrl(makeApplication(), makeInterview({ duration_minutes: 30 }))
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE')
    expect(parsed.searchParams.get('dates')).toBe('20260804T130000Z/20260804T133000Z')
  })

  it('includes location and details when given', () => {
    const url = buildGoogleCalendarUrl(
      makeApplication({ job_link: 'https://jobs.example.com/123' }),
      makeInterview({ is_remote: true, location: 'https://meet.example.com/abc', notes: 'Bring resume' }),
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get('location')).toBe('https://meet.example.com/abc')
    expect(parsed.searchParams.get('details')).toContain('Bring resume')
    expect(parsed.searchParams.get('details')).toContain('https://jobs.example.com/123')
  })
})
