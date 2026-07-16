import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Application, StageHistoryEntry, Tracker } from '../types/application'

interface JobTrackerDB extends DBSchema {
  applications: {
    key: string
    value: Application
    indexes: { 'by-current_stage': string; 'by-tracker_id': string }
  }
  stage_history: {
    key: string
    value: StageHistoryEntry
    indexes: { 'by-application_id': string }
  }
  trackers: {
    key: string
    value: Tracker
  }
}

const DB_NAME = 'job-tracker'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<JobTrackerDB>> | null = null

export function getDB(): Promise<IDBPDatabase<JobTrackerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JobTrackerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const applications = db.createObjectStore('applications', { keyPath: 'id' })
          applications.createIndex('by-current_stage', 'current_stage')

          const stageHistory = db.createObjectStore('stage_history', { keyPath: 'id' })
          stageHistory.createIndex('by-application_id', 'application_id')
        }
        if (oldVersion < 2) {
          db.createObjectStore('trackers', { keyPath: 'id' })
          tx.objectStore('applications').createIndex('by-tracker_id', 'tracker_id')
        }
      },
    })
  }
  return dbPromise
}
