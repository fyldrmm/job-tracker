interface CheckoutReturnBannerProps {
  outcome: 'success' | 'canceled'
  onDismiss: () => void
}

// Shown once when Stripe Checkout redirects back (see the Worker's
// success_url/cancel_url). The 'success' copy deliberately doesn't promise
// Pro is already active: entitlement flips when the
// checkout.session.completed webhook lands, which is usually immediate but
// isn't guaranteed to beat this redirect -- claiming "you're Pro now" would
// be a lie in the race where it hasn't arrived yet.
export function CheckoutReturnBanner({ outcome, onDismiss }: CheckoutReturnBannerProps) {
  const isSuccess = outcome === 'success'
  return (
    <div
      role="status"
      className={
        isSuccess
          ? 'flex items-center justify-between gap-4 bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-sm text-emerald-900'
          : 'flex items-center justify-between gap-4 bg-ink-50 border-b border-ink-200 px-6 py-2 text-sm text-ink-700'
      }
    >
      <span>
        {isSuccess
          ? 'Payment received — thank you. Your Pro features unlock as soon as the confirmation reaches us, usually within a few seconds.'
          : 'Checkout canceled — you have not been charged.'}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className={isSuccess ? 'text-emerald-700 hover:text-emerald-900 shrink-0' : 'text-ink-500 hover:text-ink-800 shrink-0'}
      >
        ✕
      </button>
    </div>
  )
}
