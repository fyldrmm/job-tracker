import { useCallback, useEffect, useState } from 'react'
import { getAllStageHistory } from '../lib/localStore'
import { getAllRemoteStageHistory } from '../lib/remoteStore'
import { byTimestamp } from '../lib/sort'
import type { StageHistoryEntry } from '../types/application'

const byEnteredAt = byTimestamp('entered_at')

// Read-only: stage_history is never edited directly through this hook, only
// ever appended to via useApplications' moveApplicationStage. Insights is
// the first UI consumer that needs to *read* it (previously only
// export/migration did), so this doesn't need the write-through-cache
// machinery useApplications/useTrackers have.
export function useStageHistory(userId: string | null) {
  const [stageHistory, setStageHistory] = useState<StageHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (userId) {
      try {
        setStageHistory(await getAllRemoteStageHistory())
        return
      } catch (err) {
        console.warn('Falling back to local stage_history cache -- could not reach Supabase.', err)
      }
    }
    setStageHistory((await getAllStageHistory()).sort(byEnteredAt))
  }, [userId])

  useEffect(() => {
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [refresh])

  return { stageHistory, loading, refresh }
}
