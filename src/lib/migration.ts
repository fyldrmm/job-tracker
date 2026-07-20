import { supabase } from './supabase'
import {
  getAllApplications,
  getAllStageHistory,
  getAllTrackers,
  backfillDefaultTracker,
  claimLocalGuestDataForUser,
} from './localStore'

const PENDING_SIGNUP_KEY = 'job-tracker:pending-signup'

// Marks that the next session established in this browser is expected to
// come from a fresh account, not a log-in -- set right after a successful
// signUp() call, and survives the email-confirmation round trip since it's
// the browser (not the in-memory session) that needs to remember it. Used
// to decide whether migration should run automatically (sign-up) or ask
// first (log-in into an existing account that happens to find local guest
// data -- see the migration prompt in Board.tsx).
export function markPendingSignup(): void {
  localStorage.setItem(PENDING_SIGNUP_KEY, 'true')
}

// Reads and clears the flag in one step so it's only ever consumed once.
export function consumePendingSignup(): boolean {
  const pending = localStorage.getItem(PENDING_SIGNUP_KEY) === 'true'
  localStorage.removeItem(PENDING_SIGNUP_KEY)
  return pending
}

/**
 * Uploads local guest data (trackers/applications with no user_id) into a
 * signed-in account, then re-stamps those same local rows with the real
 * user_id so they stop looking like unclaimed guest data. Upserts by
 * primary key, so it's safe to call more than once. Trackers must be
 * uploaded before applications, since applications.tracker_id is a foreign
 * key. Callers are expected to have already checked hasAnyLocalGuestData().
 */
export async function migrateGuestDataToAccount(userId: string): Promise<void> {
  await backfillDefaultTracker()

  const [allTrackers, allApplications, allStageHistory] = await Promise.all([
    getAllTrackers(),
    getAllApplications(),
    getAllStageHistory(),
  ])

  const guestTrackers = allTrackers.filter((t) => t.user_id === null)
  const guestApplications = allApplications.filter((app) => app.user_id === null)
  const guestApplicationIds = new Set(guestApplications.map((app) => app.id))
  const guestStageHistory = allStageHistory.filter((entry) => guestApplicationIds.has(entry.application_id))

  if (guestTrackers.length > 0) {
    const stampedTrackers = guestTrackers.map((t) => ({ ...t, user_id: userId }))
    const { error } = await supabase.from('trackers').upsert(stampedTrackers)
    if (error) throw error
  }

  if (guestApplications.length > 0) {
    const stampedApplications = guestApplications.map((app) => ({ ...app, user_id: userId }))
    const { error } = await supabase.from('applications').upsert(stampedApplications)
    if (error) throw error
  }

  if (guestStageHistory.length > 0) {
    const { error } = await supabase.from('stage_history').upsert(guestStageHistory)
    if (error) throw error
  }

  await claimLocalGuestDataForUser(userId)
}
