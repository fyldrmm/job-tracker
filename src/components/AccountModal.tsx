import { useState } from 'react'
import { DownloadIcon, KeyIcon, TrashIcon, LogoutIcon } from './icons'

interface AccountModalProps {
  displayName: string | null
  email: string
  onRename: (name: string) => Promise<void>
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>
  onExport: () => void
  onDeleteAccount: () => void
  onSignOut: () => void
  onClose: () => void
}

export function AccountModal({
  displayName,
  email,
  onRename,
  onChangePassword,
  onExport,
  onDeleteAccount,
  onSignOut,
  onClose,
}: AccountModalProps) {
  const [name, setName] = useState(displayName ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [pwOpen, setPwOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  const trimmedName = name.trim()
  const canSaveName = trimmedName.length > 0 && trimmedName !== (displayName ?? '') && !savingName

  async function handleSaveName() {
    if (!canSaveName) return
    setSavingName(true)
    setNameError(null)
    setNameSaved(false)
    try {
      await onRename(trimmedName)
      setNameSaved(true)
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Could not save name.')
    } finally {
      setSavingName(false)
    }
  }

  const canSavePw =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    newPassword === confirmPassword &&
    !savingPw

  async function handleChangePassword() {
    if (!canSavePw) return
    setSavingPw(true)
    setPwError(null)
    setPwSaved(false)
    try {
      await onChangePassword(currentPassword, newPassword)
      setPwSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwOpen(false)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Could not change password.')
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-800">Account</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Name -- editable */}
        <div>
          <label htmlFor="account-name" className="block text-sm font-medium text-slate-700">
            Name
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="account-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameSaved(false)
              }}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <button
              type="button"
              onClick={handleSaveName}
              disabled={!canSaveName}
              className="px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-40"
            >
              Save
            </button>
          </div>
          {nameError && <p className="mt-1 text-sm text-rose-600">{nameError}</p>}
          {nameSaved && <p className="mt-1 text-sm text-emerald-600">Saved.</p>}
        </div>

        {/* Email -- read-only */}
        <div>
          <span className="block text-sm font-medium text-slate-700">Email</span>
          <p className="mt-1 text-sm text-slate-500">{email}</p>
        </div>

        <div className="border-t border-slate-100" />

        {/* Change password -- collapsible */}
        <div>
          {!pwOpen ? (
            <button
              type="button"
              onClick={() => {
                setPwOpen(true)
                setPwSaved(false)
              }}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              <KeyIcon className="w-4 h-4" />
              Change password
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <KeyIcon className="w-4 h-4" />
                Change password
              </div>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="New password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-sm text-slate-400">New password must be at least 6 characters.</p>
              )}
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-sm text-slate-400">Passwords don't match.</p>
              )}
              {pwError && <p className="text-sm text-rose-600">{pwError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={!canSavePw}
                  className="px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-40"
                >
                  Update password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPwOpen(false)
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                    setPwError(null)
                  }}
                  className="px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {pwSaved && <p className="mt-2 text-sm text-emerald-600">Password updated.</p>}
        </div>

        <div className="border-t border-slate-100" />

        {/* Export / Sign out */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 rounded-md hover:bg-slate-100"
          >
            <DownloadIcon className="w-4 h-4" />
            Export data
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 rounded-md hover:bg-slate-100"
          >
            <LogoutIcon className="w-4 h-4" />
            Sign out
          </button>
        </div>

        <div className="border-t border-slate-100" />

        {/* Delete account -- destructive, set apart at the bottom */}
        <button
          type="button"
          onClick={onDeleteAccount}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rose-600 underline decoration-rose-300 hover:decoration-rose-600 rounded-md hover:bg-rose-50"
        >
          <TrashIcon className="w-4 h-4" />
          Delete account
        </button>
      </div>
    </div>
  )
}
