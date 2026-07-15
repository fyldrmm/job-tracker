import { getDB } from './db'
import type { Application, StageHistoryEntry } from '../types/application'

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

export async function addStageHistoryEntry(entry: StageHistoryEntry): Promise<void> {
  const db = await getDB()
  await db.put('stage_history', entry)
}
