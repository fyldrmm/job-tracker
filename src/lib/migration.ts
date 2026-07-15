import { supabase } from './supabase'
import { getAllApplications, getAllStageHistory } from './localStore'

const MIGRATED_FLAG_PREFIX = 'job-tracker:migrated-for-user:'

export function hasMigrated(userId: string): boolean {
  return localStorage.getItem(MIGRATED_FLAG_PREFIX + userId) === 'true'
}

function markMigrated(userId: string): void {
  localStorage.setItem(MIGRATED_FLAG_PREFIX + userId, 'true')
}

/**
 * Uploads all local guest data into a newly signed-in account. Upserts by
 * primary key, so it's safe to call more than once for the same user (the
 * MVP assumption -- per the brief -- is a brand-new account starts empty,
 * so this is a one-way upload, not a merge).
 */
export async function migrateGuestDataToAccount(userId: string): Promise<void> {
  if (hasMigrated(userId)) return

  const [applications, stageHistory] = await Promise.all([getAllApplications(), getAllStageHistory()])

  if (applications.length > 0) {
    const stampedApplications = applications.map((app) => ({ ...app, user_id: userId }))
    const { error } = await supabase.from('applications').upsert(stampedApplications)
    if (error) throw error
  }

  if (stageHistory.length > 0) {
    const { error } = await supabase.from('stage_history').upsert(stageHistory)
    if (error) throw error
  }

  markMigrated(userId)
}
