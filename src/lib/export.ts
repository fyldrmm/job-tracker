import { getAllApplications, getAllStageHistory } from './localStore'
import { getAllRemoteApplications, getAllRemoteStageHistory } from './remoteStore'
import type { Application, StageHistoryEntry } from '../types/application'

export interface ExportData {
  exported_at: string
  applications: Application[]
  stage_history: StageHistoryEntry[]
}

export async function buildExportData(userId: string | null): Promise<ExportData> {
  const [applications, stage_history] = userId
    ? await Promise.all([getAllRemoteApplications(userId), getAllRemoteStageHistory()])
    : await Promise.all([getAllApplications(), getAllStageHistory()])

  return { exported_at: new Date().toISOString(), applications, stage_history }
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
