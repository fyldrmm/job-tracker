import { useCallback, useEffect, useRef, useState } from 'react'
import { getAllTrackers, putTracker, deleteTracker, backfillDefaultTracker } from '../lib/localStore'
import { getAllRemoteTrackers, putRemoteTracker, deleteRemoteTracker } from '../lib/remoteStore'
import type { Tracker } from '../types/application'

const DEFAULT_TRACKER_NAME = 'My Applications'

export function useTrackers(userId: string | null) {
  const [trackers, setTrackers] = useState<Tracker[]>([])
  const [loading, setLoading] = useState(true)
  // Guards the "create a default tracker" branch below against concurrent
  // refresh() calls racing each other -- e.g. React StrictMode's dev-mode
  // double-invoke of effects, which without this created two separate
  // default trackers (each call saw zero trackers before the other's write
  // landed).
  const creatingDefaultRef = useRef(false)

  const refresh = useCallback(async () => {
    let list: Tracker[]
    if (userId) {
      try {
        list = await getAllRemoteTrackers(userId)
        await Promise.all(list.map((t) => putTracker(t)))
      } catch (err) {
        console.warn('Falling back to local tracker cache -- could not reach Supabase.', err)
        const cached = await getAllTrackers()
        list = cached.filter((t) => t.user_id === userId)
      }
    } else {
      await backfillDefaultTracker()
      list = await getAllTrackers()
    }

    // Every user (guest or signed-in) always has at least one tracker --
    // covers brand-new accounts/guests with zero data, since the SQL
    // backfill in 0003_trackers.sql only covers pre-existing applications.
    if (list.length === 0) {
      if (creatingDefaultRef.current) return
      creatingDefaultRef.current = true
      try {
        const now = new Date().toISOString()
        const defaultTracker: Tracker = {
          id: crypto.randomUUID(),
          user_id: userId,
          name: DEFAULT_TRACKER_NAME,
          created_at: now,
          updated_at: now,
        }
        if (userId) await putRemoteTracker(defaultTracker)
        await putTracker(defaultTracker)
        list = [defaultTracker]
      } finally {
        creatingDefaultRef.current = false
      }
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
