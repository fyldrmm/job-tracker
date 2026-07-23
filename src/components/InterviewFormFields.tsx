// The date/time/duration/remote/location/notes fields shared by the
// post-move scheduling prompt (InterviewScheduleModal) and the add/edit
// round form in CardDetail (InterviewRoundModal) -- factored out once,
// rather than duplicated, since both need to change together (e.g. adding
// a field) and a fork here would be easy to update in only one place.
interface InterviewFormFieldsProps {
  date: string
  onDateChange: (value: string) => void
  time: string
  onTimeChange: (value: string) => void
  duration: number
  onDurationChange: (value: number) => void
  isRemote: boolean
  onIsRemoteChange: (value: boolean) => void
  location: string
  onLocationChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
}

const DURATION_OPTIONS = [30, 45, 60, 90, 120]

export function InterviewFormFields({
  date,
  onDateChange,
  time,
  onTimeChange,
  duration,
  onDurationChange,
  isRemote,
  onIsRemoteChange,
  location,
  onLocationChange,
  notes,
  onNotesChange,
}: InterviewFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-medium text-ink-700 mb-1">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full border border-ink-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink-400"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-ink-700 mb-1">Time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full border border-ink-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink-400"
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-ink-700 mb-1">Duration</span>
        <select
          value={duration}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="w-full border border-ink-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink-400 bg-white"
        >
          {DURATION_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minutes
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={isRemote}
          onChange={(e) => onIsRemoteChange(e.target.checked)}
          className="rounded border-ink-300"
        />
        Remote
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-ink-700 mb-1">
          {isRemote ? 'Meeting link (optional)' : 'Location (optional)'}
        </span>
        <input
          type="text"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder={isRemote ? 'https://…' : 'Office address'}
          className="w-full border border-ink-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink-400"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-ink-700 mb-1">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          className="w-full border border-ink-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink-400"
        />
      </label>
    </>
  )
}
