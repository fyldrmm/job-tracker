import type { Application } from '../types/application'
import { useModalDismiss } from '../hooks/useModalDismiss'

interface DeleteApplicationModalProps {
  applications: Application[]
  onConfirm: () => void
  onClose: () => void
}

export function DeleteApplicationModal({ applications, onConfirm, onClose }: DeleteApplicationModalProps) {
  useModalDismiss(onClose)
  const [first] = applications
  const isBulk = applications.length > 1
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-medium text-ink-800">
          {isBulk ? `Delete ${applications.length} applications?` : `Delete "${first.company}"?`}
        </h2>
        <p className="text-sm text-ink-600">
          {isBulk
            ? `This permanently deletes ${applications.length} applications. There's no undo.`
            : `This permanently deletes ${first.company} -- ${first.role_title}. There's no undo.`}
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ink-600 rounded-md hover:bg-ink-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
