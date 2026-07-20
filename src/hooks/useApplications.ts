import { useCallback, useEffect, useState } from 'react'
import {
  addStageHistoryEntry,
  deleteApplication as deleteLocalApplication,
  getAllApplications,
  pruneRemovedApplications,
  putApplication,
} from '../lib/localStore'
import {
  addRemoteStageHistoryEntry,
  deleteRemoteApplication,
  getAllRemoteApplications,
  putRemoteApplication,
} from '../lib/remoteStore'
import { byCreatedAt } from '../lib/sort'
import type {
  Application,
  ApplicationStage,
  ArchiveReason,
  EmploymentType,
  StageHistoryEntry,
  WorkMode,
} from '../types/application'

export interface ApplicationInput {
  company: string
  role_title: string
  job_link: string | null
  date_applied: string
  current_stage: ApplicationStage
  salary_range: string | null
  location: string | null
  employment_type: EmploymentType | null
  work_mode: WorkMode | null
  notes: string | null
}

// Signed-in: Supabase is the source of truth, mirrored into IndexedDB as a
// write-through cache (so reads can fall back to it if offline). Guest:
// IndexedDB only, unchanged from pre-M5 behavior. Writes always require
// being online while signed in -- no offline write queue/sync.
async function persistApplication(application: Application, userId: string | null): Promise<void> {
  if (userId) {
    await putRemoteApplication(application)
  }
  await putApplication(application)
}

async function persistStageHistoryEntry(entry: StageHistoryEntry, userId: string | null): Promise<void> {
  if (userId) {
    await addRemoteStageHistoryEntry(entry)
  }
  await addStageHistoryEntry(entry)
}

export function useApplications(userId: string | null) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (userId) {
      try {
        const remote = await getAllRemoteApplications(userId)
        setApplications(remote)
        await Promise.all(remote.map((app) => putApplication(app)))
        // Evict local rows this user owns that are gone remotely, so the
        // offline-read fallback can't resurrect remotely-deleted data.
        await pruneRemovedApplications(userId, new Set(remote.map((app) => app.id)))
        return
      } catch (err) {
        console.warn('Falling back to local cache -- could not reach Supabase.', err)
        const cached = await getAllApplications()
        setApplications(cached.filter((app) => app.user_id === userId).sort(byCreatedAt))
        return
      }
    }
    const local = await getAllApplications()
    setApplications(local.sort(byCreatedAt))
  }, [userId])

  useEffect(() => {
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const createApplication = useCallback(
    async (input: ApplicationInput, trackerId: string) => {
      const now = new Date().toISOString()
      const application: Application = {
        id: crypto.randomUUID(),
        user_id: userId,
        tracker_id: trackerId,
        ...input,
        is_archived: false,
        archive_reason: null,
        archived_at: null,
        created_at: now,
        updated_at: now,
      }
      await persistApplication(application, userId)
      await refresh()
    },
    [userId, refresh],
  )

  const updateApplication = useCallback(
    async (id: string, input: ApplicationInput) => {
      const existing = applications.find((app) => app.id === id)
      if (!existing) return
      const updated: Application = {
        ...existing,
        ...input,
        updated_at: new Date().toISOString(),
      }
      await persistApplication(updated, userId)
      await refresh()
    },
    [applications, userId, refresh],
  )

  const moveApplicationStage = useCallback(
    async (id: string, newStage: ApplicationStage) => {
      const existing = applications.find((app) => app.id === id)
      if (!existing || existing.current_stage === newStage) return
      const now = new Date().toISOString()
      const updated: Application = { ...existing, current_stage: newStage, updated_at: now }
      // Optimistic: reflect the move in state immediately, in the same tick
      // as the drop, so the card lands in its new column before the drag
      // overlay/opacity teardown even renders. Without this, the card
      // briefly flashes back into its old column while the write (and the
      // refresh() that would otherwise be the only thing updating state) is
      // still in flight -- visible as a glitch on drop.
      setApplications((prev) => prev.map((app) => (app.id === id ? updated : app)))
      try {
        await persistApplication(updated, userId)
        await persistStageHistoryEntry(
          { id: crypto.randomUUID(), application_id: id, stage: newStage, entered_at: now },
          userId,
        )
        await refresh()
      } catch (err) {
        // The write didn't actually happen -- revert the optimistic move so
        // the UI stops claiming a stage change that never saved.
        setApplications((prev) => prev.map((app) => (app.id === id ? existing : app)))
        throw err
      }
    },
    [applications, userId, refresh],
  )

  const archiveApplication = useCallback(
    async (id: string, reason: ArchiveReason = 'rejected') => {
      const existing = applications.find((app) => app.id === id)
      if (!existing || existing.is_archived) return
      const now = new Date().toISOString()
      const updated: Application = {
        ...existing,
        is_archived: true,
        archive_reason: reason,
        archived_at: now,
        updated_at: now,
      }
      await persistApplication(updated, userId)
      await refresh()
    },
    [applications, userId, refresh],
  )

  const unarchiveApplication = useCallback(
    async (id: string) => {
      const existing = applications.find((app) => app.id === id)
      if (!existing || !existing.is_archived) return
      const updated: Application = {
        ...existing,
        is_archived: false,
        archive_reason: null,
        archived_at: null,
        updated_at: new Date().toISOString(),
      }
      await persistApplication(updated, userId)
      await refresh()
    },
    [applications, userId, refresh],
  )

  // Permanent -- no undo. Only reachable for already-archived applications
  // (see the Delete UI), so this is deliberately not gated on is_archived
  // here the way archive/unarchive are; the caller decides when it's valid.
  const deleteApplication = useCallback(
    async (id: string) => {
      if (userId) {
        await deleteRemoteApplication(id)
      }
      await deleteLocalApplication(id)
      await refresh()
    },
    [userId, refresh],
  )

  return {
    applications,
    loading,
    createApplication,
    updateApplication,
    moveApplicationStage,
    archiveApplication,
    unarchiveApplication,
    deleteApplication,
    refresh,
  }
}
