import type { Application } from '../types/application'
import { STAGE_ORDER } from './stages'
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from './employment'

export type TableSortKey =
  | 'company'
  | 'role_title'
  | 'current_stage'
  | 'date_applied'
  | 'location'
  | 'employment_type'
  | 'work_mode'
export type SortDirection = 'asc' | 'desc'

function compare(a: Application, b: Application, sortKey: TableSortKey): number {
  switch (sortKey) {
    case 'company':
      return a.company.localeCompare(b.company)
    case 'role_title':
      return a.role_title.localeCompare(b.role_title)
    case 'date_applied':
      return a.date_applied.localeCompare(b.date_applied)
    case 'current_stage':
      return STAGE_ORDER.indexOf(a.current_stage) - STAGE_ORDER.indexOf(b.current_stage)
    case 'location':
      return (a.location ?? '').localeCompare(b.location ?? '')
    case 'employment_type':
      return (a.employment_type ? EMPLOYMENT_TYPE_LABELS[a.employment_type] : '').localeCompare(
        b.employment_type ? EMPLOYMENT_TYPE_LABELS[b.employment_type] : '',
      )
    case 'work_mode':
      return (a.work_mode ? WORK_MODE_LABELS[a.work_mode] : '').localeCompare(
        b.work_mode ? WORK_MODE_LABELS[b.work_mode] : '',
      )
  }
}

export function sortApplicationsForTable(
  applications: Application[],
  sortKey: TableSortKey,
  direction: SortDirection,
): Application[] {
  const sorted = [...applications].sort((a, b) => compare(a, b, sortKey))
  return direction === 'asc' ? sorted : sorted.reverse()
}
