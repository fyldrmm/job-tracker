import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { buildApplicationsXlsx } from './xlsxExport'
import type { Application, Interview } from '../types/application'

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'app-1',
    user_id: null,
    tracker_id: 't1',
    company: 'Acme',
    role_title: 'Engineer',
    job_link: null,
    date_applied: '2026-01-01',
    current_stage: 'interview',
    salary_range: null,
    location: null,
    employment_type: null,
    work_mode: null,
    notes: null,
    is_priority: false,
    is_archived: false,
    archive_reason: null,
    archived_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeInterview(overrides: Partial<Interview> & { id: string }): Interview {
  return {
    application_id: 'app-1',
    round: 1,
    scheduled_at: '2026-08-04T13:00:00.000Z',
    duration_minutes: 60,
    is_remote: false,
    location: null,
    notes: null,
    created_at: '2026-07-23T10:00:00.000Z',
    updated_at: '2026-07-23T10:00:00.000Z',
    ...overrides,
  }
}

async function readBackFirstDataRow(buffer: ArrayBuffer): Promise<Record<string, unknown>> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet('Applications')!
  const headerRow = sheet.getRow(1).values as unknown[]
  const dataRow = sheet.getRow(2).values as unknown[]
  const result: Record<string, unknown> = {}
  // ExcelJS row.values is 1-indexed with a leading empty slot -- skip it.
  for (let i = 1; i < headerRow.length; i++) {
    result[String(headerRow[i])] = dataRow[i]
  }
  return result
}

describe('buildApplicationsXlsx', () => {
  it('includes Next interview and Rounds columns, blank/zero when none scheduled', async () => {
    const buffer = await buildApplicationsXlsx([makeApplication()], [])
    const row = await readBackFirstDataRow(buffer)
    expect(row['Next interview']).toBeFalsy()
    expect(row['Rounds']).toBe(0)
  })

  it('fills in the soonest upcoming interview and the total round count', async () => {
    const interviews = [
      makeInterview({ id: 'past', round: 1, scheduled_at: '2026-01-01T00:00:00.000Z' }),
      makeInterview({ id: 'future', round: 2, scheduled_at: '2099-06-15T14:00:00.000Z' }),
    ]
    const buffer = await buildApplicationsXlsx([makeApplication()], interviews)
    const row = await readBackFirstDataRow(buffer)
    expect(row['Rounds']).toBe(2)
    expect(String(row['Next interview'])).toContain('Jun 15')
  })
})
