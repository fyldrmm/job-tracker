interface MigrateGuestDataModalProps {
  onConfirm: () => void
  onDecline: () => void
}

export function MigrateGuestDataModal({ onConfirm, onDecline }: MigrateGuestDataModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-medium text-slate-800">Bring in your guest data?</h2>
        <p className="text-sm text-slate-600">
          This device has application data saved from using the app as a guest, separate from your
          account. Add it to your account?
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onDecline}
            className="px-4 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100"
          >
            Leave it as guest data
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700"
          >
            Add to my account
          </button>
        </div>
      </div>
    </div>
  )
}
