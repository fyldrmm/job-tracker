interface AccountNudgeBannerProps {
  onSignUp: () => void
  onDismiss: () => void
}

export function AccountNudgeBanner({ onSignUp, onDismiss }: AccountNudgeBannerProps) {
  return (
    <div className="flex items-center justify-between gap-4 bg-amber-50 border-b border-amber-200 px-6 py-2 text-sm text-amber-900">
      <span>
        You're using this as a guest — your data is only on this device. Clearing your browser could
        lose it.{' '}
        <button type="button" onClick={onSignUp} className="font-medium underline hover:no-underline">
          Create a free account
        </button>{' '}
        to keep it safe.
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-amber-700 hover:text-amber-900 shrink-0"
      >
        ✕
      </button>
    </div>
  )
}
