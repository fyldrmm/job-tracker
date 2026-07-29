import { useState } from 'react'
import { LogoMark } from './Logo'
import { BoardIcon, BellIcon, NoteIcon } from './icons'
import { subscribeToNewsletter } from '../lib/newsletter'

interface LandingPageProps {
  onContinueAsGuest: () => void
  onLogIn: () => void
  // Reports the subscribed email upward so a later "Sign up" doesn't ask
  // for it a second time (see AuthModal's initialEmail).
  onSubscribed: (email: string) => void
  // Only set for the voluntary reopen (the top chevron, once someone
  // already has access) -- renders a close button. The forced first-visit
  // gate never gets this prop, so there is no way to bypass the beta's
  // newsletter requirement other than subscribing or logging in.
  onDismiss?: () => void
  // Set when a signed-in user reopens this page (voluntary reopen only --
  // the forced gate never shows for a signed-in user in the first place).
  // Swaps the email form and "Log in" link for a personalized welcome,
  // since asking them to log in again would be nonsensical.
  signedInName?: string
}

export function LandingPage({
  onContinueAsGuest,
  onLogIn,
  onSubscribed,
  onDismiss,
  signedInName,
}: LandingPageProps) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await subscribeToNewsletter(email)
      setSubmitted(true)
      onSubscribed(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-cover bg-center"
      style={{ backgroundImage: 'url(/landing-bg.jpg)' }}
    >
      {/* Scrim: guarantees text contrast regardless of where the image's
          bright glow lands under the content at any viewport size. */}
      <div className="absolute inset-0 bg-black/55" />

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="fixed top-4 right-4 z-10 text-white/70 hover:text-white text-2xl leading-none"
        >
          ✕
        </button>
      )}

      <div className="relative min-h-full flex flex-col items-center justify-center px-6 py-12">
        {/* Logo + honest beta signal. Plain text for the wordmark, not the
            LogoOfferWord SVG -- that component's fill is a hardcoded dark
            green, unreadable against this background. */}
        <div className="flex items-center gap-2.5 mb-8">
          <span className="shrink-0 w-8 h-8 rounded-[8px] overflow-hidden">
            <LogoMark className="w-full h-full" />
          </span>
          <span className="text-[26px] leading-none font-semibold text-white">
            Offer<span className="font-medium text-white/70">Trail</span>
          </span>
          <span className="ml-1 text-[11px] uppercase tracking-wide text-white/80 bg-white/15 border border-white/20 rounded-full px-2 py-0.5 font-semibold">
            Beta
          </span>
        </div>

        {/* Problem-first hook */}
        <h1 className="max-w-xl text-center text-3xl sm:text-4xl font-semibold text-white leading-tight mb-4">
          You've applied to dozens of jobs. Which ones are you forgetting to chase?
        </h1>
        <p className="max-w-md text-center text-lg text-white/75 mb-9">
          OfferTrail keeps every application, interview, and follow-up in one place.
        </p>

        {/* Primary CTA: waitlist email capture -- required for beta access,
            no skip. Signed-in users reopening this page skip all of that. */}
        {signedInName ? (
          <div className="w-full max-w-md text-center bg-black/40 backdrop-blur border border-white/20 rounded-xl p-6 mb-3">
            <p className="text-white font-medium mb-1">Welcome, {signedInName}!</p>
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="w-full px-4 py-3 text-sm font-medium text-ink-900 bg-white rounded-lg hover:bg-white/90"
            >
              Continue to your board →
            </button>
          </div>
        ) : submitted ? (
          <div className="w-full max-w-md text-center bg-black/40 backdrop-blur border border-white/20 rounded-xl p-6 mb-3">
            <p className="text-emerald-400 font-medium mb-1">You're subscribed ✓</p>
            <p className="text-sm text-white/70 mb-4">We'll email you when v1 launches.</p>
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="w-full px-4 py-3 text-sm font-medium text-ink-900 bg-white rounded-lg hover:bg-white/90"
            >
              Start tracking now →
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md mb-3">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className="flex-1 rounded-lg border border-white/25 px-4 py-3 text-sm bg-white/10 backdrop-blur text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-3 text-sm font-medium text-ink-900 bg-white rounded-lg hover:bg-white/90 disabled:opacity-40 whitespace-nowrap"
              >
                {submitting ? 'Requesting…' : 'Get Access'}
              </button>
            </form>
            {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
            <p className="mt-2 text-xs text-white/60 text-center">
              Joins our newsletter for beta access — unsubscribe anytime.
            </p>
          </div>
        )}

        {!signedInName && (
          <button
            type="button"
            onClick={onLogIn}
            className="text-sm text-white/70 hover:text-white"
          >
            Already have an account? Log in
          </button>
        )}

        {/* Feature glance -- short labels, not sentences */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-white/70">
          <Feature icon={<BoardIcon className="w-4 h-4" />} label="Board, table & insights" />
          <Feature icon={<BellIcon className="w-4 h-4" />} label="Follow-up reminders" />
          <Feature icon={<NoteIcon className="w-4 h-4" />} label="AI autofill" />
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2 text-sm">
      {icon}
      {label}
    </span>
  )
}
