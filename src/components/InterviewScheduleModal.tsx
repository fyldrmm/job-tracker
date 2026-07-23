import { useState, type FormEvent } from 'react'
import { useModalDismiss } from '../hooks/useModalDismiss'
import { localDateTimeToIso } from '../lib/interviews'
import { InterviewFormFields } from './InterviewFormFields'
import type { InterviewInput } from '../hooks/useInterviews'

interface InterviewScheduleModalProps {
  company: string
  roleTitle: string
  index: number
  total: number
  onSave: (input: InterviewInput) => Promise<void>
  onSkip: () => void
  // Only offered when more than one card is in the queue -- with a single
  // card, "skip all" and "skip" are the same action.
  onSkipAll?: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// Board keys this component by the current queue entry's application id, so
// a new mount (and fresh field state) is guaranteed on every Save/Skip --
// this component never needs to reset its own fields mid-queue.
export function InterviewScheduleModal({
  company,
  roleTitle,
  index,
  total,
  onSave,
  onSkip,
  onSkipAll,
}: InterviewScheduleModalProps) {
  const [date, setDate] = useState(today())
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState(60)
  const [isRemote, setIsRemote] = useState(false)
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Escape skips just this card, not the whole queue -- "Skip all" is its
  // own explicit button (user decision), since Escape is the natural
  // "never mind, next" gesture but shouldn't silently discard every
  // remaining card in a multi-select move.
  useModalDismiss(onSkip)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!date || !time) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSave({
        scheduled_at: localDateTimeToIso(date, time),
        duration_minutes: duration,
        is_remote: isRemote,
        location: location.trim() || null,
        notes: notes.trim() || null,
      })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSkip()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <div>
          {total > 1 && (
            <p className="text-xs uppercase tracking-wide text-ink-400 mb-1">
              {index + 1} of {total}
            </p>
          )}
          <h2 className="text-lg font-medium text-ink-800">Schedule the interview?</h2>
          <p className="text-sm text-ink-600">
            {company} — {roleTitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InterviewFormFields
            date={date}
            onDateChange={setDate}
            time={time}
            onTimeChange={setTime}
            duration={duration}
            onDurationChange={setDuration}
            isRemote={isRemote}
            onIsRemoteChange={setIsRemote}
            location={location}
            onLocationChange={setLocation}
            notes={notes}
            onNotesChange={setNotes}
          />

          {submitError && <p className="text-sm text-rose-600">{submitError}</p>}

          <div className="flex items-center justify-between pt-2">
            {onSkipAll ? (
              <button
                type="button"
                onClick={onSkipAll}
                className="text-sm text-ink-400 hover:text-ink-600 hover:underline"
              >
                Skip all
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSkip}
                className="px-4 py-2 text-sm font-medium text-ink-600 rounded-md hover:bg-ink-100"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={submitting || !date || !time}
                className="px-4 py-2 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700 disabled:opacity-50"
              >
                {index + 1 < total ? 'Save & next' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
