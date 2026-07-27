import { useState } from 'react'
import { useModalDismiss } from '../hooks/useModalDismiss'
import { subscribeToNewsletter } from '../lib/newsletter'

interface NewsletterModalProps {
  email: string
  onClose: () => void
}

export function NewsletterModal({ email: initialEmail, onClose }: NewsletterModalProps) {
  const [email, setEmail] = useState(initialEmail)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  useModalDismiss(onClose)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await subscribeToNewsletter(email)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-ink-800">AI CV Helper</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-400 hover:text-ink-700 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <p className="text-sm text-emerald-600">You're on the list — look out for our next update.</p>
        ) : (
          <>
            <p className="text-sm text-ink-600">
              We're building an AI CV Helper — coming soon. Join the newsletter for app updates, and job-search
              tips on the weeks we don't have any.
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink-400"
            />

            <label className="flex items-start gap-2 text-sm text-ink-600">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              I'd like to receive OfferTrail's newsletter. I can unsubscribe anytime.
            </label>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-ink-600 rounded-md hover:bg-ink-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!consent || !email || submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700 disabled:opacity-40"
              >
                Subscribe
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
