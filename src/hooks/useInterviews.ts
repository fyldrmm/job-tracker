import { useCallback, useEffect, useState } from 'react'
import {
  deleteInterview as deleteLocalInterview,
  getAllApplications,
  getAllInterviews,
  pruneRemovedInterviews,
  putInterview,
} from '../lib/localStore'
import { deleteRemoteInterview, getAllRemoteInterviews, putRemoteInterview } from '../lib/remoteStore'
import { byScheduledAt, interviewsForApplication, nextRoundNumber } from '../lib/interviews'
import type { Interview } from '../types/application'

// The fields the user actually fills in. round/id/timestamps are derived --
// see scheduleInterview.
export interface InterviewInput {
  scheduled_at: string
  duration_minutes: number
  is_remote: boolean
  location: string | null
  notes: string | null
}

// Same write-through model as useApplications: signed in, Supabase is the
// source of truth and IndexedDB is a read-fallback cache; guest, IndexedDB
// only. Deliberately NOT modeled on useStageHistory -- that hook is read-only
// because history is only ever appended to from useApplications, whereas
// interviews are created, edited and deleted directly from the UI.
async function persistInterview(interview: Interview, userId: string | null): Promise<void> {
  if (userId) {
    await putRemoteInterview(interview)
  }
  await putInterview(interview)
}

export function useInterviews(userId: string | null) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (userId) {
      try {
        const remote = await getAllRemoteInterviews()
        setInterviews(remote)
        await Promise.all(remote.map((interview) => putInterview(interview)))
        // Evict locally-cached interviews whose remote row is gone (deleted on
        // another device), so the offline-read fallback can't resurrect them.
        // Scoped to this user's applications: interviews carry no user_id of
        // their own, and guest rows must survive untouched.
        const ownedAppIds = new Set(
          (await getAllApplications()).filter((app) => app.user_id === userId).map((app) => app.id),
        )
        await pruneRemovedInterviews(ownedAppIds, new Set(remote.map((interview) => interview.id)))
        return
      } catch (err) {
        console.warn('Falling back to local interviews cache -- could not reach Supabase.', err)
        setInterviews((await getAllInterviews()).sort(byScheduledAt))
        return
      }
    }
    setInterviews((await getAllInterviews()).sort(byScheduledAt))
  }, [userId])

  useEffect(() => {
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [refresh])

  // Creating a row IS the act of scheduling -- there is no "unscheduled
  // interview" record. Skipping the prompt simply never calls this, which is
  // what keeps undated interviews out of the calendar export by construction.
  const scheduleInterview = useCallback(
    async (applicationId: string, input: InterviewInput) => {
      const now = new Date().toISOString()
      // Round is derived from the persisted store, NOT from the `interviews`
      // state above: state is stale within a single tick, so two schedules in
      // the same tick -- which is exactly what the per-card "Save & next"
      // queue does when the user moves fast -- would both compute the same
      // round and collide on the unique (application_id, round) index.
      const persisted = await getAllInterviews()
      const interview: Interview = {
        id: crypto.randomUUID(),
        application_id: applicationId,
        round: nextRoundNumber(interviewsForApplication(persisted, applicationId)),
        ...input,
        created_at: now,
        updated_at: now,
      }
      await persistInterview(interview, userId)
      await refresh()
      return interview
    },
    [userId, refresh],
  )

  const updateInterview = useCallback(
    async (id: string, input: InterviewInput) => {
      const existing = interviews.find((interview) => interview.id === id)
      if (!existing) return
      const updated: Interview = { ...existing, ...input, updated_at: new Date().toISOString() }
      await persistInterview(updated, userId)
      await refresh()
    },
    [interviews, userId, refresh],
  )

  // Round numbers are deliberately not renumbered after a delete: an .ics
  // already exported as "Round 2" should keep meaning the same interview, and
  // nextRoundNumber() derives from max(round) precisely so a gap is harmless.
  const removeInterview = useCallback(
    async (id: string) => {
      if (userId) {
        await deleteRemoteInterview(id)
      }
      await deleteLocalInterview(id)
      await refresh()
    },
    [userId, refresh],
  )

  return { interviews, loading, scheduleInterview, updateInterview, removeInterview, refresh }
}
