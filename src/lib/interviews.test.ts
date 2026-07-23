import { describe, expect, it } from 'vitest'
import {
  interviewSummaryForApplication,
  interviewsForApplication,
  isoToLocalDateTimeInputs,
  localDateTimeToIso,
  nextRoundNumber,
  nextUpcomingInterview,
} from './interviews'
import type { Interview } from '../types/application'

function interview(overrides: Partial<Interview> & { id: string }): Interview {
  return {
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

describe('nextRoundNumber', () => {
  it('starts at 1 for an application with no interviews yet', () => {
    expect(nextRoundNumber([])).toBe(1)
  })

  it('derives from the highest round, not the count -- so a gap left by a deleted round cannot collide', () => {
    // Rounds 1 and 3 exist (2 was deleted). Counting would return 3 and hit
    // the unique (application_id, round) index in 0013_interviews.sql.
    const existing = [interview({ id: 'a', round: 1 }), interview({ id: 'c', round: 3 })]
    expect(nextRoundNumber(existing)).toBe(4)
  })
})

describe('interviewsForApplication', () => {
  it('keeps only the given application and orders by round number', () => {
    const all = [
      interview({ id: 'round-2', round: 2, scheduled_at: '2026-08-01T09:00:00.000Z' }),
      interview({ id: 'other-app', application_id: 'app-2', round: 1 }),
      interview({ id: 'round-1', round: 1, scheduled_at: '2026-08-10T09:00:00.000Z' }),
    ]
    // round-1 is scheduled AFTER round-2 here (rescheduled) -- the list still
    // reads "Round 1, Round 2", not by date, so CardDetail's list doesn't
    // reshuffle out of round order just because a date moved.
    expect(interviewsForApplication(all, 'app-1').map((i) => i.id)).toEqual(['round-1', 'round-2'])
  })
})

describe('nextUpcomingInterview', () => {
  const now = new Date('2026-08-05T12:00:00.000Z')

  it('skips past rounds and returns the soonest future one', () => {
    const all = [
      interview({ id: 'past', round: 1, scheduled_at: '2026-08-01T09:00:00.000Z' }),
      interview({ id: 'next', round: 2, scheduled_at: '2026-08-06T09:00:00.000Z' }),
      interview({ id: 'after', round: 3, scheduled_at: '2026-08-20T09:00:00.000Z' }),
    ]
    expect(nextUpcomingInterview(all, 'app-1', now)?.id).toBe('next')
  })

  it('returns null when every round is in the past -- the rounds are kept, they are just not "next"', () => {
    const all = [interview({ id: 'past', scheduled_at: '2026-08-01T09:00:00.000Z' })]
    expect(nextUpcomingInterview(all, 'app-1', now)).toBeNull()
  })

  it('picks by soonest date, not by round number, when a later round is rescheduled earlier', () => {
    const all = [
      interview({ id: 'round-2-soon', round: 2, scheduled_at: '2026-08-06T09:00:00.000Z' }),
      interview({ id: 'round-1-later', round: 1, scheduled_at: '2026-08-15T09:00:00.000Z' }),
    ]
    expect(nextUpcomingInterview(all, 'app-1', now)?.id).toBe('round-2-soon')
  })
})

describe('interviewSummaryForApplication', () => {
  const now = new Date('2026-08-05T12:00:00.000Z')

  it('combines the next upcoming interview with the total round count', () => {
    const all = [
      interview({ id: 'past', round: 1, scheduled_at: '2026-08-01T09:00:00.000Z' }),
      interview({ id: 'next', round: 2, scheduled_at: '2026-08-06T09:00:00.000Z' }),
    ]
    expect(interviewSummaryForApplication(all, 'app-1', now)).toEqual({
      nextInterview: all[1],
      roundCount: 2,
    })
  })

  it('reports a round count even when every round is in the past (nextInterview null)', () => {
    const all = [interview({ id: 'past', round: 1, scheduled_at: '2026-08-01T09:00:00.000Z' })]
    expect(interviewSummaryForApplication(all, 'app-1', now)).toEqual({
      nextInterview: null,
      roundCount: 1,
    })
  })

  it('reports zero rounds for an application with no interviews', () => {
    expect(interviewSummaryForApplication([], 'app-1', now)).toEqual({
      nextInterview: null,
      roundCount: 0,
    })
  })
})

describe('localDateTimeToIso / isoToLocalDateTimeInputs', () => {
  it('round-trips a date/time pair through an ISO string and back', () => {
    const iso = localDateTimeToIso('2026-08-04', '14:30')
    expect(isoToLocalDateTimeInputs(iso)).toEqual({ date: '2026-08-04', time: '14:30' })
  })

  it('pads single-digit hours and minutes in the local time output', () => {
    const iso = localDateTimeToIso('2026-01-05', '09:05')
    expect(isoToLocalDateTimeInputs(iso)).toEqual({ date: '2026-01-05', time: '09:05' })
  })
})
