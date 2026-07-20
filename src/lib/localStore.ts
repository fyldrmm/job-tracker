import { getDB } from './db'
import type { Application, StageHistoryEntry, Tracker } from '../types/application'

export async function getAllApplications(): Promise<Application[]> {
  const db = await getDB()
  return db.getAll('applications')
}

export async function putApplication(application: Application): Promise<void> {
  const db = await getDB()
  await db.put('applications', application)
}

export async function deleteApplication(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['applications', 'stage_history'], 'readwrite')
  await tx.objectStore('applications').delete(id)
  const historyStore = tx.objectStore('stage_history')
  const historyIndex = historyStore.index('by-application_id')
  for await (const cursor of historyIndex.iterate(id)) {
    await cursor.delete()
  }
  await tx.done
}

export async function getStageHistory(applicationId: string): Promise<StageHistoryEntry[]> {
  const db = await getDB()
  return db.getAllFromIndex('stage_history', 'by-application_id', applicationId)
}

export async function getAllStageHistory(): Promise<StageHistoryEntry[]> {
  const db = await getDB()
  return db.getAll('stage_history')
}

export async function addStageHistoryEntry(entry: StageHistoryEntry): Promise<void> {
  const db = await getDB()
  await db.put('stage_history', entry)
}

// Used after account deletion -- the local cache would otherwise still
// show a signed-out guest the now-deleted account's mirrored data.
export async function clearLocalStore(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['applications', 'stage_history', 'trackers'], 'readwrite')
  await tx.objectStore('applications').clear()
  await tx.objectStore('stage_history').clear()
  await tx.objectStore('trackers').clear()
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
  const tx = db.transaction(['trackers', 'applications', 'stage_history'], 'readwrite')
  await tx.objectStore('trackers').delete(id)

  const appStore = tx.objectStore('applications')
  const appIndex = appStore.index('by-tracker_id')
  const historyStore = tx.objectStore('stage_history')
  const historyIndex = historyStore.index('by-application_id')
  for await (const cursor of appIndex.iterate(id)) {
    for await (const historyCursor of historyIndex.iterate(cursor.value.id)) {
      await historyCursor.delete()
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
