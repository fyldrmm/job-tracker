import type { Application, ArchiveReason } from '../types/application'
import { formatDate } from '../lib/format'
import { STAGE_LABELS } from '../lib/stages'
import { ARCHIVE_REASON_LABELS } from '../lib/archive'
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from '../lib/employment'
import { ArchiveSplitButton } from './ArchiveSplitButton'

interface CardDetailProps {
  application: Application
  trackerName: string | undefined
  onEdit: () => void
  onClose: () => void
  onArchive: (reason: ArchiveReason) => void
  onDeleteRequest: (application: Application) => void
}

interface FieldProps {
  label: string
  value: string | null
  isLink?: boolean
  multiline?: boolean
}

function Field({ label, value, isLink, multiline }: FieldProps) {
  if (!value) return null
  return (
    <div className="py-2">
      <dt className="text-slate-400 text-xs uppercase tracking-wide">{label}</dt>
      <dd className={`text-slate-700 mt-0.5 text-sm ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {isLink ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-slate-700 underline break-all">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

export function CardDetail({
  application,
  trackerName,
  onEdit,
  onClose,
  onArchive,
  onDeleteRequest,
}: CardDetailProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <div>
            {trackerName && (
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">{trackerName}</p>
            )}
            <h2 className="text-lg font-medium text-slate-800">{application.company}</h2>
            <p className="text-slate-600 text-sm">{application.role_title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <dl className="divide-y divide-slate-100 mt-2">
          <Field label="Stage" value={STAGE_LABELS[application.current_stage]} />
          <Field label="Date applied" value={formatDate(application.date_applied)} />
          {application.is_archived && application.archive_reason && (
            <Field
              label="Archived"
              value={`${ARCHIVE_REASON_LABELS[application.archive_reason]}${
                application.archived_at ? ` · ${formatDate(application.archived_at.slice(0, 10))}` : ''
              }`}
            />
          )}
          <Field label="Job link" value={application.job_link} isLink />
          <Field label="Salary range" value={application.salary_range} />
          <Field label="Location" value={application.location} />
          <Field
            label="Employment type"
            value={application.employment_type ? EMPLOYMENT_TYPE_LABELS[application.employment_type] : null}
          />
          <Field label="Work mode" value={application.work_mode ? WORK_MODE_LABELS[application.work_mode] : null} />
          <Field label="Notes" value={application.notes} multiline />
        </dl>

        <div className="flex items-center justify-between pt-4">
          <div>
            {!application.is_archived ? (
              <ArchiveSplitButton onArchive={onArchive} />
            ) : (
              <button
                type="button"
                onClick={() => onDeleteRequest(application)}
                className="px-4 py-2 text-sm font-medium text-rose-600 border border-rose-200 rounded-md hover:bg-rose-50"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
