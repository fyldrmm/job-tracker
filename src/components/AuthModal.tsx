import { useState, type FormEvent } from 'react'

interface AuthModalProps {
  mode: 'sign-up' | 'log-in'
  onSignUp: (email: string, password: string, name: string) => Promise<void>
  onSignIn: (email: string, password: string) => Promise<void>
  onResetPassword: (email: string) => Promise<void>
  onClose: () => void
}

export function AuthModal({ mode: initialMode, onSignUp, onSignIn, onResetPassword, onClose }: AuthModalProps) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signedUp, setSignedUp] = useState(false)
  const [forgotPassword, setForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'sign-up') {
        await onSignUp(email, password, name)
        setSignedUp(true)
      } else {
        await onSignIn(email, password)
        onClose()
      }
    } catch (err) {
      // Always log the raw error -- Supabase auth errors are sometimes not
      // useful Error instances (e.g. a server-side email-sending failure can
      // surface as an empty/malformed body), so err.message alone can be an
      // unhelpful "{}" or similar. Fall back through a few extraction
      // strategies rather than showing that directly.
      console.error('Auth error', err)
      const message =
        err instanceof Error && err.message && err.message !== '{}'
          ? err.message
          : 'Something went wrong. Please try again -- if this keeps happening, the account email service may be misconfigured.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onResetPassword(email)
      setResetSent(true)
    } catch (err) {
      console.error('Reset password error', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        {resetSent ? (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-slate-800">Check your email</h2>
            <p className="text-sm text-slate-600">
              If an account exists for <span className="font-medium">{email}</span>, we sent a link to
              reset your password.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : forgotPassword ? (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-800">Reset your password</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-500">
              Enter your email and we'll send you a link to set a new password.
            </p>

            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50"
            >
              Send reset link
            </button>

            <button
              type="button"
              onClick={() => {
                setForgotPassword(false)
                setError(null)
              }}
              className="w-full text-sm text-slate-500 hover:text-slate-700 hover:underline"
            >
              Back to log in
            </button>
          </form>
        ) : signedUp ? (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-slate-800">Check your email</h2>
            <p className="text-sm text-slate-600">
              We sent a confirmation link to <span className="font-medium">{email}</span>. Click it to
              finish creating your account — your local data will transfer over automatically.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-800">
                {mode === 'sign-up' ? 'Create an account' : 'Log in'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {mode === 'sign-up' && (
              <p className="text-sm text-slate-500">
                Your existing board data will transfer to this account automatically.
              </p>
            )}

            {mode === 'sign-up' && (
              <div>
                <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                {mode === 'log-in' && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPassword(true)
                      setError(null)
                    }}
                    className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50"
            >
              {mode === 'sign-up' ? 'Sign up' : 'Log in'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'sign-up' ? 'log-in' : 'sign-up')
                setError(null)
              }}
              className="w-full text-sm text-slate-500 hover:text-slate-700 hover:underline"
            >
              {mode === 'sign-up' ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
