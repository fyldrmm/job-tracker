import type { Application } from '../types/application'

interface DeleteApplicationModalProps {
  application: Application
  onConfirm: () => void
  onClose: () => void
}

export function DeleteApplicationModal({ application, onConfirm, onClose }: DeleteApplicationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-medium text-slate-800">
          Delete "{application.company}"?
        </h2>
        <p className="text-sm text-slate-600">
          This permanently deletes {application.company} -- {application.role_title}. There's no undo.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100"
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
