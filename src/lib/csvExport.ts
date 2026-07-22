import type { Application, Tracker } from '../types/application'
import { STAGE_LABELS } from './stages'
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from './employment'
import { ARCHIVE_REASON_LABELS } from './archive'

const CSV_HEADER = [
  'Company',
  'Role',
  'Tracker',
  'Stage',
  'Date applied',
  'Salary range',
  'Location',
  'Employment type',
  'Work mode',
  'Priority',
  'Archived',
  'Archive reason',
  'Archived at',
  'Job link',
  'Notes',
]

export function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildApplicationsCsv(applications: Application[], trackers: Tracker[]): string {
  const trackerNameById = new Map(trackers.map((t) => [t.id, t.name]))
  const rows = applications.map((app) => {
    const fields = [
      app.company,
      app.role_title,
      trackerNameById.get(app.tracker_id) ?? '',
      STAGE_LABELS[app.current_stage],
      app.date_applied,
      app.salary_range ?? '',
      app.location ?? '',
      app.employment_type ? EMPLOYMENT_TYPE_LABELS[app.employment_type] : '',
      app.work_mode ? WORK_MODE_LABELS[app.work_mode] : '',
      app.is_priority ? 'Yes' : 'No',
      app.is_archived ? 'Yes' : 'No',
      app.archive_reason ? ARCHIVE_REASON_LABELS[app.archive_reason] : '',
      app.archived_at ?? '',
      app.job_link ?? '',
      app.notes ?? '',
    ]
    return fields.map(escapeCsvField).join(',')
  })
  return [CSV_HEADER.join(','), ...rows].join('\n')
}

export function triggerCsvDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
