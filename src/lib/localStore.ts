import { getDB } from './db'
import type { Application, Interview, StageHistoryEntry, Tracker } from '../types/application'

export async function getAllApplications(): Promise<Application[]> {
  const db = await getDB()
  return db.getAll('applications')
}

export async function putApplication(application: Application): Promise<void> {
  const db = await getDB()
  await db.put('applications', application)
}

// Mirrors the remote FK cascades: stage_history and interviews both hang off
// applications (0001_init.sql / 0013_interviews.sql), so deleting the parent
// locally has to take both with it -- otherwise orphaned rows accumulate in
// IndexedDB and a re-created application id could inherit a stranger's rounds.
export async function deleteApplication(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['applications', 'stage_history', 'interviews'], 'readwrite')
  await tx.objectStore('applications').delete(id)
  const historyIndex = tx.objectStore('stage_history').index('by-application_id')
  for await (const cursor of historyIndex.iterate(id)) {
    await cursor.delete()
  }
  const interviewIndex = tx.objectStore('interviews').index('by-application_id')
  for await (const cursor of interviewIndex.iterate(id)) {
    await cursor.delete()
  }
  await tx.done
}

export async function getAllStageHistory(): Promise<StageHistoryEntry[]> {
  const db = await getDB()
  return db.getAll('stage_history')
}

// After a successful remote read, drop this user's locally-cached
// applications that no longer exist remotely (deleted on another
// device/session) -- otherwise the offline-read fallback could resurrect
// them. Reuses deleteApplication so stage_history cascades too. Only
// touches rows owned by userId, never guest rows (user_id === null).
export async function pruneRemovedApplications(userId: string, keepIds: Set<string>): Promise<void> {
  const stale = (await getAllApplications()).filter((app) => app.user_id === userId && !keepIds.has(app.id))
  for (const app of stale) {
    await deleteApplication(app.id)
  }
}

// Same idea for trackers. deleteTracker cascades to its applications and
// their stage_history locally.
export async function pruneRemovedTrackers(userId: string, keepIds: Set<string>): Promise<void> {
  const stale = (await getAllTrackers()).filter((t) => t.user_id === userId && !keepIds.has(t.id))
  for (const tracker of stale) {
    await deleteTracker(tracker.id)
  }
}

export async function addStageHistoryEntry(entry: StageHistoryEntry): Promise<void> {
  const db = await getDB()
  await db.put('stage_history', entry)
}

export async function getAllInterviews(): Promise<Interview[]> {
  const db = await getDB()
  return db.getAll('interviews')
}

export async function putInterview(interview: Interview): Promise<void> {
  const db = await getDB()
  await db.put('interviews', interview)
}

export async function deleteInterview(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('interviews', id)
}

// After a successful remote read, drop locally-cached interviews that no
// longer exist remotely -- same reasoning as pruneRemovedApplications. Scoped
// by application id rather than user_id because interviews (like
// stage_history) carry no user_id of their own; the caller passes the ids it
// just read for this user.
export async function pruneRemovedInterviews(
  applicationIds: Set<string>,
  keepIds: Set<string>,
): Promise<void> {
  const db = await getDB()
  const stale = (await db.getAll('interviews')).filter(
    (i) => applicationIds.has(i.application_id) && !keepIds.has(i.id),
  )
  for (const interview of stale) {
    await db.delete('interviews', interview.id)
  }
}

// Used after account deletion -- the local cache would otherwise still
// show a signed-out guest the now-deleted account's mirrored data.
export async function clearLocalStore(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['applications', 'stage_history', 'trackers', 'interviews'], 'readwrite')
  await tx.objectStore('applications').clear()
  await tx.objectStore('stage_history').clear()
  await tx.objectStore('trackers').clear()
  await tx.objectStore('interviews').clear()
  await tx.done
}

export async function getAllTrackers(): Promise<Tracker[]> {
  const db = await getDB()
  return db.getAll('trackers')
}

export async function putTracker(tracker: Tracker): Promise<void> {
  const db = await getDB()
  await db.put('trackers', tracker)
}

export async function deleteTracker(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['trackers', 'applications', 'stage_history', 'interviews'], 'readwrite')
  await tx.objectStore('trackers').delete(id)

  const appStore = tx.objectStore('applications')
  const appIndex = appStore.index('by-tracker_id')
  const historyStore = tx.objectStore('stage_history')
  const historyIndex = historyStore.index('by-application_id')
  const interviewIndex = tx.objectStore('interviews').index('by-application_id')
  for await (const cursor of appIndex.iterate(id)) {
    for await (const historyCursor of historyIndex.iterate(cursor.value.id)) {
      await historyCursor.delete()
    }
    for await (const interviewCursor of interviewIndex.iterate(cursor.value.id)) {
      await interviewCursor.delete()
    }
    await cursor.delete()
  }
  await tx.done
}

// Whether this browser currently holds any unclaimed guest data (trackers
// or applications with no user_id). Used to decide whether a newly-active
// session should trigger a migration prompt -- checked live rather than
// via a persisted flag, so it can't desync from clearLocalStore() the way
// a one-time "already migrated" flag could.
export async function hasAnyLocalGuestData(): Promise<boolean> {
  const db = await getDB()
  const [trackers, applications] = await Promise.all([db.getAll('trackers'), db.getAll('applications')])
  return trackers.some((t) => t.user_id === null) || applications.some((a) => a.user_id === null)
}

// Re-stamps every local guest row (trackers/applications with no user_id)
// with the given user_id, mirroring what migrateGuestDataToAccount just
// uploaded to Supabase. Without this, the local copies would keep looking
// like unclaimed guest data forever, since migration only used to stamp
// the remote copies.
export async function claimLocalGuestDataForUser(userId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['trackers', 'applications'], 'readwrite')
  const trackerStore = tx.objectStore('trackers')
  for (const tracker of await trackerStore.getAll()) {
    if (tracker.user_id === null) await trackerStore.put({ ...tracker, user_id: userId })
  }
  const appStore = tx.objectStore('applications')
  for (const app of await appStore.getAll()) {
    if (app.user_id === null) await appStore.put({ ...app, user_id: userId })
  }
  await tx.done
}

/**
 * Guest data created before trackers existed has no tracker_id. Creates a
 * default tracker and backfills every orphaned application onto it --
 * mirrors the same one-time backfill the Supabase migration does for
 * existing signed-in users.
 */
export async function backfillDefaultTracker(): Promise<void> {
  const db = await getDB()
  const orphaned = (await db.getAll('applications')).filter((app) => !app.tracker_id)
  if (orphaned.length === 0) return

  const now = new Date().toISOString()
  const defaultTracker: Tracker = {
    id: crypto.randomUUID(),
    user_id: null,
    name: 'My Applications',
    created_at: now,
    updated_at: now,
  }

  const tx = db.transaction(['applications', 'trackers'], 'readwrite')
  await tx.objectStore('trackers').put(defaultTracker)
  for (const app of orphaned) {
    await tx.objectStore('applications').put({ ...app, tracker_id: defaultTracker.id })
  }
  await tx.done
}
