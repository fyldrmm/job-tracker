import { useState } from 'react'
import type { Tracker } from '../types/application'

interface DeleteTrackerModalProps {
  tracker: Tracker
  applicationCount: number
  onConfirm: () => void
  onClose: () => void
}

export function DeleteTrackerModal({ tracker, applicationCount, onConfirm, onClose }: DeleteTrackerModalProps) {
  const strict = applicationCount > 0
  const [confirmInput, setConfirmInput] = useState('')
  const canSubmit = !strict || confirmInput.trim() === tracker.name

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-medium text-slate-800">Delete "{tracker.name}"?</h2>

        {strict ? (
          <>
            <p className="text-sm text-slate-600">
              This tracker has {applicationCount} application{applicationCount === 1 ? '' : 's'}, including
              anything archived under it. Deleting it deletes all of them too -- there's no undo.
            </p>
            <div>
              <label htmlFor="delete-tracker-confirm" className="block text-sm font-medium text-slate-700">
                Type <span className="font-mono">{tracker.name}</span> to confirm
              </label>
              <input
                id="delete-tracker-confirm"
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                autoFocus
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">This tracker is empty. There's nothing to lose.</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 disabled:opacity-40"
          >
            Delete tracker
          </button>
        </div>
      </div>
    </div>
  )
}
