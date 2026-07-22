import type { Application } from '../types/application'
import { STAGE_ORDER } from './stages'

export type TableSortKey = 'company' | 'role_title' | 'current_stage' | 'date_applied'
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
