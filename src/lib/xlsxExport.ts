import type { Application, Interview } from '../types/application'
import { STAGE_LABELS } from './stages'
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from './employment'
import { formatDateTime } from './format'
import { interviewSummaryForApplication } from './interviews'

const COLUMNS = [
  { header: 'Company', key: 'company', width: 24 },
  { header: 'Role', key: 'role', width: 24 },
  { header: 'Stage', key: 'stage', width: 14 },
  { header: 'Date applied', key: 'date', width: 14 },
  { header: 'Salary range', key: 'salary', width: 18 },
  { header: 'Location', key: 'location', width: 18 },
  { header: 'Employment type', key: 'employment', width: 16 },
  { header: 'Work mode', key: 'workMode', width: 12 },
  { header: 'Priority', key: 'priority', width: 10 },
  { header: 'Job link', key: 'jobLink', width: 30 },
  { header: 'Notes', key: 'notes', width: 40 },
  { header: 'Next interview', key: 'nextInterview', width: 20 },
  { header: 'Rounds', key: 'rounds', width: 8 },
]

export async function buildApplicationsXlsx(applications: Application[], interviews: Interview[]): Promise<ArrayBuffer> {
  // Dynamically imported so exceljs (~900kb) only loads for the guest who
  // actually clicks Export, not on every app load.
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Applications')
  sheet.columns = COLUMNS
  sheet.getRow(1).font = { bold: true }

  for (const app of applications) {
    const { nextInterview, roundCount } = interviewSummaryForApplication(interviews, app.id)
    sheet.addRow({
      company: app.company,
      role: app.role_title,
      stage: STAGE_LABELS[app.current_stage],
      date: app.date_applied,
      salary: app.salary_range ?? '',
      location: app.location ?? '',
      employment: app.employment_type ? EMPLOYMENT_TYPE_LABELS[app.employment_type] : '',
      workMode: app.work_mode ? WORK_MODE_LABELS[app.work_mode] : '',
      priority: app.is_priority ? 'Yes' : 'No',
      jobLink: app.job_link ?? '',
      notes: app.notes ?? '',
      nextInterview: nextInterview ? formatDateTime(nextInterview.scheduled_at) : '',
      rounds: roundCount,
    })
  }

  return workbook.xlsx.writeBuffer()
}

export function triggerXlsxDownload(filename: string, buffer: ArrayBuffer): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
