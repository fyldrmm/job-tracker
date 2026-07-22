import { useMemo, useState } from 'react'
import type { Application, ApplicationStage, EmploymentType, WorkMode } from '../types/application'
import { formatDate } from '../lib/format'
import { STAGE_ORDER, STAGE_LABELS } from '../lib/stages'
import { EMPLOYMENT_TYPE_LABELS, EMPLOYMENT_TYPES, WORK_MODE_LABELS, WORK_MODES } from '../lib/employment'
import { sortApplicationsForTable, type SortDirection, type TableSortKey } from '../lib/tableView'
import { NoteIcon, StarIcon } from './icons'
import { MultiSelectFilter } from './MultiSelectFilter'

interface TableViewProps {
  applications: Application[]
  onCardOpen: (application: Application) => void
  onStageChange: (application: Application, stage: ApplicationStage) => void
  onTogglePriority: (application: Application) => void
}

const STAGE_OPTIONS = STAGE_ORDER.map((value) => ({ value, label: STAGE_LABELS[value] }))
const ALL_STAGES = STAGE_ORDER

interface ColumnDef {
  key: TableSortKey
  label: string
}

const COLUMNS: ColumnDef[] = [
  { key: 'company', label: 'Company' },
  { key: 'role_title', label: 'Role' },
  { key: 'current_stage', label: 'Stage' },
  { key: 'date_applied', label: 'Date applied' },
]

// Same "don't let the last selection disappear with no way back" rule as
// ArchiveView's filters.
function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  if (set.has(value)) {
    if (set.size === 1) return set
    const next = new Set(set)
    next.delete(value)
    return next
  }
  return new Set(set).add(value)
}

export function TableView({ applications, onCardOpen, onStageChange, onTogglePriority }: TableViewProps) {
  const [sortKey, setSortKey] = useState<TableSortKey>('date_applied')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedStages, setSelectedStages] = useState<Set<ApplicationStage>>(() => new Set(ALL_STAGES))
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<Set<EmploymentType>>(
    () => new Set(EMPLOYMENT_TYPES.map((o) => o.value)),
  )
  const [selectedWorkModes, setSelectedWorkModes] = useState<Set<WorkMode>>(() => new Set(WORK_MODES.map((o) => o.value)))

  function handleHeaderClick(key: TableSortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  // Same "untagged rows are unaffected by a filter" rule as ArchiveView --
  // employment_type/work_mode are optional, so narrowing by one only hides
  // rows actually tagged with an unselected value.
  const filteredApplications = useMemo(
    () =>
      applications.filter(
        (app) =>
          selectedStages.has(app.current_stage) &&
          (!app.employment_type || selectedEmploymentTypes.has(app.employment_type)) &&
          (!app.work_mode || selectedWorkModes.has(app.work_mode)),
      ),
    [applications, selectedStages, selectedEmploymentTypes, selectedWorkModes],
  )

  const sorted = useMemo(
    () => sortApplicationsForTable(filteredApplications, sortKey, sortDirection),
    [filteredApplications, sortKey, sortDirection],
  )

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {applications.length > 0 && (
        <div className="flex items-center gap-3 mb-4 text-sm">
          <MultiSelectFilter
            label="Stage"
            options={STAGE_OPTIONS}
            selected={selectedStages}
            onToggle={(stage) => setSelectedStages((prev) => toggleSetValue(prev, stage))}
          />
          <MultiSelectFilter
            label="Employment"
            options={EMPLOYMENT_TYPES}
            selected={selectedEmploymentTypes}
            onToggle={(type) => setSelectedEmploymentTypes((prev) => toggleSetValue(prev, type))}
          />
          <MultiSelectFilter
            label="Work mode"
            options={WORK_MODES}
            selected={selectedWorkModes}
            onToggle={(mode) => setSelectedWorkModes((prev) => toggleSetValue(prev, mode))}
          />
        </div>
      )}

      {applications.length === 0 ? (
        <p className="text-sm text-ink-400">No applications on this tracker yet.</p>
      ) : filteredApplications.length === 0 ? (
        <p className="text-sm text-ink-400">No applications match the selected filters.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-ink-200">
              <th className="w-8" />
              {COLUMNS.map((column) => (
                <th key={column.key} className="text-left py-2 pr-4">
                  <button
                    type="button"
                    onClick={() => handleHeaderClick(column.key)}
                    className="font-medium text-ink-500 hover:text-ink-700 inline-flex items-center gap-1"
                  >
                    {column.label}
                    {sortKey === column.key && <span aria-hidden="true">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
              ))}
              <th className="text-left py-2 pr-4 font-medium text-ink-500">Salary</th>
              <th className="text-left py-2 pr-4 font-medium text-ink-500">Location</th>
              <th className="text-left py-2 pr-4 font-medium text-ink-500">Employment</th>
              <th className="text-left py-2 pr-4 font-medium text-ink-500">Work mode</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((application) => (
              <tr
                key={application.id}
                onClick={() => onCardOpen(application)}
                className="border-b border-ink-100 hover:bg-ink-50 cursor-pointer"
              >
                <td className="w-8">
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      onTogglePriority(application)
                    }}
                    aria-label={application.is_priority ? 'Remove from most wanted' : 'Mark as most wanted'}
                    aria-pressed={application.is_priority}
                    className="p-1 text-ink-300 hover:text-amber-400"
                  >
                    <StarIcon
                      className={`w-4 h-4 ${application.is_priority ? 'text-amber-400 fill-amber-400' : ''}`}
                    />
                  </button>
                </td>
                <td className="py-2 pr-4">
                  <span className="flex items-center gap-1.5 font-medium text-ink-800">
                    {application.company}
                    {application.notes && application.notes.trim() && (
                      <NoteIcon className="w-3.5 h-3.5 text-ink-400 shrink-0" aria-label="Has notes" />
                    )}
                  </span>
                </td>
                <td className="py-2 pr-4 text-ink-600">{application.role_title}</td>
                <td className="py-2 pr-4">
                  <select
                    value={application.current_stage}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onStageChange(application, e.target.value as ApplicationStage)}
                    className="border border-ink-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ink-400 bg-white"
                  >
                    {STAGE_ORDER.map((stage) => (
                      <option key={stage} value={stage}>
                        {STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4 text-ink-500">{formatDate(application.date_applied)}</td>
                <td className="py-2 pr-4 text-ink-500">{application.salary_range || '—'}</td>
                <td className="py-2 pr-4 text-ink-500">{application.location || '—'}</td>
                <td className="py-2 pr-4 text-ink-500">
                  {application.employment_type ? EMPLOYMENT_TYPE_LABELS[application.employment_type] : '—'}
                </td>
                <td className="py-2 pr-4 text-ink-500">
                  {application.work_mode ? WORK_MODE_LABELS[application.work_mode] : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
