import type { Application, ApplicationStage, ArchiveReason, StageHistoryEntry, Tracker } from '../types/application'
import { STAGE_ORDER, STAGE_LABELS } from './stages'
import { ARCHIVE_REASON_LABELS } from './archive'

export type InsightsScope = 'global' | string

export function filterApplicationsForScope(applications: Application[], scope: InsightsScope): Application[] {
  return scope === 'global' ? applications : applications.filter((app) => app.tracker_id === scope)
}

function groupHistoryByApplication(stageHistory: StageHistoryEntry[]): Map<string, StageHistoryEntry[]> {
  const map = new Map<string, StageHistoryEntry[]>()
  for (const entry of stageHistory) {
    const existing = map.get(entry.application_id)
    if (existing) existing.push(entry)
    else map.set(entry.application_id, [entry])
  }
  return map
}

// How long a stage has to be held, after being reached but before being
// reversed, to be trusted as a real visit rather than a rapid pass-through
// (e.g. dragging a card through every column to see how the board works,
// then dropping it back). Comfortably longer than any manual click-through of
// four columns, comfortably shorter than any realistic real regression (an
// interview rejection plays out over hours/days, not minutes) -- not tuned to
// anything more precise than that gap.
const MIN_DWELL_MS = 30 * 60 * 1000

function msBetween(fromIso: string, toIso: string): number {
  return new Date(toIso).getTime() - new Date(fromIso).getTime()
}

// stage_history entries trusted as genuine visits, for a given app. An entry
// at or below the app's current stage is always trusted -- nothing has
// reversed it, there's nothing to distrust. An entry ABOVE current stage means
// the app was later moved back down from it; that's only trusted if it was
// held for MIN_DWELL_MS before the next recorded move, distinguishing a real
// regression (time passed) from a same-session round-trip (it didn't). This
// deliberately can't (and doesn't need to) catch a rapid but genuine forward
// catch-up -- batch-updating several real stage changes back-to-back, ending
// at the true furthest stage -- since that path never goes above current
// stage in the first place, so the dwell check never applies to it.
function trustedEntries(app: Application, historyByApp: Map<string, StageHistoryEntry[]>): StageHistoryEntry[] {
  const currentIdx = STAGE_ORDER.indexOf(app.current_stage)
  const entries = [...(historyByApp.get(app.id) ?? [])].sort((a, b) => a.entered_at.localeCompare(b.entered_at))
  return entries.filter((entry, i) => {
    if (STAGE_ORDER.indexOf(entry.stage) <= currentIdx) return true
    const next = entries[i + 1]
    // No later entry to compare against shouldn't happen in practice (the
    // last entry always mirrors current_stage), but fail open rather than
    // discard a visit we have no reversal evidence for.
    if (!next) return true
    return msBetween(entry.entered_at, next.entered_at) >= MIN_DWELL_MS
  })
}

// The set of pipeline-stage indices (into STAGE_ORDER) an application
// genuinely occupied at some point: its current stage -- always included, so
// this stays correct for legacy rows created before we recorded an initial
// stage_history row (useApplications.createApplication) -- plus every
// *trusted* stage it was moved into (see trustedEntries above). This is the
// single source of truth for every "reached a stage" metric below; each
// derives its own reading from it.
function stagesOccupied(app: Application, historyByApp: Map<string, StageHistoryEntry[]>): Set<number> {
  const occupied = new Set<number>([STAGE_ORDER.indexOf(app.current_stage)])
  for (const entry of trustedEntries(app, historyByApp)) {
    occupied.add(STAGE_ORDER.indexOf(entry.stage))
  }
  return occupied
}

// The furthest pipeline stage an application ever reached, by index into
// STAGE_ORDER. Funnel/KPI semantics are *cumulative* ("got at least this
// far"): reaching a later stage implies having got past every earlier one, so
// a stage counts as reached whenever this furthest index is >= that stage --
// which is also why a stage skipped via drag (Applied -> Offer) is imputed as
// reached (standard funnel behaviour, and keeps the funnel monotonic +
// consistent with the KPI tiles).
function furthestStageIndex(app: Application, historyByApp: Map<string, StageHistoryEntry[]>): number {
  return Math.max(...stagesOccupied(app, historyByApp))
}

export interface FunnelStage {
  stage: ApplicationStage
  label: string
  count: number
}

// Cumulative funnel: count of applications that ever reached each stage or
// beyond, not just applications currently sitting in it -- that's what makes
// counts monotonically non-increasing left to right, the standard funnel
// shape.
export function computeFunnel(applications: Application[], stageHistory: StageHistoryEntry[]): FunnelStage[] {
  const historyByApp = groupHistoryByApplication(stageHistory)
  const furthest = applications.map((app) => furthestStageIndex(app, historyByApp))
  return STAGE_ORDER.map((stage, idx) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: furthest.filter((f) => f >= idx).length,
  }))
}

export interface OutcomeCount {
  reason: ArchiveReason
  label: string
  count: number
}

const ARCHIVE_REASON_ORDER: ArchiveReason[] = ['rejected', 'withdrawn', 'no_response', 'accepted']

export function computeOutcomes(applications: Application[]): OutcomeCount[] {
  const archived = applications.filter((app) => app.is_archived && app.archive_reason)
  return ARCHIVE_REASON_ORDER.map((reason) => ({
    reason,
    label: ARCHIVE_REASON_LABELS[reason],
    count: archived.filter((app) => app.archive_reason === reason).length,
  }))
}

export interface TimeSeriesPoint {
  period: string // 'YYYY-MM'
  active: number
  archived: number
}

// 'YYYY-MM' + 1 month, with year rollover. Pure string/number arithmetic
// (no Date object) so this can't be thrown off by timezone-driven
// month/day boundary shifts -- the month range here only ever needs to
// answer "what's the next label," never a real calendar computation.
function nextMonth(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const rolledOver = month === 12
  return `${rolledOver ? year + 1 : year}-${String(rolledOver ? 1 : month + 1).padStart(2, '0')}`
}

// Bucketed by month of date_applied (not created_at/archived_at) -- this is
// meant to answer "how much did I apply, and how did that cohort turn out,"
// not "when did things get archived." The active/archived split reflects
// current status, not a historical event dated to that month -- an app
// applied to in January and archived last week still shows as "archived" in
// January's bar.
//
// Zero-filled across the full min-to-max month range: without this, a month
// with no applications is simply absent rather than shown as zero, so two
// non-adjacent months with activity render next to each other on the x-axis
// as if nothing came between them -- silently misrepresenting cadence.
export function computeApplicationsOverTime(applications: Application[]): TimeSeriesPoint[] {
  const byMonth = new Map<string, { active: number; archived: number }>()
  for (const app of applications) {
    const month = app.date_applied.slice(0, 7)
    const bucket = byMonth.get(month) ?? { active: 0, archived: 0 }
    if (app.is_archived) bucket.archived += 1
    else bucket.active += 1
    byMonth.set(month, bucket)
  }
  if (byMonth.size === 0) return []

  const months = [...byMonth.keys()].sort()
  const lastMonth = months[months.length - 1]
  const points: TimeSeriesPoint[] = []
  for (let month = months[0]; ; month = nextMonth(month)) {
    points.push({ period: month, ...(byMonth.get(month) ?? { active: 0, archived: 0 }) })
    if (month === lastMonth) break
  }
  return points
}

export interface StageTiming {
  stage: ApplicationStage
  label: string
  avgDaysToReach: number | null
  sampleSize: number
}

function daysBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000
}

// "Time in stage" in the strict sense (how long an app sat in a stage before
// moving on) isn't reconstructible from the data model: StageHistoryEntry
// only records the stage moved *into* and when, not what stage preceded it.
// What IS well-defined from created_at + stage_history is "average days from
// creating the card to first reaching stage X" -- a cleaner and equally
// useful velocity metric, computed here instead.
export function computeStageTiming(applications: Application[], stageHistory: StageHistoryEntry[]): StageTiming[] {
  const historyByApp = groupHistoryByApplication(stageHistory)
  return STAGE_ORDER.map((stage, idx) => {
    if (idx === 0) {
      return { stage, label: STAGE_LABELS[stage], avgDaysToReach: 0, sampleSize: applications.length }
    }
    const deltas: number[] = []
    for (const app of applications) {
      // Routed through the same trust filter as stagesOccupied, so a rapid
      // pass-through discarded from the funnel doesn't still drag this
      // average toward zero.
      const entries = trustedEntries(app, historyByApp).filter((entry) => entry.stage === stage)
      if (entries.length > 0) {
        deltas.push(daysBetween(app.created_at, entries[0].entered_at))
      } else if (STAGE_ORDER.indexOf(app.current_stage) === idx) {
        // Legacy fallback: a row created directly into this stage *before* we
        // started recording an initial stage_history row (see
        // useApplications.createApplication) has no entry for it, so treat it
        // as reached at day zero rather than "unreached." New rows hit the
        // branch above instead, via their recorded initial entry.
        deltas.push(0)
      }
    }
    const avg = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null
    return { stage, label: STAGE_LABELS[stage], avgDaysToReach: avg, sampleSize: deltas.length }
  })
}

export interface SegmentCount {
  value: string
  label: string
  count: number
}

export function computeWorkModeSplit(applications: Application[], workModes: { value: string; label: string }[]): SegmentCount[] {
  return workModes.map((mode) => ({
    value: mode.value,
    label: mode.label,
    count: applications.filter((app) => app.work_mode === mode.value).length,
  }))
}

export function computeEmploymentTypeSplit(
  applications: Application[],
  employmentTypes: { value: string; label: string }[],
): SegmentCount[] {
  return employmentTypes.map((type) => ({
    value: type.value,
    label: type.label,
    count: applications.filter((app) => app.employment_type === type.value).length,
  }))
}

export interface SegmentResponseRate {
  value: string
  label: string
  total: number
  responded: number
  rate: number | null
}

// "Got a response" = reached Interview or beyond, or was archived for a
// reason other than no_response (accepted/rejected/withdrawn all imply the
// employer said something back). Still-active apps stuck at Eyes on/Applied,
// and anything explicitly archived as no_response, count as no response yet.
function gotResponse(app: Application, historyByApp: Map<string, StageHistoryEntry[]>): boolean {
  if (furthestStageIndex(app, historyByApp) >= STAGE_ORDER.indexOf('interview')) return true
  return app.is_archived && app.archive_reason !== 'no_response'
}

export function computeResponseRateBySegment(
  applications: Application[],
  stageHistory: StageHistoryEntry[],
  field: 'work_mode' | 'employment_type',
  options: { value: string; label: string }[],
): SegmentResponseRate[] {
  const historyByApp = groupHistoryByApplication(stageHistory)
  return options.map((option) => {
    const inSegment = applications.filter((app) => app[field] === option.value)
    const responded = inSegment.filter((app) => gotResponse(app, historyByApp)).length
    return {
      value: option.value,
      label: option.label,
      total: inSegment.length,
      responded,
      rate: inSegment.length > 0 ? (responded / inSegment.length) * 100 : null,
    }
  })
}

export interface TrackerComparison {
  trackerId: string
  name: string
  total: number
  interviewRate: number | null
}

export function computeTrackerComparison(
  applications: Application[],
  stageHistory: StageHistoryEntry[],
  trackers: Tracker[],
): TrackerComparison[] {
  const historyByApp = groupHistoryByApplication(stageHistory)
  return trackers.map((tracker) => {
    const apps = applications.filter((app) => app.tracker_id === tracker.id)
    const reachedInterview = apps.filter(
      (app) => furthestStageIndex(app, historyByApp) >= STAGE_ORDER.indexOf('interview'),
    ).length
    return {
      trackerId: tracker.id,
      name: tracker.name,
      total: apps.length,
      interviewRate: apps.length > 0 ? (reachedInterview / apps.length) * 100 : null,
    }
  })
}

export interface InsightsKpis {
  total: number
  active: number
  interviewRate: number | null
  offerRate: number | null
}

export function computeKpis(applications: Application[], stageHistory: StageHistoryEntry[]): InsightsKpis {
  const historyByApp = groupHistoryByApplication(stageHistory)
  const total = applications.length
  const active = applications.filter((app) => !app.is_archived).length
  const reachedInterview = applications.filter(
    (app) => furthestStageIndex(app, historyByApp) >= STAGE_ORDER.indexOf('interview'),
  ).length
  const reachedOffer = applications.filter(
    (app) => furthestStageIndex(app, historyByApp) >= STAGE_ORDER.indexOf('offer'),
  ).length
  return {
    total,
    active,
    interviewRate: total > 0 ? (reachedInterview / total) * 100 : null,
    offerRate: total > 0 ? (reachedOffer / total) * 100 : null,
  }
}
