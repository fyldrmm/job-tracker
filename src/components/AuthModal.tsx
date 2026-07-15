import { useState, type FormEvent } from 'react'

interface AuthModalProps {
  mode: 'sign-up' | 'log-in'
  onSignUp: (email: string, password: string) => Promise<void>
  onSignIn: (email: string, password: string) => Promise<void>
  onClose: () => void
}

export function AuthModal({ mode: initialMode, onSignUp, onSignIn, onClose }: AuthModalProps) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signedUp, setSignedUp] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'sign-up') {
        await onSignUp(email, password)
        setSignedUp(true)
      } else {
        await onSignIn(email, password)
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        {signedUp ? (
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
              <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
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
