import type { Application, Interview } from '../types/application'
import { STAGE_LABELS } from './stages'
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from './employment'
import { formatDateTime } from './format'
import { interviewSummaryForApplication } from './interviews'
import { sanitizeExportField } from './exportSanitize'

const HEADERS = [
  'Company',
  'Role',
  'Stage',
  'Date applied',
  'Salary range',
  'Location',
  'Employment type',
  'Work mode',
  'Priority',
  'Job link',
  'Notes',
  'Next interview',
  'Rounds',
]

const COLUMN_WIDTHS = [24, 24, 14, 14, 18, 18, 16, 12, 10, 30, 40, 20, 8]

export async function buildApplicationsXlsx(applications: Application[], interviews: Interview[]): Promise<Blob> {
  // Dynamically imported so the writer only loads for the guest who
  // actually clicks Export, not on every app load. Replaced exceljs
  // (security review 2026-07-28, Finding #4 -- 10 unfixable advisories in
  // its archiver/zip-stream subtree, no non-breaking fix available) with
  // write-excel-file, whose only dependency (fflate) has none.
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  const headerRow = HEADERS.map((value) => ({ value, fontWeight: 'bold' as const }))
  const rows = applications.map((app) => {
    const { nextInterview, roundCount } = interviewSummaryForApplication(interviews, app.id)
    return [
      { value: sanitizeExportField(app.company) },
      { value: sanitizeExportField(app.role_title) },
      { value: STAGE_LABELS[app.current_stage] },
      { value: app.date_applied },
      { value: sanitizeExportField(app.salary_range ?? '') },
      { value: sanitizeExportField(app.location ?? '') },
      { value: app.employment_type ? EMPLOYMENT_TYPE_LABELS[app.employment_type] : '' },
      { value: app.work_mode ? WORK_MODE_LABELS[app.work_mode] : '' },
      { value: app.is_priority ? 'Yes' : 'No' },
      { value: sanitizeExportField(app.job_link ?? '') },
      { value: sanitizeExportField(app.notes ?? '') },
      { value: nextInterview ? formatDateTime(nextInterview.scheduled_at) : '' },
      { value: roundCount, type: Number },
    ]
  })

  return writeXlsxFile([headerRow, ...rows], {
    sheet: 'Applications',
    columns: COLUMN_WIDTHS.map((width) => ({ width })),
  }).toBlob()
}

export function triggerXlsxDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
