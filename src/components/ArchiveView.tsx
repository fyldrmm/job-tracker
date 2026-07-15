import type { Application } from '../types/application'
import { formatDate } from '../lib/format'
import { ARCHIVE_REASON_LABELS } from '../lib/archive'

interface ArchiveViewProps {
  applications: Application[]
  onBack: () => void
  onCardOpen: (application: Application) => void
  onUnarchive: (application: Application) => void
}

export function ArchiveView({ applications, onBack, onCardOpen, onUnarchive }: ArchiveViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-slate-600 hover:text-slate-800 mb-4"
      >
        ← Back to board
      </button>

      <h2 className="text-lg font-medium text-slate-800 mb-4">Archive</h2>

      {applications.length === 0 ? (
        <p className="text-sm text-slate-400">No archived applications yet.</p>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {applications.map((application) => (
            <div
              key={application.id}
              className="flex items-center justify-between bg-white rounded-md border border-slate-200 p-3"
            >
              <button
                type="button"
                onClick={() => onCardOpen(application)}
                className="text-left flex-1 min-w-0"
              >
                <div className="font-medium text-slate-800 text-sm truncate">{application.company}</div>
                <div className="text-slate-600 text-sm truncate">{application.role_title}</div>
                <div className="text-slate-400 text-xs mt-1">
                  {application.archive_reason ? ARCHIVE_REASON_LABELS[application.archive_reason] : ''}
                  {' · '}
                  {formatDate(application.date_applied)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => onUnarchive(application)}
                className="ml-3 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 shrink-0"
              >
                Un-archive
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
