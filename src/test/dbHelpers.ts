import { getDB } from '../lib/db'

// Empties every store on the shared IndexedDB connection between tests.
// Deliberately NOT deleting/reopening the database (via
// indexedDB.deleteDatabase) -- the app never closes its IDBDatabase
// connection (by design, it's a long-lived singleton), so a delete would
// just hang waiting for a connection that's never going to close.
// Clearing the stores in place sidesteps that entirely.
export async function resetIndexedDb(): Promise<void> {
  const db = await getDB()
  await Promise.all([db.clear('applications'), db.clear('stage_history'), db.clear('trackers')])
}
