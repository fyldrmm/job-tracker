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
          Creating an account requires an email address, a password, and a name. The name is only
          used to greet you in the app, and is stored alongside your login details in Supabase Auth.
          We don't collect or request any other personal information.
        </p>

        <h3 className="font-medium text-slate-800 pt-2">AI extraction</h3>
        <p>
          If you use "Extract with AI" when adding an application, the image you pick is sent
          to Anthropic's API so the job details can be read out of it and used to pre-fill the form.
          This only happens when you explicitly choose a screenshot — nothing is sent otherwise. We
          don't store the screenshot itself; we record only the time of each extraction and how many
          tokens it used, so we can enforce the monthly free limit.
        </p>

        <h3 className="font-medium text-slate-800 pt-2">Who else is involved</h3>
        <p>
          Running the app means a few other services handle your data on our behalf: Supabase
          (database and accounts), Anthropic (only the screenshots you submit for extraction, as
          above), Resend (sends the confirmation email when you request account deletion), and
          Cloudflare (hosting). We don't share your data with anyone beyond what's needed to run
          these parts of the app.
        </p>

        <h3 className="font-medium text-slate-800 pt-2">Your controls</h3>
        <p>
          If you have an account, you can export all of your data as a JSON file at any time using
          the "Export data" link, and you can permanently delete your account and all associated data
          using "Delete account" — this cannot be undone. Without an account there's nothing for us
          to export or delete: your data is only in your own browser, and clearing your browser
          storage removes it.
        </p>

        <h3 className="font-medium text-slate-800 pt-2">What we don't do</h3>
        <p>
          We don't sell your data, use it for advertising, or track you across other sites.
        </p>

        <h3 className="font-medium text-slate-800 pt-2">Contact</h3>
        <p>
          Questions about your data, or anything else?{' '}
          {/* Static, first-party mailto. isSafeHttpUrl() in src/lib/url.ts deliberately
              rejects mailto: -- that guard is for user-supplied job_link values (L3),
              and does not apply here. Don't "fix" this by routing it through that check. */}
          <a href="mailto:fazare@fazare.dev" className="text-slate-800 underline hover:text-slate-600">
            fazare@fazare.dev
          </a>
        </p>
      </div>
    </div>
  )
}
