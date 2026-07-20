import { useCallback, useEffect, useState } from 'react'
import { getAllTrackers, putTracker, deleteTracker, backfillDefaultTracker, pruneRemovedTrackers } from '../lib/localStore'
import { getAllRemoteTrackers, putRemoteTracker, deleteRemoteTracker } from '../lib/remoteStore'
import type { Tracker } from '../types/application'

export function useTrackers(userId: string | null) {
  const [trackers, setTrackers] = useState<Tracker[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    let list: Tracker[]
    if (userId) {
      try {
        list = await getAllRemoteTrackers(userId)
        await Promise.all(list.map((t) => putTracker(t)))
        // Evict local trackers this user owns that are gone remotely (see
        // the same eviction in useApplications).
        await pruneRemovedTrackers(userId, new Set(list.map((t) => t.id)))
      } catch (err) {
        console.warn('Falling back to local tracker cache -- could not reach Supabase.', err)
        const cached = await getAllTrackers()
        list = cached.filter((t) => t.user_id === userId)
      }
    } else {
      // backfillDefaultTracker only creates a tracker if pre-existing guest
      // applications are missing a tracker_id -- it does NOT auto-create a
      // tracker for a brand-new guest with zero data. An empty list here is
      // a legitimate state; the user creates their first tracker explicitly.
      await backfillDefaultTracker()
      list = await getAllTrackers()
    }

    setTrackers(list)
  }, [userId])

  useEffect(() => {
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const createTracker = useCallback(
    async (name: string) => {
      const now = new Date().toISOString()
      const tracker: Tracker = {
        id: crypto.randomUUID(),
        user_id: userId,
        name: name.trim() || 'Untitled',
        created_at: now,
        updated_at: now,
      }
      if (userId) await putRemoteTracker(tracker)
      await putTracker(tracker)
      await refresh()
      return tracker
    },
    [userId, refresh],
  )

  const renameTracker = useCallback(
    async (id: string, name: string) => {
      const existing = trackers.find((t) => t.id === id)
      if (!existing) return
      const trimmed = name.trim()
      if (!trimmed || trimmed === existing.name) return
      const updated: Tracker = { ...existing, name: trimmed, updated_at: new Date().toISOString() }
      if (userId) await putRemoteTracker(updated)
      await putTracker(updated)
      await refresh()
    },
    [trackers, userId, refresh],
  )

  const removeTracker = useCallback(
    async (id: string) => {
      if (userId) await deleteRemoteTracker(id)
      await deleteTracker(id)
      await refresh()
    },
    [userId, refresh],
  )

  return { trackers, loading, createTracker, renameTracker, removeTracker, refresh }
}
