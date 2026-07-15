import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Application, StageHistoryEntry } from '../types/application'

interface JobTrackerDB extends DBSchema {
  applications: {
    key: string
    value: Application
    indexes: { 'by-current_stage': string }
  }
  stage_history: {
    key: string
    value: StageHistoryEntry
    indexes: { 'by-application_id': string }
  }
}

const DB_NAME = 'job-tracker'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<JobTrackerDB>> | null = null

export function getDB(): Promise<IDBPDatabase<JobTrackerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JobTrackerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const applications = db.createObjectStore('applications', { keyPath: 'id' })
        applications.createIndex('by-current_stage', 'current_stage')

        const stageHistory = db.createObjectStore('stage_history', { keyPath: 'id' })
        stageHistory.createIndex('by-application_id', 'application_id')
      },
    })
  }
  return dbPromise
}
