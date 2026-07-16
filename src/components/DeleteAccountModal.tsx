import { useState } from 'react'

interface DeleteAccountModalProps {
  onConfirm: (password: string) => Promise<void>
  onClose: () => void
}

const CONFIRM_TEXT = 'DELETE'

export function DeleteAccountModal({ onConfirm, onClose }: DeleteAccountModalProps) {
  const [confirmInput, setConfirmInput] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const canSubmit = confirmInput === CONFIRM_TEXT && password.length > 0

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-medium text-slate-800">Delete your account?</h2>
        <p className="text-sm text-slate-600">
          This permanently deletes your account and every application you've tracked. There's no
          undo. If you want a copy first, close this and use{' '}
          <span className="font-medium">Export data</span> instead.
        </p>

        <div>
          <label htmlFor="delete-password" className="block text-sm font-medium text-slate-700">
            Confirm your password
          </label>
          <input
            id="delete-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        <div>
          <label htmlFor="delete-confirm-text" className="block text-sm font-medium text-slate-700">
            Type <span className="font-mono">{CONFIRM_TEXT}</span> to confirm
          </label>
          <input
            id="delete-confirm-text"
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

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
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 disabled:opacity-40"
          >
            Delete my account
          </button>
        </div>
      </div>
    </div>
  )
}
