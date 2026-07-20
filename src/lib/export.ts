import { getAllApplications, getAllStageHistory, getAllTrackers } from './localStore'
import { getAllRemoteApplications, getAllRemoteStageHistory, getAllRemoteTrackers } from './remoteStore'
import { byCreatedAt, byTimestamp } from './sort'
import type { Application, StageHistoryEntry, Tracker } from '../types/application'

const byEnteredAt = byTimestamp('entered_at')

export interface ExportData {
  exported_at: string
  trackers: Tracker[]
  applications: Application[]
  stage_history: StageHistoryEntry[]
}

// trackers are included because every application carries a tracker_id --
// without them the export is self-inconsistent, with every tracker_id
// pointing at nothing (AUDIT.md M1).
export async function buildExportData(userId: string | null): Promise<ExportData> {
  const [trackers, applications, stage_history] = userId
    ? await Promise.all([
        getAllRemoteTrackers(userId),
        getAllRemoteApplications(userId),
        getAllRemoteStageHistory(),
      ])
    : // the guest path reads IndexedDB directly rather than going through the
      // hooks, so it has to apply the same ordering the DB gives the
      // signed-in path -- otherwise the two exports disagree (AUDIT.md M3).
      await Promise.all([
        getAllTrackers().then((t) => t.sort(byCreatedAt)),
        getAllApplications().then((a) => a.sort(byCreatedAt)),
        getAllStageHistory().then((s) => s.sort(byEnteredAt)),
      ])

  return { exported_at: new Date().toISOString(), trackers, applications, stage_history }
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
