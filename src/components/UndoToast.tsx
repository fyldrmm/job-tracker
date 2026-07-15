interface UndoToastProps {
  message: string
  onUndo: () => void
}

export function UndoToast({ message, onUndo }: UndoToastProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-md shadow-lg px-4 py-3 flex items-center gap-4 z-50">
      <span className="text-sm">{message}</span>
      <button type="button" onClick={onUndo} className="text-sm font-medium underline hover:no-underline">
        Undo
      </button>
    </div>
  )
}
