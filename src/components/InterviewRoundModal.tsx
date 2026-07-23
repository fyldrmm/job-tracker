import { useState, type FormEvent } from 'react'
import { useModalDismiss } from '../hooks/useModalDismiss'
import { isoToLocalDateTimeInputs, localDateTimeToIso } from '../lib/interviews'
import { InterviewFormFields } from './InterviewFormFields'
import type { InterviewInput } from '../hooks/useInterviews'
import type { Interview } from '../types/application'

interface InterviewRoundModalProps {
  title: string
  // null = adding a new round (fields start blank/defaulted); present =
  // editing that round (fields pre-filled from it, converted back to the
  // viewer's local date/time via isoToLocalDateTimeInputs).
  initial: Interview | null
  onSave: (input: InterviewInput) => Promise<void>
  onCancel: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// Add/edit a single interview round from CardDetail -- distinct from
// InterviewScheduleModal (the post-move prompt): no queue, no skip/skip-all,
// just Cancel/Save, since this is a deliberate action the user opened, not a
// prompt they can defer. Shares InterviewFormFields with that modal so the
// two field sets can't drift apart.
export function InterviewRoundModal({ title, initial, onSave, onCancel }: InterviewRoundModalProps) {
  const initialInputs = initial ? isoToLocalDateTimeInputs(initial.scheduled_at) : null
  const [date, setDate] = useState(initialInputs?.date ?? today())
  const [time, setTime] = useState(initialInputs?.time ?? '09:00')
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 60)
  const [isRemote, setIsRemote] = useState(initial?.is_remote ?? false)
  const [location, setLocation] = useState(initial?.location ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useModalDismiss(onCancel)

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
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-medium text-ink-800">{title}</h2>

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

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-ink-600 rounded-md hover:bg-ink-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !date || !time}
              className="px-4 py-2 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
