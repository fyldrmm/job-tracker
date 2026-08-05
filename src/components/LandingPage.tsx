import { useState } from 'react'
import { LogoMark } from './Logo'
import { BoardIcon, BellIcon, NoteIcon, ExtensionIcon, GoogleIcon } from './icons'
import { EXTENSION_URL } from '../lib/constants'

interface LandingPageProps {
  onContinueAsGuest: () => void
  onSignUp: () => void
  onLogIn: () => void
  onGoogleSignIn: () => Promise<void>
  // Only set for the voluntary reopen (the top chevron, once someone
  // already has access) -- renders a close button. The forced first-visit
  // splash never gets this prop; "Continue as guest" is that gate's own
  // dismiss action, not a separate close control.
  onDismiss?: () => void
  // Set when a signed-in user reopens this page (voluntary reopen only --
  // the forced gate never shows for a signed-in user in the first place).
  // Swaps the button row for a personalized welcome, since asking them to
  // sign up or log in again would be nonsensical.
  signedInName?: string
}

export function LandingPage({
  onContinueAsGuest,
  onSignUp,
  onLogIn,
  onGoogleSignIn,
  onDismiss,
  signedInName,
}: LandingPageProps) {
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  // Same shape as AuthModal's handleGoogleClick: signInWithOAuth navigates
  // away almost immediately on success, so an error here only ever means
  // something failed BEFORE the redirect (e.g. the provider isn't
  // enabled) -- there's no "success" state to render.
  async function handleGoogleClick() {
    setGoogleError(null)
    setGoogleSubmitting(true)
    try {
      await onGoogleSignIn()
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setGoogleSubmitting(false)
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
        ) : (
          <div className="w-full max-w-md flex flex-col gap-2.5 mb-3">
            <button
              type="button"
              onClick={onSignUp}
              className="w-full px-4 py-3 text-sm font-medium text-ink-900 bg-white rounded-lg hover:bg-white/90"
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={googleSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-white/10 backdrop-blur border border-white/25 rounded-lg hover:bg-white/20 disabled:opacity-50"
            >
              <GoogleIcon className="w-4 h-4" />
              Continue with Google
            </button>
            {googleError && <p className="text-sm text-rose-300 text-center">{googleError}</p>}
            <button
              type="button"
              onClick={onLogIn}
              className="w-full px-4 py-3 text-sm font-medium text-white bg-white/10 backdrop-blur border border-white/25 rounded-lg hover:bg-white/20"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="w-full px-4 py-3 text-sm font-medium text-white/70 border border-white/20 rounded-lg hover:text-white hover:border-white/40"
            >
              Continue as guest
            </button>
          </div>
        )}

        {/* Feature glance -- short labels, not sentences */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-white/70">
          <Feature icon={<BoardIcon className="w-4 h-4" />} label="Board, table & insights" />
          <Feature icon={<BellIcon className="w-4 h-4" />} label="Follow-up reminders" />
          <Feature icon={<NoteIcon className="w-4 h-4" />} label="AI autofill" />
          <Feature icon={<ExtensionIcon className="w-4 h-4" />} label="Browser extension" href={EXTENSION_URL} />
        </div>
      </div>
    </div>
  )
}

// href is optional -- only the extension entry links out (to the Chrome
// Web Store); the other three describe in-app features with nowhere to
// send someone before they've even signed up.
function Feature({ icon, label, href }: { icon: React.ReactNode; label: string; href?: string }) {
  const content = (
    <>
      {icon}
      {label}
    </>
  )
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-sm hover:text-white underline decoration-white/30 hover:decoration-white/70"
      >
        {content}
      </a>
    )
  }
  return <span className="flex items-center gap-2 text-sm">{content}</span>
}
