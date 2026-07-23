import { useState } from 'react'
import { StarIcon } from './icons'
import { useModalDismiss } from '../hooks/useModalDismiss'
import { submitFeedback } from '../lib/feedback'

interface FeedbackModalProps {
  userId: string | null
  onClose: () => void
}

export function FeedbackModal({ userId, onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  useModalDismiss(onClose)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await submitFeedback(rating, comment, userId)
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
          <h2 className="text-lg font-medium text-ink-800">Feedback</h2>
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
          <p className="text-sm text-emerald-600">Thanks for the feedback!</p>
        ) : (
          <>
            <p className="text-sm text-ink-600">
              How's the app working for you? Ratings and recommendations both help.
            </p>

            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} star${value === 1 ? '' : 's'}`}
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5"
                >
                  <StarIcon
                    className={`w-6 h-6 ${
                      (hoverRating || rating) >= value ? 'text-amber-400 fill-amber-400' : 'text-ink-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything you'd recommend we add or change? (optional)"
              rows={4}
              maxLength={2000}
              className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink-400"
            />

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
                disabled={rating === 0 || submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700 disabled:opacity-40"
              >
                Submit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
