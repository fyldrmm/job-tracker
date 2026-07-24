import { supabase } from './supabase'
import {
  getAllApplications,
  getAllInterviews,
  getAllStageHistory,
  getAllTrackers,
  backfillDefaultTracker,
  claimLocalGuestDataForUser,
} from './localStore'

const PENDING_SIGNUP_KEY = 'job-tracker:pending-signup'

// A signup can legitimately take days to confirm by email; this only
// guards against the SAME instant a signUp() call resolves for an
// already-registered address (see consumePendingSignup below), not
// against a slow confirmation.
const CREATED_AT_SLACK_MS = 5 * 60 * 1000

interface PendingSignup {
  email: string
  at: number
}

// Marks that the next session established in this browser is expected to
// come from a fresh account, not a log-in -- set right after a successful
// signUp() call, and survives the email-confirmation round trip since it's
// the browser (not the in-memory session) that needs to remember it. Used
// to decide whether migration should run automatically (sign-up) or ask
// first (log-in into an existing account that happens to find local guest
// data -- see the migration prompt in Board.tsx).
//
// Stores {email, at} rather than a bare flag, and consumePendingSignup
// below validates both against the arriving session, because Supabase's
// signUp() returns success (no error) even when the email is ALREADY
// REGISTERED -- anti-enumeration, so it can't reveal which emails have
// accounts. In that case no account is created and no session ever
// arrives, so a bare flag would sit in localStorage forever and silently
// auto-migrate guest data into whatever DIFFERENT account next signs in
// on this browser, with no prompt -- AUDIT.md M6 reproduced through a
// path the original M6 fix didn't cover. Email normalized (trim +
// lowercase) since Supabase lowercases addresses too.
export function markPendingSignup(email: string): void {
  const payload: PendingSignup = { email: email.trim().toLowerCase(), at: Date.now() }
  localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(payload))
}

// Reads and ALWAYS clears the flag (one-shot, regardless of validity) --
// a flag left by a signup that never produced a session must not survive
// to mislabel some later, unrelated session as "from this signup". Only
// returns true if the arriving user genuinely looks like the one that
// signup created: same email, and created no earlier than the recorded
// signup attempt (minus a small clock-skew allowance). A fast client
// clock only ever pushes this toward returning false -- i.e. toward the
// migration PROMPT, never toward a silent merge. Legacy bare-'true'
// values (from before this validation existed) fail JSON.parse into an
// object with a string email, so they safely resolve to false too.
export function consumePendingSignup(user: { email?: string; created_at: string }): boolean {
  const raw = localStorage.getItem(PENDING_SIGNUP_KEY)
  localStorage.removeItem(PENDING_SIGNUP_KEY)
  if (!raw) return false

  let stored: PendingSignup
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as PendingSignup).email !== 'string' ||
      typeof (parsed as PendingSignup).at !== 'number'
    ) {
      return false
    }
    stored = parsed as PendingSignup
  } catch {
    return false
  }

  if (!user.email || user.email.toLowerCase() !== stored.email) return false
  const createdAtMs = Date.parse(user.created_at)
  if (Number.isNaN(createdAtMs)) return false
  return createdAtMs >= stored.at - CREATED_AT_SLACK_MS
}

/**
 * Uploads local guest data (trackers/applications with no user_id, plus
 * their stage_history/interviews rows, which carry no user_id of their own)
 * into a signed-in account, then re-stamps the local trackers/applications
 * with the real user_id so they stop looking like unclaimed guest data.
 * Upserts by primary key, so it's safe to call more than once. Trackers must
 * be uploaded before applications, since applications.tracker_id is a
 * foreign key. Callers are expected to have already checked
 * hasAnyLocalGuestData().
 */
// Diagnostic-only: the migration-race investigation (2026-07-23/24, see
// PLAN-ARCHIVE.md's M13 entry and HANDOFF.md) found migration failing once
// then succeeding on a bare retry, with the real Postgres/PostgREST error
// never captured -- the generic toast in Board.tsx's catch block is all
// that's shown to the user. This logs the actual error PLUS whether the
// client-side session looks hydrated at the moment of failure, straight to
// the console, so the next time this happens (live, no special repro
// needed) the detail needed to confirm or rule out the leading
// session-hydration-race theory is sitting in the browser console instead
// of lost to history. Does not change control flow -- the error is still
// re-thrown unchanged right after.
async function logMigrationFailure(table: string, error: unknown): Promise<void> {
  const { data } = await supabase.auth.getSession()
  console.error(`[migration] ${table} upsert failed`, {
    error,
    hasSession: !!data.session,
    sessionUserId: data.session?.user.id ?? null,
    accessTokenExpiresAt: data.session?.expires_at ?? null,
  })
}

export async function migrateGuestDataToAccount(userId: string): Promise<void> {
  await backfillDefaultTracker()

  const [allTrackers, allApplications, allStageHistory, allInterviews] = await Promise.all([
    getAllTrackers(),
    getAllApplications(),
    getAllStageHistory(),
    getAllInterviews(),
  ])

  const guestTrackers = allTrackers.filter((t) => t.user_id === null)
  const guestApplications = allApplications.filter((app) => app.user_id === null)
  const guestApplicationIds = new Set(guestApplications.map((app) => app.id))
  const guestStageHistory = allStageHistory.filter((entry) => guestApplicationIds.has(entry.application_id))
  // Like stage_history, interviews carry no user_id of their own -- "guest"
  // here means "belongs to a guest application", the same test stage_history
  // uses.
  const guestInterviews = allInterviews.filter((interview) => guestApplicationIds.has(interview.application_id))

  if (guestTrackers.length > 0) {
    const stampedTrackers = guestTrackers.map((t) => ({ ...t, user_id: userId }))
    const { error } = await supabase.from('trackers').upsert(stampedTrackers)
    if (error) {
      await logMigrationFailure('trackers', error)
      throw error
    }
  }

  if (guestApplications.length > 0) {
    const stampedApplications = guestApplications.map((app) => ({ ...app, user_id: userId }))
    const { error } = await supabase.from('applications').upsert(stampedApplications)
    if (error) {
      await logMigrationFailure('applications', error)
      throw error
    }
  }

  if (guestStageHistory.length > 0) {
    // ignoreDuplicates -> ON CONFLICT DO NOTHING, which needs only the
    // INSERT policy (stage_history has no UPDATE policy -- see 0001_init).
    // stage_history is append-only, so on a retry after a partial failure
    // there's nothing to update anyway; skipping already-inserted rows is
    // correct and avoids a permanent RLS-violation loop.
    const { error } = await supabase.from('stage_history').upsert(guestStageHistory, { ignoreDuplicates: true })
    if (error) {
      await logMigrationFailure('stage_history', error)
      throw error
    }
  }

  if (guestInterviews.length > 0) {
    // Unlike stage_history, interviews has a real UPDATE policy (0013_
    // interviews.sql), so a plain upsert -- not ignoreDuplicates -- is both
    // safe on retry and correct if a round was edited between attempts.
    const { error } = await supabase.from('interviews').upsert(guestInterviews)
    if (error) {
      await logMigrationFailure('interviews', error)
      throw error
    }
  }

  await claimLocalGuestDataForUser(userId)
}
