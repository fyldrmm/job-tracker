import { byTimestamp } from './sort'
import type { Interview } from '../types/application'

export const byScheduledAt = byTimestamp('scheduled_at')

/**
 * Rounds are numbered per application, starting at 1. Derived from max(round)
 * rather than count so that deleting round 2 of 3 doesn't make the next round
 * collide with the existing round 3 -- the unique index in
 * 0013_interviews.sql would reject that write outright.
 */
export function nextRoundNumber(existing: Interview[]): number {
  return existing.reduce((max, interview) => Math.max(max, interview.round), 0) + 1
}

// Rounds read in CardDetail as "Round 1, Round 2, ..." -- ordered by round
// number, not by date, so an edited-out-of-order date (round 2 rescheduled
// earlier than round 1) doesn't reshuffle the list the user is reading by
// round.
export function interviewsForApplication(interviews: Interview[], applicationId: string): Interview[] {
  return interviews.filter((i) => i.application_id === applicationId).sort((a, b) => a.round - b.round)
}

/**
 * The soonest interview at or after `now` -- what the card badge and the
 * "Next interview" column show. Past rounds are still kept and listed in
 * CardDetail; they're just not what "next" means.
 */
export function nextUpcomingInterview(
  interviews: Interview[],
  applicationId: string,
  now: Date = new Date(),
): Interview | null {
  const iso = now.toISOString()
  // Sorted by date here, deliberately NOT via interviewsForApplication --
  // that one orders by round number for CardDetail's reading order, which
  // is a different order once a round is rescheduled out of sequence.
  return (
    interviews
      .filter((i) => i.application_id === applicationId && i.scheduled_at >= iso)
      .sort(byScheduledAt)[0] ?? null
  )
}

// HTML date/time <input> values are always in the viewer's local time zone,
// so this is the one place local-time conversion happens for the *write*
// path (see formatDateTime in lib/format.ts for the read/display path).
export function localDateTimeToIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString()
}

// Inverse of localDateTimeToIso, for pre-filling the edit form from a stored
// UTC scheduled_at. Built from local getters (not toISOString/slicing),
// which would hand back UTC components instead of the viewer's local ones.
export function isoToLocalDateTimeInputs(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return { date, time }
}

// Shared by the Kanban card badge, the Table view, and the CSV/XLSX exports
// -- one computation of "what should this application's interview cell
// show", so the three don't quietly drift into disagreeing with each other.
export interface InterviewSummary {
  nextInterview: Interview | null
  roundCount: number
}

export function interviewSummaryForApplication(
  interviews: Interview[],
  applicationId: string,
  now: Date = new Date(),
): InterviewSummary {
  return {
    nextInterview: nextUpcomingInterview(interviews, applicationId, now),
    roundCount: interviewsForApplication(interviews, applicationId).length,
  }
}
