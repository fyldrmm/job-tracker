# PLAN.md — Job Application Tracker (MVP)

This file is the project's memory across Claude Code sessions. Claude Code has no memory between sessions, so **this file + git history are the source of truth for progress.** Read it at the start of every session; update it as you go.

Full spec: see `job-tracker-mvp-brief.md` in the repo root.

---

## Working protocol (read every session)

1. **Read `job-tracker-mvp-brief.md` and this file first**, then inspect the current state of the code before doing anything.
2. **Do exactly one milestone per session.** Complete only the milestone named in the prompt. Do **not** start the next milestone — stop when the current one is done and the app runs.
3. **Plan before executing.** Produce an execution plan for the milestone and wait for the user's approval before writing code.
4. **Commit after every working sub-step** with a clear message. Small, frequent commits mean an interrupted session loses only the uncommitted tail.
5. **Update this file as you go** — check off completed items and keep the "Current status" section accurate. The next session depends on it.
6. **End each milestone in a runnable, committed state.** The app should launch and the milestone's slice should work before you stop.
7. If you hit a blocker or make a decision worth remembering, note it under "Decisions & notes" below.

---

## Current status

- **Active milestone:** none — all 6 MVP milestones done, plus four post-MVP feature passes (nav redesign + a drag bugfix; multiple named trackers; Archive grouping/sort/reason-filter; hosting; deletion-confirmation email). Both SQL migrations (`0002_delete_account.sql`, `0003_trackers.sql`) have been run by the user, and the `delete-account` Edge Function is deployed.
- **Last completed:** Deletion-confirmation email, via a new `delete-account` Edge Function — the project's first server-side infra beyond SQL migrations. Also closed a real security gap found while building it: account-deletion password verification now happens server-side (inside the function), not just client-side, so a bare stolen session token can no longer delete an account without the password too. See "Post-MVP — Deletion-confirmation email" below.
- **App runs?** yes — both locally (`npm run dev`) and live in production
- **Resend domain verified:** user bought `fazare.dev` on Cloudflare, verified it in Resend, and updated Supabase's custom SMTP to send from it — the sandbox "only sends to the account owner's own email" restriction is gone. Confirmed working live (bogus-login test hit Supabase's real Auth API from the deployed site).
- **Supabase Auth users:** cleaned up — only the primary account remains, both leftover test/secondary accounts were deleted by the user directly in the dashboard.
- **Next action:** nothing blocking, nothing postponed. Every request raised so far is built, verified, and live — see "Postponed / deferred" below (currently empty of open items). Next steps are entirely new requests from the user.

---

## Milestones

### M1 — Foundation  *(effort: High)* — ✅ done
- [x] Scaffold frontend (React + Vite + TS + Tailwind, or house stack)
- [x] Create Supabase project; **enable RLS on all tables from the start**
- [x] Define schema: `applications` and `stage_history` (with enums per brief §5)
- [x] Set up IndexedDB local store mirroring the same shape
- [x] App shell runs (empty board placeholder is fine)
- [x] Committed; PLAN.md updated

### M2 — Board + manual entry (local-only, usable)  *(effort: High)* — ✅ done
- [x] Kanban board with 4 columns: Eyes on, Applied, Interview, Offer
- [x] Card front shows company, role title, date applied (only these three)
- [x] Add/edit application form: company*, role*, date applied* (default today), job link, salary, location, notes
- [x] New cards land in the triggering column (default Applied); form also edits existing
- [x] Data persists to the local store; board is fully usable as a guest
- [x] Committed; PLAN.md updated

### M3 — Movement + detail  *(effort: Extra high — dnd is fiddly)* — ✅ done, incl. follow-up fixes
- [x] Drag-and-drop cards between columns (dnd-kit); keyboard-accessible; real mouse-drag confirmed by user
- [x] Moving a card updates `current_stage` and appends a `stage_history` row
- [x] Card detail view (panel/modal) showing all fields, with edit
- [x] Committed; PLAN.md updated
- [x] Bonus (user request): double-click a card advances it to the next stage; triple-click retreats it to the previous stage — trackpad-friendly alternatives to dragging
- [x] Bugfix: dragged card no longer renders under other columns (switched to dnd-kit's `DragOverlay`)
- [x] Bugfix: focus ring on the first card in a column no longer clipped by the column header

### M4 — Archive + undo  *(effort: High)* — ✅ done
- [x] Split-button archive: main button archives with default reason **Rejected**; **▾** opens reasons (Rejected / Withdrawn / No response / Accepted)
- [x] `current_stage` preserved on archive; `is_archived`, `archive_reason`, `archived_at` set
- [x] Separate Archive view listing archived items, with **un-archive**
- [x] Quiet archived count on the board, linking into the Archive view
- [x] Undo toast (~10s) after archiving; **Ctrl/Cmd+Z undoes the last archive** (last-archive only)
- [x] Committed; PLAN.md updated

### M5 — Auth + guest→account migration  *(effort: Extra high — highest-risk, correctness-critical)* — ✅ done, fully verified incl. live manual QA
- [x] Supabase Auth: sign up / log in
- [x] Gentle, **dismissible** account-nudge banner (warns about data loss without an account)
- [x] **Migration:** on account creation by a guest, upload ALL local data into the new account with **zero loss**; idempotent (upsert by primary key + a local "already migrated" flag). Verified both by a mocked-client logic test AND a live signup → email confirm → migration round trip (user-run manual QA, all steps passed: data present after migration, correct `user_id` in Supabase, survives reload, survives sign-out/sign-in)
- [x] After migration, Supabase is source of truth; local store acts as write-through cache (reads fall back to it if offline; no offline-write queue — that's still deferred, see below)
- [x] Verify RLS: a signed-in user can read/write only their own rows — re-confirmed via curl (unaffected by M5, schema unchanged)
- [x] Committed; PLAN.md updated
- *Deferred (do not build): multi-device merge / offline-edit conflict resolution, and (newly scoped down in M5) offline writes — writes require being online while signed in.*

### M6 — GDPR + polish  *(effort: High)* — built, needs migration + manual QA for account deletion (see checklist)
- [x] Export all my data as JSON — works for guest (IndexedDB) and signed-in (Supabase); verified in-browser, correct filename and JSON shape
- [x] Delete my account (truly deletes all the user's data) — built (SQL migration + RPC + type-DELETE-to-confirm modal + password re-verification, added post-MVP per user request), **not yet verified live** — see checklist
- [x] Short privacy policy page — in-app view, linked from footer; verified
- [x] Empty states for board and columns — board-level empty state added for zero-data case (existing per-column "No applications yet" was already there from M2); verified
- [x] Optional: subtle "stale" indicator on old cards (in-app only, no notifications) — 14-day threshold on `updated_at`; verified with a seeded 20-day-old card
- [x] Optional: external donation link (e.g. Ko-fi) in the footer — added (points to ko-fi.com generically; swap in a real Ko-fi/Buy-Me-a-Coffee page before launch)
- [x] Committed; PLAN.md updated

#### Manual step + QA checklist for M6 (do this to finish the MVP)

1. In the Supabase dashboard's SQL editor, run `supabase/migrations/0002_delete_account.sql` (same process as the M1 schema and M5 note — paste and run).
2. `npm run dev`, sign in with an account that has some data (your M5 test account is fine, or a fresh one).
3. Hover the sidebar, click "Delete account" under Account. Enter your password and type `DELETE` to confirm, submit.
4. Try it once with the **wrong password** first — confirm you get an error and nothing is deleted.
5. Then with the correct password: confirm you're signed out and back to a fresh guest board (no leftover data from the deleted account).
6. In the Supabase dashboard's Table Editor, confirm the user's row is gone from `applications` (and check **Authentication → Users** — the account itself should be gone too, not just their data).
7. If step 3 errors out on the correct password, the most likely cause is step 1 not having been run yet (the RPC function won't exist) — double check that first before treating it as a code bug.

### Post-MVP — Multiple named trackers  *(user request, not in the original brief)* — built, needs migration + signed-in QA

- [x] Users can create/rename/delete named trackers (e.g. "US Applications" / "EU Applications"), each a fully separate 4-column board
- [x] Tab strip above the columns to switch between trackers; "+" to add, double-click to rename, hover "x" to delete
- [x] Archive stays a single shared view but groups entries by tracker (product decision, not per-tracker archives)
- [x] Deleting a tracker cascades everything in it; light one-click confirm if empty, type-the-name confirm if it has any applications
- [x] Pre-existing data (both Supabase and local IndexedDB) gets backfilled onto a default "My Applications" tracker if it predates trackers existing. **Revised after a bug — see #4 below:** brand-new guests/accounts with zero data are no longer auto-given a default tracker; they see an explicit "Create your first tracker" prompt instead.
- [x] Guest→account migration carries trackers across (uploaded before applications, since tracker_id is a FK)
- [x] Committed; PLAN.md updated

#### Manual step + QA checklist for multiple trackers

1. In the Supabase dashboard's SQL editor, run `supabase/migrations/0003_trackers.sql`. This is a real schema change with a data backfill (existing applications get assigned to a new per-user "My Applications" tracker) — read it over before running if you want to double check, though it's written to be safe for the current (essentially empty, pre-launch) data.
2. `npm run dev` as a guest first (already verified by me, but a quick sanity pass doesn't hurt): create a second tracker, add a card to each, confirm switching tabs actually isolates them, archive one from each and check the Archive view groups them by tracker name correctly.
3. Sign in with an account. This is the part I could not test myself (same sandbox limitation noted for M5/M6 — no live authenticated session reachable here). Confirm:
   - Your existing applications (if any) show up under a "My Applications" tracker automatically (the backfill).
   - You can create a second tracker, add a card, and it syncs to Supabase — check the `trackers` and `applications` tables in the dashboard's Table Editor to confirm `tracker_id` is set correctly.
   - Reload the page — both trackers and their cards should still be there (this proves the remote read path works, not just the write).
   - Delete a tracker with data in it — confirm the type-to-confirm gate works, and check the dashboard afterward that both the `trackers` row AND its `applications`/`stage_history` rows are actually gone (the cascade).
4. If anything in step 3 errors, the most likely culprits are (a) step 1 not run yet, or (b) RLS on the new `trackers` table — tell me the exact error and I'll fix it rather than you patching it directly, since the fix might need to account for the migration's backfill logic.

#### Bugs found and fixed after the checklist was first run

1. **Sign-out didn't clear the local cache** — fixed in `Board.tsx`'s `handleSignOut` (clears local store, resets active tracker, then signs out). User confirmed fixed (re-ran the checklist, sign-out step passed).
2. **Sign-up showed a bare "{}" error** — root cause confirmed via Supabase Auth logs: Resend's sandbox mode only delivers to the account owner's own verified email until a domain is verified at resend.com/domains; the signup attempt used a different real address (`fyildirimo2012@gmail.com`, the user's own secondary email — not a typo, corrected after initially misreading it as one) than the primary account owner's, which Resend rejected with a 550. Not a code bug — the AuthModal error-display hardening from the earlier commit stands regardless (never shows a bare "{}" again). **Resolved for real**: user bought `fazare.dev`, verified it on Resend, and updated Supabase's SMTP sender — sign-up with any real email now works, not just the account owner's own address.
3. **Data looked lost until a manual page reload after signup/login** — found during the SAME checklist re-run that confirmed #1 and #2. Root cause: the guest→account migration effect only refreshed `applications` after completing, never `trackers`. `useTrackers` has its own fetch triggered independently by the same `userId` change that starts migration, which could resolve on stale/empty data before migration's uploads landed, and nothing forced a second look once migration actually finished. Fixed by refreshing both applications and trackers once migration resolves. **User-confirmed fixed** (re-tested sign-out → sign back in, data present without a manual reload).
4. **Duplicate "My Applications" trackers piling up** — user noticed multiple unexpected tabs (including two identically-named "My Applications" ones) after repeated guest testing + eventual sign-up. Root cause: `useTrackers.refresh()` auto-created a "My Applications" tracker any time the list came back empty, including a brand-new guest's very first load with zero data — every fresh guest session (new browser/incognito/cleared storage) silently spawned its own tracker with a random UUID, and since they never merge by name, they all piled into the account once migrated. Fixed by removing the auto-create-on-empty behavior entirely: an empty tracker list is now a legitimate, expected state, surfaced as an explicit "Create your first tracker" button in `Board.tsx` (gated the header's "+ Add application" and the old empty-state CTA on `activeTrackerId` being set, since neither makes sense with zero trackers). Verified in-browser: fresh guest state shows the create-first-tracker prompt (no phantom tab), clicking it creates exactly one tracker, and a reload doesn't spawn a second one. Any pre-existing duplicate trackers from before this fix (e.g. the user's own test account) are just leftover data — safe to delete manually via the UI's tracker delete ("x" on each tab) whenever convenient, not a data-integrity issue.

### Post-MVP — Archive grouping & sort  *(user request)* — ✅ done, verified in-browser

- [x] "Group by tracker" checkbox in `ArchiveView.tsx`, on by default (matches prior behavior) — off shows one flat list across all trackers instead of tracker-name section headers
- [x] "Sort by" dropdown, kept as a separate control from the grouping toggle per user request (not folded into the same control): Date applied, Date archived, Company name, Notes. Salary range deliberately left out — `salary_range` is free text (e.g. "$90k–110k" vs "90000-110000"), not a structured number, so sorting by it wouldn't rank sensibly; revisit only if the schema ever gains a structured salary field.
- [x] "Notes" sort is two-tier per user spec: applications with non-empty notes first (alphabetical by company), then applications without notes (alphabetical by company) — a small `NoteIcon` marks cards that have notes, in both the archive list and (implicitly, since it's not hidden) anywhere else that reuses the icon
- [x] When grouping is off, each row also shows its tracker name inline (needed for the flat view to stay legible — not explicitly requested but a direct consequence of the toggle)
- [x] `CardDetail.tsx` now shows the owning tracker's name (small label above company/role) — passed in from `Board.tsx` via a `trackers.find(...)` lookup, not stored on the application itself
- [x] Added after initial build (user follow-up): a "Reasons (n)" multi-select filter dropdown (Rejected/Withdrawn/No response/Accepted), all checked by default, filtering applied before grouping/sorting. Design decision made with user input: unchecking the last remaining reason is a no-op (checkbox stays checked) rather than locking one specific reason (e.g. "Rejected") as protected — a generic "can't reach zero" rule was chosen over special-casing any one value. Verified in-browser: unchecking a reason hides matching cards immediately, and the last checked box can't be unchecked.
- [x] Committed; PLAN.md updated

### Post-MVP — Hosting  *(user request)* — ✅ done, live and verified

- [x] User bought `fazare.dev` on Cloudflare (temporary domain, expected to change once a permanent project name is picked), verified it on Resend, and pointed Supabase's SMTP sender at it
- [x] Deployed via Cloudflare's unified Workers/Pages platform (connected to the `fyldrmm/job-tracker` GitHub repo, production branch `main`, build command `npm run build`, output `dist`), project named generically (`job-tracker`, not `fazare`) so the custom domain can change later without recreating the project
- [x] Live at `jobtracker.fazare.dev`
- [x] **Bug found and fixed during first deploy:** the site loaded as a fully blank white page. Root cause: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` weren't set in Cloudflare's build-time variables, so `createClient('', '')` threw synchronously in `src/lib/supabase.ts` and crashed the entire React tree before any render — including guest mode, which the code's own warning message incorrectly claimed would still work. Fixed two ways: (1) the real fix — user found the correct settings location (Cloudflare's newer Workers-based deploy model splits "Variables and secrets" into a *runtime* section, which refuses variables for static-asset-only projects, versus a separate *Build* section's "Variables and secrets" that actually feeds `npm run build` — the build-time one is what needed the two `VITE_` vars) and added them there, then retried the deployment; (2) a defensive code fix regardless — `supabase.ts` now falls back to a syntactically-valid placeholder URL/key when the env vars are missing, so a future misconfigured deploy degrades to a working guest-only board instead of a blank crash.
- [x] Verified live: guest mode renders correctly with no console warnings (confirming real env vars are now baked in), and a bogus login attempt returned Supabase's actual "Invalid login credentials" response (confirming the deployed client is really talking to the live Supabase project, not the placeholder fallback)
- [x] Confirmed deploys are automatic going forward — every push to `main` triggers a new Cloudflare build without manual intervention; the one manual "retry deployment" was only needed because the *existing* build predated the env var fix
- [x] Committed; PLAN.md updated

### Post-MVP — Deletion-confirmation email  *(user request)* — ✅ done, live and verified

- [x] New `supabase/functions/delete-account/index.ts` Edge Function — first server-side infra this project has used (Deno runtime, deployed by pasting into the Supabase dashboard's Edge Functions editor since no CLI link is set up). Sends a best-effort confirmation email via Resend (`RESEND_API_KEY` as a Function secret) BEFORE calling `delete_own_account()`, since the user's email no longer exists to send to once that RPC has run. Email failure never blocks deletion — it's a notification, not a gate on the user's right to erase their data.
- [x] `src/lib/remoteStore.ts`'s `deleteOwnAccount()` now calls this function (`supabase.functions.invoke`) instead of the RPC directly.
- [x] User tested live: deletion email arrived correctly.
- [x] **Security hardening found and fixed during this build, not originally scoped:** the account-deletion password re-check (`DeleteAccountModal` → `signIn()`) only ever ran client-side, in the browser, before calling the deletion function. That stops the normal app UI but does nothing against someone who calls the Edge Function directly with just a stolen session token (XSS, a malicious browser extension, a shared/unlocked device) — no password needed, since the function itself only checked "is there a valid session," never the password. Fixed by moving password verification server-side: the function now requires the password in its request body and verifies it against Supabase Auth itself (via a separate `signInWithPassword` call inside the function) before proceeding. A bare stolen session token is no longer sufficient on its own. `Board.tsx`'s separate client-side `signIn()` call before deletion was removed since the function now does that check itself.
- [x] Prompted a broader security pass: audited every other write path (all `applications`/`stage_history`/`trackers` RLS policies, the `delete_own_account` RPC's `auth.uid()`-hardcoding, and the whole codebase for `dangerouslySetInnerHTML`/`eval`). Found no other gaps — every other table has proper `with check (auth.uid() = user_id)` on inserts/updates in `0001_init.sql`/`0003_trackers.sql`, so writes are enforced by Postgres itself, not client-side trust. Two minor, explicitly-declined-for-now items: `job_link` renders as a real `<a href>` (self-XSS risk only, since RLS means you can only ever see your own data — not fixed), and the delete-account function's CORS is wide open `*` (not a real hole given the function already requires a valid session + correct password regardless of calling origin — not fixed). Both logged here in case worth revisiting, not urgent.
- [x] Committed; PLAN.md updated

---

## Out of scope for MVP (do not build; don't design out)

Link auto-parsing · follow-up reminders (email/push) · alternate views (table/list, sorting/filtering) · mobile-first polish · full multi-level undo · real donations integration. See brief §8.

---

## Postponed / deferred (not forgotten, just not now)

Things explicitly pushed to later rather than built now or ruled out. Pick any of these up whenever — none are blocking.

Nothing currently on this list — every item raised so far has been either built or actioned. Two minor, explicitly-declined-for-now hardening items are logged in the "Deletion-confirmation email" milestone note above (`job_link` self-XSS risk, wide-open CORS on the delete-account function) in case worth revisiting later.

~~Hosting~~ — **done**, see "Post-MVP — Hosting" below.
~~Deletion-confirmation email~~ — **done**, see "Post-MVP — Deletion-confirmation email" below.
~~Old Supabase Auth accounts from testing~~ — **done**, user deleted both leftover accounts directly from the Supabase dashboard; only the primary account remains.
~~Show which tracker an archived application belongs to, inside `CardDetail.tsx`~~ — **done**, see "Post-MVP — Archive grouping & sort" below.
~~Real Ko-fi/donation flow verification~~ — **done**, user clicked through and confirmed it leads to the correct page.

---

## Decisions & notes

*(Claude Code: record anything future sessions should know here — stack choices made, gotchas hit, deviations from the brief and why.)*

- **Multi-tracker note — naming:** the new per-tab entity is called a "tracker" in code (table `trackers`, type `Tracker`, hook `useTrackers`) specifically to avoid colliding with the existing `Board` component name, which is the whole page shell (sidebar + header + the currently-active tracker's 4 columns). If you're looking for "where does switching between tabs happen," it's `activeTrackerId` state in `Board.tsx`, not a separate top-level component.
- **Multi-tracker note — auto-create-default-tracker removed entirely:** `useTrackers` originally auto-created a "My Applications" tracker any time a user's list came back empty, guarded by a `useRef` lock (`creatingDefaultRef`) added after StrictMode's dev-mode double-invoke of effects caused two concurrent `refresh()` calls to both create one, producing duplicates. That lock fixed the concurrency bug, but the underlying auto-create behavior itself turned out to be the wrong design — every brand-new guest session (new browser, incognito, cleared storage) still silently spawned its own default tracker, and since none of them shared an ID, they all piled up as real duplicate tabs once a user eventually signed up. Fixed for good by removing the auto-create branch entirely (see bug #4 in the multi-tracker checklist section) — an empty tracker list is now a legitimate state with an explicit "Create your first tracker" CTA, so `creatingDefaultRef` and the concurrency-guard code no longer exist in `useTrackers.ts`. Still worth remembering as a general pattern for future hooks: guard "check state, then conditionally create exactly one of X" logic against double-invocation — but better yet, ask whether that auto-create should exist at all versus being an explicit user action.
- **Multi-tracker note — archive scope:** per explicit product decision, there's one shared Archive view across all trackers (not one archive per tracker), grouped by tracker name within that single screen. If a future request asks for "per-tracker archive," that's a UI change to `ArchiveView.tsx`'s grouping (already computed) rather than a data model change.
- **Multi-tracker note — verification gap:** thoroughly verified in guest mode (isolation between trackers, archive grouping, rename, both delete-confirmation paths including checking the confirm button's actual `disabled` state rather than trusting a screenshot, and the cascade delete via direct IndexedDB inspection). Did NOT verify: the `0003_trackers.sql` migration itself, or any signed-in/remote tracker CRUD — same root cause as the M5/M6 gaps (no live authenticated Supabase session reachable in this sandbox). See the manual QA checklist under the milestone above.
- Stack: brief's default followed as-is — React + Vite (v8) + TS + Tailwind v4 (via `@tailwindcss/vite`, no separate config file needed — see `src/index.css`). Package manager: npm.
- Supabase project is live at `https://fjlmyaamarnjlthbhycx.supabase.co`. Schema in `supabase/migrations/0001_init.sql`, applied manually via the dashboard SQL editor (no CLI access token set up yet — the CLI's personal access token lives at supabase.com/dashboard/account/tokens, not the per-project settings, which is why it was hard to find). If a future session needs to push schema changes, either paste the new migration into the SQL editor manually, or get an access token then and use `supabase link` + `supabase db push`.
- `stage_history` has no `user_id` column (matches the brief's data model exactly). Its RLS policies scope through the parent `applications` row's ownership via an `EXISTS` subquery instead of a direct column check.
- Local Supabase credentials live in `.env` (gitignored, confirmed via `git check-ignore`). `.env.example` documents the two required keys with empty values.
- **Key naming note:** this Supabase project uses the newer key format — `sb_publishable_...` (goes in `VITE_SUPABASE_ANON_KEY`, safe client-side because RLS is on) and `sb_secret_...` (service-role equivalent — never put this in any `VITE_`-prefixed var or commit it; it was shared once in chat and should probably be rotated in the dashboard as routine hygiene).
- RLS verified end-to-end via curl against the REST API: unauthenticated reads return `[]` (not an error — RLS filters rows), unauthenticated inserts are rejected with a `42501` row-level-security violation.
- IndexedDB mirror (`src/lib/db.ts`, `src/lib/localStore.ts`) verified with a manual round-trip smoke test in the browser (write + read-back across reloads), then reverted out of `App.tsx` — that test code was temporary, not meant to ship.
- Auth method: **email + password** (decided). Email confirmation is left ON in Supabase (user's choice, safer default) — this means signUp() never returns an active session immediately; migration is triggered from `onAuthStateChange` reporting an active session, not from the signUp call itself. Keep that in mind if this ever needs modifying — the trigger point is intentional, not incidental.
- Hosting: _TBD, decide before M6 / launch._
- **M5 note — data layer architecture:** `useApplications(userId)` now branches on whether `userId` is null (guest → IndexedDB only, unchanged from M1-M4) or set (signed-in → Supabase is primary, mirrored into IndexedDB via `persistApplication`/`persistStageHistoryEntry` write-through helpers in the hook). Reads try Supabase first and fall back to the local cache (filtered by `user_id`) if the request fails — this is genuinely useful offline-read support, not just decoration. Writes do NOT have an offline queue: if you're signed in and offline, a write will throw. That's a deliberate scope cut — full offline-write sync needs conflict resolution, which the brief explicitly defers.
- **M5 note — migration trigger & idempotency:** `migrateGuestDataToAccount(userId)` in `src/lib/migration.ts` reads all local IndexedDB data, stamps `user_id`, and `upsert`s into Supabase (upsert-by-primary-key makes retries safe). It's gated by a `localStorage` flag (`job-tracker:migrated-for-user:<id>`) so it only actually runs once per user per browser, even though the upsert itself would also be safe to repeat. Called from a `useEffect` in `Board.tsx` keyed on `user` — fires whenever a session becomes active and hasn't migrated yet, which correctly covers the "confirmed email in a later browser session" case.
- **M5 note — testing limitation:** I could not complete the live signup → email-confirm → migration test myself in-session. I got surprisingly far — created a real test signup with a `mailinator.com` disposable address, found the confirmation email, and located the confirmation link — but the browser automation tool refused to navigate to `supabase.co` (a newly-encountered external origin) with a hard "denied" error, both via direct navigation and via clicking the link in-page. This appears to be a sandbox restriction on this environment, not something fixable in the app. I instead verified the migration function's correctness by temporarily exposing it on `window` in `main.tsx` (reverted before committing), mocking `supabase.from()` to capture calls without hitting the network, and confirming correct payload shape + idempotency. The user then ran the full live round trip themselves and confirmed it all works — see the M5 checklist item above. If a future session needs to test a live-auth flow, worth knowing upfront that this environment can't drive it end-to-end; plan for user-run manual QA on anything involving a real inbound email.
- **M5 note — custom SMTP configured, later upgraded with a real domain:** hit Supabase's default email sender rate limit (very low, meant for testing only) while verifying signup. Resolved by setting up custom SMTP via Resend (`smtp.resend.com`, port 465) under Supabase's **Project Settings → Authentication → SMTP Settings**, initially sending from the shared `onboarding@resend.dev` test domain (Resend sandbox mode — only delivers to the account owner's own verified email). Post-MVP, the user bought `fazare.dev` on Cloudflare, verified it on Resend (SPF/DKIM DNS records added in Cloudflare), and updated Supabase's SMTP sender to use it — the sandbox restriction is gone and sign-up now works with any real email address.
- M2 note: clicking a card currently opens the edit form directly (not a detail view) — M3 replaces this with the real card detail panel per brief §6.3. Kept the same `ApplicationForm` component for both add and edit (branches on whether `initial` is set) rather than two separate forms.
- M2 note: "Eyes on" quick-action question from brief §10 is still open — no explicit "mark as applied" button yet, drag-and-drop (M3) will be the only way to change stage until/unless we decide to add one.
- Browser-preview tooling note (not a product decision): coordinate-based clicks in the in-app browser tool didn't line up with visual screenshot coordinates during testing; ref-based clicks (from `read_page`) worked correctly. Worth using refs over raw coordinates when verifying UI in future sessions.
- **M3 follow-up (resolved):** user manually confirmed real mouse-drag works, and found three bugs, all now fixed: (1) dragged card rendered under other columns — fixed by rendering the drag preview through dnd-kit's `DragOverlay` (portals to `document.body`, immune to column overflow/stacking) instead of relying on the dragged element's own `transform`; the original card fades to `opacity-30` in place while the overlay copy follows the pointer. (2) Focus ring on the first card in a column was clipped by the column header — the scrollable card list had `px-2 pb-2` with no top padding, so a focused card's ring at the very top had no room before `overflow-y-auto` clipped it; changed to `p-2` (uniform padding fixes it). (3) Added triple-click to retreat a card to the previous stage (`prevStage` in `src/lib/stages.ts`), mirroring double-click's advance.
- M3 note: click disambiguation in `Card.tsx` was reworked from "act immediately on the 2nd click" to a debounce — every click resets a `setTimeout`, and the action only fires once no further click arrives within 250ms, checking the accumulated click count (1/2/3+). This was necessary to add triple-click without it also firing the double-click action first. Tradeoff: double-click now waits the full 250ms after the second click before advancing, rather than firing instantly — not noticeable in practice.
- Tooling note: when testing via the browser automation tool's `javascript_tool`, a DOM query like `el.textContent.includes(X)` can match ancestor elements (e.g. `#root`) that also happen to contain the text — matched too loosely once and dispatched a click on the wrong element. Prefer an exact match (`el.textContent.trim() === X`) on the most specific element, then walk up via `.parentElement` to the actual interactive target. Same trap bit again in M4 testing when a list has multiple structurally-identical rows (Archive view) — `.find()` on a loose `textContent.includes()` predicate can match a shared ancestor container instead of one specific row, and then a nested `querySelectorAll('button').find(...)` grabs the first matching button in the WHOLE container rather than that row's button. When rows repeat, scope the query more tightly (e.g. match on unique text combos, or use `closest()`/index into a specific row element) before querying descendants.
- **M6 note — delete-account design:** Supabase's client SDK has no way for a user to delete their own `auth.users` row (that's normally a service-role-only operation, and the service-role key must never be in frontend code — see the M1 note on key naming). The fix is `delete_own_account()` in `supabase/migrations/0002_delete_account.sql`, a `SECURITY DEFINER` Postgres function hardcoded to `delete from auth.users where id = auth.uid()` — no parameter, so an authenticated caller can only ever delete themselves, never anyone else. This cascades through the existing `applications`/`stage_history` FKs (from `0001_init.sql`), so it's a genuine full wipe, not just an orphaned auth row with data left behind. Called via `supabase.rpc('delete_own_account')` in `src/lib/remoteStore.ts`.
- **M6 note — testing limitation, same root cause as M5:** I verified export, the privacy page, the empty state, and the stale badge directly in-browser. I could NOT verify account deletion live, for the same reason as M5's migration test — I have no live confirmed Supabase session in this sandbox (can't navigate to `supabase.co` to click a confirmation link). Deletion also requires the new migration to be run first, which I can't do myself either (no DB access beyond the anon key). See the M6 checklist above.
- **M6 note — export data structure:** `buildExportData(userId)` in `src/lib/export.ts` returns `{ exported_at, applications, stage_history }`. For guest it reads IndexedDB directly; for signed-in it reads Supabase (`getAllRemoteApplications` + `getAllRemoteStageHistory`, the latter relying on RLS to scope results rather than an explicit `.eq()` — no `user_id` column on `stage_history` to filter by, same reasoning as its RLS policies). Verified the actual downloaded blob content in-browser (not just that a download "happened") by temporarily patching `URL.revokeObjectURL` to a no-op so the blob URL survived long enough to `fetch()` and inspect.
- **Post-M6 note — drag flash-back bugfix:** `moveApplicationStage` in `src/hooks/useApplications.ts` previously only updated the visible `applications` state after the persistence write + `refresh()` resolved. But `handleDragEnd` in `Board.tsx` clears the drag overlay (and the original card's `opacity-30`) the instant the drop happens, synchronously. Since the persistence round trip takes longer than that, the card would briefly render back in its OLD column at full opacity before the write finished and the real reassignment appeared — a visible flash on every drag. Fixed with an optimistic `setApplications` update before the persistence calls, so the column reassignment lands in the same render as the drop. Same pattern is worth remembering for any other place that pairs an immediate visual teardown (overlay, modal close, etc.) with an async state-changing call — update state optimistically first, or persist first and only THEN tear down the visual, never tear down first and persist after.
- **Post-M6 note — nav redesign:** replaced the top bar (which had grown to 5+ buttons across M4-M6 and looked cluttered per user feedback) with `Sidebar.tsx` — a collapsed icon-only rail (`w-14`) that expands to `w-56` with labels on hover, using a `group`/`group-hover` Tailwind pattern (no JS hover-state needed). Two groups: Tracker (Job Tracker, Archived — with a live count badge) and Account (Export data always; Delete account [red + underlined] and Sign out when signed in, or Log in + Sign up as a guest). Hand-rolled minimal inline SVG icons in `src/components/icons.tsx` rather than adding an icon library dependency for 7 icons. `Board.tsx`'s header is now just the page title + contextual "+ Add application" (board view only) + the migration-in-progress indicator — everything else moved into the sidebar. `aria-label` added to each nav button so the label is announced regardless of hover state (the visible label is `opacity-0` until hover, which doesn't remove it from the accessibility tree, but the explicit `aria-label` is a belt-and-suspenders touch since it's easy to verify and free).
- **Post-M6 note — delete-account now requires password re-verification** (user request, real security value): `DeleteAccountModal` gained a password field alongside the existing type-DELETE-to-confirm text. `handleDeleteAccount` in `Board.tsx` now calls `signIn(user.email, password)` first — which throws on a wrong password, surfaced by the modal as an error, stopping before anything is touched — and only proceeds to the `delete_own_account` RPC if that re-auth succeeds.
- **Post-M6 note — deletion confirmation email deferred:** user also asked for an email notification when an account is deleted. This needs a Supabase Edge Function (new server-side infrastructure, distinct from everything built so far which is client + SQL migrations only) that verifies the caller's session and sends via Resend's API using a server-side secret (the Resend API key must never reach the frontend). Explicitly deferred after discussion — needs a Supabase CLI personal access token to deploy (same gap noted back in M1), and is a meaningfully bigger lift than the rest of M6. Revisit if/when ready to take on Edge Functions.
- **M4 bug fixed during testing:** `handleArchive` in `Board.tsx` originally called `archiveApplication(...)` without `await`, then immediately called `setUndoState(...)`. Because `unarchiveApplication` is a `useCallback` keyed on `applications`, and the keydown effect resubscribes only when `undoState` changes, the effect could capture a stale `unarchiveApplication` closure still bound to pre-archive data — `Ctrl/Cmd+Z` would silently no-op even with the undo toast visibly showing. Fixed by awaiting the archive write (and its `applications` refresh) before setting undo state, so the effect's dependent renders always see post-archive data. Worth remembering for any future "fire an async write, then immediately gate a keyboard shortcut on its result" pattern (e.g. if M5's migration ever needs something similar) — await first, or the shortcut can silently do nothing while looking like it should work.
