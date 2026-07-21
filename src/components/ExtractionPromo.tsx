import { ExtractionDemoAnimation } from './ExtractionDemoAnimation'

interface ExtractionPromoProps {
  onSignUp: () => void
}

// Guest-only discovery card for AI screenshot extraction (AUDIT.md C6).
// Guests never see the real "Extract from screenshot" button -- it's gated
// on being signed in (ApplicationForm.tsx) -- so without this the feature
// is invisible to exactly the people arriving from an ad for it.
//
// Rendered only on the two empty states, so it needs no dismiss button and
// no persisted "dismissed" flag: an empty board IS the dismissal
// condition, and the card disappears for good the moment a guest adds
// anything. That's deliberate -- a promo the user has to dismiss every
// session is the thing this design is avoiding.
//
// Extraction genuinely cannot run without an account (the monthly quota is
// per-user), so the CTA opens sign-up rather than pretending to start a
// flow it can't finish.
export function ExtractionPromo({ onSignUp }: ExtractionPromoProps) {
  return (
    <div className="mt-8 max-w-sm rounded-lg border border-slate-200 bg-white p-4 text-left">
      <div className="rounded-md bg-slate-50 p-3">
        <ExtractionDemoAnimation />
      </div>
      <h3 className="mt-3 text-sm font-medium text-slate-800">Skip the typing</h3>
      <p className="mt-1 text-sm text-slate-500">
        Screenshot a job posting and we'll fill in the details. Free with an account.
      </p>
      <button
        type="button"
        onClick={onSignUp}
        className="mt-3 text-sm font-medium text-slate-700 underline decoration-slate-300 hover:decoration-slate-600"
      >
        Extract from screenshot
      </button>
    </div>
  )
}
