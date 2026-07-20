interface ErrorToastProps {
  message: string
  onDismiss: () => void
}

export function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-rose-600 text-white rounded-md shadow-lg px-4 py-3 flex items-center gap-4 z-50">
      <span className="text-sm">{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-sm font-medium underline hover:no-underline">
        Dismiss
      </button>
    </div>
  )
}
