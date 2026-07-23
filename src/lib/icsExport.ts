import type { Application, Interview } from '../types/application'

// YYYYMMDDTHHMMSSZ, the UTC "form 2" timestamp RFC 5545 requires for
// DTSTART/DTEND/DTSTAMP. interview.scheduled_at is already UTC (stored that
// way precisely so this needs no timezone conversion here).
function formatIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

// RFC 5545 §3.3.11: backslash, semicolon, comma and newline are the four
// characters TEXT values must escape.
function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

// RFC 5545 §3.1: content lines must not exceed 75 octets; continuations
// start with a single leading space. Approximated as characters rather than
// UTF-8 octets -- correct for the ASCII-heavy fields here, and folding too
// early is harmless, whereas exceeding 75 octets makes some calendar clients
// reject the whole file. Applied unconditionally so a long notes/location
// value can never slip past unfolded.
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line
  const CRLF = '\r\n'
  let result = line.slice(0, 75)
  let rest = line.slice(75)
  while (rest.length > 0) {
    result += CRLF + ' ' + rest.slice(0, 74)
    rest = rest.slice(74)
  }
  return result
}

/**
 * A standalone .ics for one interview round. UID is the interview's own id
 * (stable across edits), so re-downloading after changing the date is meant
 * to update the same calendar event rather than create a duplicate --
 * calendar apps that dedupe on UID will honor that; ones that don't will
 * just show both, which is a formatting choice they make, not a defect here.
 */
export function buildInterviewIcs(application: Application, interview: Interview): string {
  const start = new Date(interview.scheduled_at)
  const end = new Date(start.getTime() + interview.duration_minutes * 60_000)

  const summary = `Interview — ${application.company} · ${application.role_title}`
  const location = interview.location?.trim() || (interview.is_remote ? 'Remote' : '')
  const descriptionParts = [
    interview.notes,
    application.job_link ? `Job posting: ${application.job_link}` : null,
  ].filter((part): part is string => Boolean(part && part.trim()))

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JobTracker//Interview Scheduling//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${interview.id}@job-tracker`,
    'SEQUENCE:0',
    `DTSTAMP:${formatIcsUtc(new Date().toISOString())}`,
    `DTSTART:${formatIcsUtc(interview.scheduled_at)}`,
    `DTEND:${formatIcsUtc(end.toISOString())}`,
    `SUMMARY:${escapeIcsText(summary)}`,
  ]
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`)
  if (descriptionParts.length > 0) lines.push(`DESCRIPTION:${escapeIcsText(descriptionParts.join('\n'))}`)
  if (application.job_link) lines.push(`URL:${escapeIcsText(application.job_link)}`)
  lines.push(
    // 1 hour before, per user decision -- fires from the calendar app's own
    // notification system, no server-side reminder infrastructure needed.
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Interview reminder',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  )

  return lines.map(foldIcsLine).join('\r\n') + '\r\n'
}

function sanitizeFilenamePart(value: string): string {
  return value.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'interview'
}

export function downloadInterviewIcs(application: Application, interview: Interview): void {
  const ics = buildInterviewIcs(application, interview)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `interview-${sanitizeFilenamePart(application.company)}-round${interview.round}.ics`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * A one-click alternative to the .ics download for Google Calendar users --
 * same fields, no file to import. https://calendar.google.com/calendar/render
 * with action=TEMPLATE is Google's documented (if unofficial) quick-add URL
 * scheme; it opens Google Calendar's own "add event" screen pre-filled, so
 * nothing here touches the user's calendar without them clicking Save there.
 */
export function buildGoogleCalendarUrl(application: Application, interview: Interview): string {
  const start = new Date(interview.scheduled_at)
  const end = new Date(start.getTime() + interview.duration_minutes * 60_000)
  const location = interview.location?.trim() || (interview.is_remote ? 'Remote' : '')
  const detailsParts = [
    interview.notes,
    application.job_link ? `Job posting: ${application.job_link}` : null,
  ].filter((part): part is string => Boolean(part && part.trim()))

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Interview — ${application.company} · ${application.role_title}`,
    dates: `${formatIcsUtc(start.toISOString())}/${formatIcsUtc(end.toISOString())}`,
  })
  if (location) params.set('location', location)
  if (detailsParts.length > 0) params.set('details', detailsParts.join('\n'))

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
