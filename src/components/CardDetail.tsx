import { useState } from 'react'
import type { Application, ArchiveReason, Interview } from '../types/application'
import { formatDate, formatDateTime } from '../lib/format'
import { isSafeHttpUrl } from '../lib/url'
import { useModalDismiss } from '../hooks/useModalDismiss'
import { STAGE_LABELS } from '../lib/stages'
import { ARCHIVE_REASON_LABELS } from '../lib/archive'
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from '../lib/employment'
import { interviewsForApplication } from '../lib/interviews'
import { buildGoogleCalendarUrl, downloadInterviewIcs } from '../lib/icsExport'
import { canScheduleInterviews } from '../lib/entitlements'
import { ArchiveSplitButton } from './ArchiveSplitButton'
import { InterviewRoundModal } from './InterviewRoundModal'
import { TrashIcon, StarIcon } from './icons'
import type { InterviewInput } from '../hooks/useInterviews'

interface CardDetailProps {
  application: Application
  trackerName: string | undefined
  interviews: Interview[]
  onScheduleInterview: (input: InterviewInput) => Promise<void>
  onUpdateInterview: (id: string, input: InterviewInput) => Promise<void>
  onDeleteInterview: (id: string) => Promise<void>
  onEdit: () => void
  onClose: () => void
  onArchive: (reason: ArchiveReason) => void
  onDeleteRequest: (application: Application) => void
  onTogglePriority: () => void
}

// null = adding a new round; an Interview = editing that specific round.
type RoundModalState = { mode: 'add' } | { mode: 'edit'; interview: Interview } | null

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
      <dt className="text-ink-400 text-xs uppercase tracking-wide">{label}</dt>
      <dd className={`text-ink-700 mt-0.5 text-sm ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {isLink && isSafeHttpUrl(value) ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-ink-700 underline break-all">
            {value}
          </a>
        ) : (
          <span className="break-all">{value}</span>
        )}
      </dd>
    </div>
  )
}

export function CardDetail({
  application,
  trackerName,
  interviews,
  onScheduleInterview,
  onUpdateInterview,
  onDeleteInterview,
  onEdit,
  onClose,
  onArchive,
  onDeleteRequest,
  onTogglePriority,
}: CardDetailProps) {
  useModalDismiss(onClose)
  const [roundModal, setRoundModal] = useState<RoundModalState>(null)
  const rounds = interviewsForApplication(interviews, application.id)

  async function handleSaveRound(input: InterviewInput) {
    if (roundModal?.mode === 'edit') {
      await onUpdateInterview(roundModal.interview.id, input)
    } else {
      await onScheduleInterview(input)
    }
    setRoundModal(null)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <div>
            {trackerName && (
              <p className="text-ink-400 text-xs uppercase tracking-wide mb-0.5">{trackerName}</p>
            )}
            <h2 className="text-lg font-medium text-ink-800">{application.company}</h2>
            <p className="text-ink-600 text-sm">{application.role_title}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onTogglePriority}
              aria-pressed={application.is_priority}
              aria-label={application.is_priority ? 'Remove from most wanted' : 'Mark as most wanted'}
              className={`p-1.5 rounded-md hover:bg-ink-100 ${
                application.is_priority ? 'text-amber-400' : 'text-ink-300 hover:text-ink-500'
              }`}
            >
              <StarIcon className={`w-5 h-5 ${application.is_priority ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-ink-400 hover:text-ink-700 text-lg leading-none px-1"
            >
              ✕
            </button>
          </div>
        </div>

        <dl className="divide-y divide-ink-100 mt-2">
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

        <div className="pt-3 border-t border-ink-100">
          <div className="flex items-center justify-between">
            <h3 className="text-ink-400 text-xs uppercase tracking-wide">Interviews</h3>
            {/* Gated on canScheduleInterviews() -- viewing/editing/deleting an
                already-scheduled round below is never gated, only starting a
                NEW one. */}
            {canScheduleInterviews() && (
              <button
                type="button"
                onClick={() => setRoundModal({ mode: 'add' })}
                className="text-sm font-medium text-ink-600 hover:text-ink-800 hover:underline"
              >
                + Add round
              </button>
            )}
          </div>
          {rounds.length === 0 ? (
            <p className="text-sm text-ink-400 mt-2">No interviews scheduled yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {rounds.map((interview) => (
                <li key={interview.id} className="flex items-center justify-between gap-2 text-sm">
                  <p className="text-ink-700 truncate min-w-0">
                    Round {interview.round} · {formatDateTime(interview.scheduled_at)}
                    {interview.is_remote ? ' · Remote' : interview.location ? ` · ${interview.location}` : ''}
                  </p>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <button
                      type="button"
                      onClick={() => downloadInterviewIcs(application, interview)}
                      className="text-ink-500 hover:text-ink-800 hover:underline"
                    >
                      .ics
                    </button>
                    <a
                      href={buildGoogleCalendarUrl(application, interview)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink-500 hover:text-ink-800 hover:underline"
                    >
                      Google
                    </a>
                    <button
                      type="button"
                      onClick={() => setRoundModal({ mode: 'edit', interview })}
                      aria-label={`Edit round ${interview.round}`}
                      className="text-ink-500 hover:text-ink-800 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteInterview(interview.id)}
                      aria-label={`Delete round ${interview.round}`}
                      className="p-1 -m-1 text-ink-400 hover:text-rose-600 rounded hover:bg-rose-50"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            {!application.is_archived && <ArchiveSplitButton onArchive={onArchive} />}
            <button
              type="button"
              onClick={() => onDeleteRequest(application)}
              aria-label={`Delete ${application.company}`}
              className="p-2 text-ink-400 rounded-md hover:bg-rose-50 hover:text-rose-600"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink-600 rounded-md hover:bg-ink-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {roundModal && (
        <InterviewRoundModal
          title={roundModal.mode === 'edit' ? `Edit round ${roundModal.interview.round}` : 'Add interview round'}
          initial={roundModal.mode === 'edit' ? roundModal.interview : null}
          onSave={handleSaveRound}
          onCancel={() => setRoundModal(null)}
        />
      )}
    </div>
  )
}
