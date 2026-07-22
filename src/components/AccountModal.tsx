import { useState, type FormEvent } from 'react'
import { useModalDismiss } from '../hooks/useModalDismiss'

interface AccountModalProps {
  name: string
  email: string
  onUpdateName: (name: string) => Promise<void>
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>
  onExport: () => void
  onOpenDeleteAccount: () => void
  onSignOut: () => void
  onClose: () => void
}

export function AccountModal({
  name,
  email,
  onUpdateName,
  onChangePassword,
  onExport,
  onOpenDeleteAccount,
  onSignOut,
  onClose,
}: AccountModalProps) {
  const [nameValue, setNameValue] = useState(name)
  const [nameSubmitting, setNameSubmitting] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSaved, setNameSaved] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  // Escape only, no backdrop-click-to-close -- avoids discarding a
  // half-typed name/password change on a stray click.
  useModalDismiss(onClose)

  const nameChanged = nameValue.trim().length > 0 && nameValue.trim() !== name

  async function handleSaveName() {
    setNameSubmitting(true)
    setNameError(null)
    setNameSaved(false)
    try {
      await onUpdateName(nameValue)
      setNameSaved(true)
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setNameSubmitting(false)
    }
  }

  const canSubmitPassword =
    currentPassword.length > 0 && newPassword.length >= 6 && newPassword === confirmPassword

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPasswordSubmitting(true)
    setPasswordError(null)
    setPasswordSaved(false)
    try {
      await onChangePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-ink-800">Account</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-400 hover:text-ink-700 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div>
          <label htmlFor="account-name" className="block text-sm font-medium text-ink-700">
            Name
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="account-name"
              type="text"
              maxLength={100}
              value={nameValue}
              onChange={(e) => {
                setNameValue(e.target.value)
                setNameSaved(false)
              }}
              className="flex-1 rounded-md border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink-400"
            />
            <button
              type="button"
              onClick={handleSaveName}
              disabled={!nameChanged || nameSubmitting}
              className="px-3 py-2 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700 disabled:opacity-40"
            >
              Save
            </button>
          </div>
          {nameError && <p className="mt-1 text-sm text-rose-600">{nameError}</p>}
          {nameSaved && <p className="mt-1 text-sm text-emerald-600">Name updated.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700">Email</label>
          <p className="mt-1 px-3 py-2 text-sm text-ink-500 bg-ink-50 rounded-md border border-ink-200">
            {email}
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-2 pt-3 border-t border-ink-200">
          <h3 className="text-sm font-medium text-ink-700">Change password</h3>
          <input
            type="password"
            placeholder="Current password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value)
              setPasswordSaved(false)
            }}
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink-400"
          />
          <input
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            minLength={6}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value)
              setPasswordSaved(false)
            }}
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink-400"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setPasswordSaved(false)
            }}
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink-400"
          />
          {newPassword.length > 0 && newPassword.length < 6 && (
            <p className="text-xs text-ink-400">At least 6 characters.</p>
          )}
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <p className="text-xs text-rose-600">Passwords don't match.</p>
          )}
          {passwordError && <p className="text-sm text-rose-600">{passwordError}</p>}
          {passwordSaved && <p className="text-sm text-emerald-600">Password updated.</p>}
          <button
            type="submit"
            disabled={!canSubmitPassword || passwordSubmitting}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700 disabled:opacity-40"
          >
            Update password
          </button>
        </form>

        <div className="pt-3 border-t border-ink-200 space-y-1">
          <button
            type="button"
            onClick={onExport}
            className="w-full text-left px-3 py-2 text-sm text-ink-600 hover:bg-ink-100 rounded-md"
          >
            Export data
          </button>
          <button
            type="button"
            onClick={onOpenDeleteAccount}
            className="w-full text-left px-3 py-2 text-sm text-rose-600 underline decoration-rose-300 hover:decoration-rose-600 rounded-md"
          >
            Delete account
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full text-left px-3 py-2 text-sm text-ink-600 hover:bg-ink-100 rounded-md"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
