interface PrivacyPolicyProps {
  onBack: () => void
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-slate-600 hover:text-slate-800 mb-4"
      >
        ← Back to board
      </button>

      <div className="max-w-2xl space-y-4 text-sm text-slate-700">
        <h2 className="text-lg font-medium text-slate-800">Privacy policy</h2>

        <p>
          Job Application Tracker is a free tool for tracking job applications. This page explains
          what data we store and how you control it.
        </p>

        <h3 className="font-medium text-slate-800 pt-2">What we store</h3>
        <p>
          Company, role, dates, stage, and any notes you add for each application you track. If you
          use the app without an account, this data lives only in your browser (IndexedDB) and never
          reaches our servers. If you create an account, this same data is stored in our database
          (Supabase), scoped so only you can read or write it.
        </p>

        <h3 className="font-medium text-slate-800 pt-2">Account data</h3>
        <p>
          Creating an account only requires an email address and password. We don't collect or
          request any other personal information.
        </p>

        <h3 className="font-medium text-slate-800 pt-2">Your controls</h3>
        <p>
          You can export all of your data as a JSON file at any time using the "Export data" link,
          whether or not you have an account. If you have an account, you can permanently delete it
          and all associated data using "Delete account" — this cannot be undone.
        </p>

        <h3 className="font-medium text-slate-800 pt-2">What we don't do</h3>
        <p>
          We don't sell your data, share it with third parties, or use it for advertising. We don't
          track you across other sites.
        </p>
      </div>
    </div>
  )
}
