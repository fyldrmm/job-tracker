import { useState, type FormEvent } from 'react'

interface SetNewPasswordModalProps {
  onConfirm: (newPassword: string) => Promise<void>
}

export function SetNewPasswordModal({ onConfirm }: SetNewPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = newPassword.length >= 6 && newPassword === confirmPassword

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(newPassword)
      // On success the parent clears password-recovery mode and this modal
      // unmounts -- the signed-in board reappearing behind it is the
      // confirmation, no separate "done" state needed here.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-medium text-slate-800">Set a new password</h2>
          <p className="text-sm text-slate-600">Choose a new password for your account.</p>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div>
            <label htmlFor="confirm-new-password" className="block text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <input
              id="confirm-new-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {newPassword.length > 0 && newPassword.length < 6 && (
            <p className="text-xs text-slate-400">At least 6 characters.</p>
          )}
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <p className="text-xs text-rose-600">Passwords don't match.</p>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-40"
          >
            Update password
          </button>
        </form>
      </div>
    </div>
  )
}
