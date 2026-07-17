# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Written because we hit the context-window limit mid-planning of a new feature (M8). Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec).

---

## 1. Overall goal

A local-first "Job Application Tracker" web app: a Kanban board where a user tracks job applications through stages (Eyes on → Applied → Interview → Offer), can archive them, organize them into multiple named "trackers" (like spreadsheet tabs), and optionally sign in to sync across devices. MVP is fully built, hosted, and live. We are now in a **post-MVP feature phase**, adding polish and new capabilities one milestone at a time.

**The feature currently being planned (M8):** AI-powered job extraction — the user uploads a screenshot of a job posting, Claude (Haiku 4.5) extracts the fields (company, role, salary, location, link, notes), and pre-fills the add-application form for the user to review and save. Because this costs real money per call, it must be **spend-capped** (per-user + global quota) so the developer can't be surprise-billed. It's built "capped-free first," with paid monetization (Stripe) as a deliberate later follow-on.

---

## 2. Current status snapshot

- **Branch:** `main`. **Everything is committed and pushed** — `git log origin/main..HEAD` is empty.
- **Latest commit:** `8d9b6db` "Update PLAN.md: sidebar polish logged".
- **Working tree:** clean except two pre-existing untracked files that are out of scope by design and should NOT be committed: `claude-code-prompts.md`, `repo-setup.md`.
- **Live in production:** https://jobtracker.fazare.dev — Cloudflare auto-deploys on every push to `main`.
- **Typecheck:** `npx tsc -b --noEmit` passes clean (no output).
- **M8 status:** **PLANNED, NOT STARTED. Zero code written for it.** The plan was presented and the user agreed to the "capped-free first" direction, but the build is still gated on the user answering 5 open decisions AND giving an explicit go-ahead. See §5 and §6.

---

## 3. What's DONE (built, verified, live)

All of this is finished; `PLAN.md` has full detail. Summary so the next session doesn't re-investigate:

- **M1–M6 (MVP):** foundation, Kanban board + manual entry, drag-and-drop + card detail, archive + undo, Supabase Auth + guest→account migration, GDPR (export/delete/privacy) + polish.
- **Post-MVP — multiple named trackers:** tab strip above the board; each tracker is its own 4-column board; shared Archive view grouped by tracker. Migration `0003_trackers.sql`.
- **Post-MVP — Archive grouping & sort:** "Group by tracker" toggle, "Sort by" dropdown (date applied / date archived / company / notes), a "Reasons (n)" multi-select filter, and tracker-name display in `CardDetail.tsx`.
- **Post-MVP — Hosting:** deployed to Cloudflare (Workers/Pages) from the `fyldrmm/job-tracker` GitHub repo, custom domain `jobtracker.fazare.dev`.
- **M7 — Account panel + names:** compulsory Name at sign-up (stored in Supabase Auth `user_metadata`), a single `AccountModal` (name/email/password/export/delete/sign-out), sidebar restructure, and a unified `account-action` Edge Function handling both account deletion and password change with server-side password verification. Verified live end-to-end.
- **Post-M7 sidebar polish:** account section + "Support this project" pinned to the bottom of the sidebar; "Support this project" sits above the account section.

**Supabase migrations run (all three, by the user, via dashboard SQL editor):** `supabase/migrations/0001_init.sql`, `0002_delete_account.sql`, `0003_trackers.sql`.

**Edge Functions deployed (Supabase dashboard, no CLI link — see §8 gotcha):**
- `account-action` — CURRENT. Handles `{action: "delete"}` and `{action: "change-password"}`. Source: `supabase/functions/account-action/index.ts`.
- `delete-account` — OLD/superseded, kept deployed as a rollback option per user request, **no longer called by the client**. Source: `supabase/functions/delete-account/index.ts`.

---

## 4. Architecture & environment facts the next session needs

- **Stack:** React 19 + Vite 8 + TypeScript + Tailwind CSS v4 (via `@tailwindcss/vite`, no separate config file). Package manager: npm.
- **Backend:** Supabase — Postgres + Auth (email+password, custom SMTP via Resend) + Row Level Security on every table + Edge Functions (Deno runtime). Project ref `fjlmyaamarnjlthbhycx`, URL `https://fjlmyaamarnjlthbhycx.supabase.co`.
- **Local-first storage:** IndexedDB via the `idb` library (`src/lib/db.ts`, `DB_VERSION = 2`). Guest mode = IndexedDB only. Signed-in = Supabase is source of truth, IndexedDB is a write-through cache.
- **Drag-and-drop:** dnd-kit.
- **Deploy:** Cloudflare Workers/Pages, auto-deploy on push to `main`. Build command `npm run build`, output `dist`. Domain `fazare.dev` is TEMPORARY (user expects to rename the project later — that's why the Cloudflare project is named generically `job-tracker`, not `fazare`).
- **Keys:**
  - `VITE_SUPABASE_ANON_KEY = sb_publishable_r6d9C_Ryqe6msi4gOqxoUw_Nvcf0ziv` — PUBLIC, safe to expose (RLS is the real gate). Lives in `.env` locally and in Cloudflare **build-time** env vars.
  - `VITE_SUPABASE_URL = https://fjlmyaamarnjlthbhycx.supabase.co`.
  - The `sb_secret_...` service-role key must NEVER be in frontend code or committed. It's auto-injected into Edge Functions as `SUPABASE_SERVICE_ROLE_KEY`.
  - `RESEND_API_KEY` — a Supabase Edge Function secret (for the account-deletion confirmation email).
- **Local `.env`** is gitignored (confirmed). `.env.example` documents the two `VITE_` keys.

**Key source files and what they do (reference these by name; don't re-derive):**
- `src/components/Board.tsx` — the central page shell. Holds `activeTrackerId` state, view routing (`'board' | 'archive' | 'privacy'`), the guest→account migration effect, `handleSignOut`, `handleDeleteAccount`, `handleCreateFirstTracker`, modal state (`accountModalOpen`, `deleteModalOpen`, `authModalMode`, etc.). This is where the M8 form entry point will thread through.
- `src/components/ApplicationForm.tsx` — the add/edit application form. **M8's "Extract from screenshot" button goes here** (the form is the review surface).
- `src/components/AccountModal.tsx` — the account panel (name editable inline, email read-only, change password, export, delete, sign out).
- `src/components/AuthModal.tsx` — sign-up/log-in modal. Sign-up has a required Name field; `onSignUp(email, password, name)`.
- `src/components/Sidebar.tsx` — props `isSignedIn`, `displayName`, `onOpenAccount`, `onSignOut`, `onSignUp`. A `flex-1` spacer pins the account section + "Support this project" to the bottom; "Support this project" renders above the account section.
- `src/hooks/useAuth.ts` — wraps Supabase Auth. Exposes `user`, `session`, `displayName` (from `user.user_metadata.name`), `loading`, `signUp(email,password,name)`, `signIn`, `signOut`, `updateName(name)`.
- `src/hooks/useApplications.ts` — `createApplication(input, trackerId)`, `updateApplication`, `moveApplicationStage` (optimistic), `archiveApplication`, `unarchiveApplication`, `refresh`. Auth-aware read/write-through-cache logic.
- `src/hooks/useTrackers.ts` — `createTracker`, `renameTracker`, `removeTracker`, `refresh`. NOTE: no longer auto-creates a default tracker (that caused a duplicate-tracker bug — see PLAN.md); an empty tracker list is a valid state surfaced as a "Create your first tracker" CTA in `Board.tsx`.
- `src/lib/remoteStore.ts` — all Supabase data access. Contains `callAccountAction(body)` (a helper that invokes the `account-action` Edge Function and **extracts the real error message from `error.context`** — reuse this pattern for M8), `deleteOwnAccount(password)`, `changePassword(currentPassword, newPassword)`, plus `getAllRemote*`/`putRemote*`/`deleteRemote*` for applications/stage_history/trackers.
- `src/lib/supabase.ts` — creates the client. Has a **placeholder-URL fallback** (`https://placeholder.supabase.co`) so a misconfigured deploy degrades to guest mode instead of a blank-page crash. Do not remove.
- `src/lib/db.ts`, `src/lib/localStore.ts`, `src/lib/migration.ts`, `src/lib/export.ts`, `src/lib/constants.ts` (`DONATION_URL = 'https://ko-fi.com/fazare'`).
- `src/types/application.ts` — `Application`, `Tracker`, `StageHistoryEntry`, `ApplicationStage`, `ArchiveReason` types.

---

## 5. What's IN PROGRESS + the EXACT next step

**In progress:** planning M8 (AI job extraction, capped-free). The full agreed plan is below. **Nothing is coded.**

**EXACT next step:** the user was asked 5 decisions (§6) and to give an explicit go-ahead. **Do not start coding until those 5 are answered and the user confirms.** (Standing project rule, reinforced by a saved memory: after presenting a plan, pause for explicit go-ahead — do not reuse an earlier "yes" as license to build.) Once confirmed, begin **Phase 1** below.

### The agreed M8 plan

**Flow:** user opens the "Add application" form → clicks "Extract from screenshot" → picks an image → Haiku fills the six fields → user reviews/edits in the form → saves. The existing form is the review surface, so a bad extraction just means editing a field (low stakes).

**Phase 1 — Edge Function `extract-job-details` (build & curl-verify this ENTIRELY before any UI touches it — see the M7 lesson in §7):**
- New file `supabase/functions/extract-job-details/index.ts`, Deno.
- Signed-in only; verify caller via `supabase.auth.getUser()` (same pattern as `account-action/index.ts`).
- **Quota check BEFORE calling Anthropic:** count the user's extractions this month and the global total this month; if either is over its cap, return an error (e.g. HTTP 429 with `{error: "..."}`) WITHOUT calling Anthropic. This is the wallet protection and must be server-side.
- Call the Anthropic API with model `claude-haiku-4-5`, passing the image plus a structured-output JSON schema for the six fields (`company`, `role_title`, `salary_range`, `location`, `job_link`, `notes`) via `output_config.format` so we get validated JSON, not prose. (Haiku 4.5 supports vision AND structured outputs — confirmed via the `claude-api` skill.)
- Record the extraction (INSERT one row into `extraction_events`) so the counter stays accurate.
- Secret: `ANTHROPIC_API_KEY` as a Supabase Function secret, server-side only. **Never** in frontend code.
- **Verify standalone via curl** (a real extraction with a real image, an oversized/invalid input, and a simulated over-quota case) BEFORE wiring any client code.

**Phase 2 — Database migration `supabase/migrations/0004_extractions.sql`:**
- `extraction_events` table: `user_id uuid references auth.users(id) on delete cascade`, `created_at timestamptz default now()`. Consider an index on `(user_id, created_at)`.
- RLS: users can `select` their own rows (for the "X of N left" display); insert happens inside the Edge Function on the user's behalf (policy `auth.uid() = user_id`).
- Caps live as constants in the Edge Function for now (per-user free limit + global monthly cap).
- KNOWN MINOR LIMITATION to note: two simultaneous requests could each pass the check and slightly overshoot the cap (bounded by concurrency, worth cents). Fine for MVP; tighten later with a check-and-insert Postgres function if ever needed.

**Phase 3 — Client + UI:**
- Add `extractJobDetails(imageBase64)` to `src/lib/remoteStore.ts` (or a new `src/lib/extraction.ts`) → `supabase.functions.invoke('extract-job-details', ...)`, returns the six fields or throws on quota/error. Reuse the `callAccountAction` error-extraction pattern so real error messages surface (not supabase-js's generic wrapper).
- "Extract from screenshot" button inside `ApplicationForm.tsx`; image picker; loading state; on success auto-fill the form fields.
- Friendly "you've used your N free extractions this month" message on quota-exceeded; a small "X of N left" indicator (this is exactly where a paywall CTA drops in later).
- Signed-in only (guests see a prompt to sign up, or don't see the button).

**Phase 4 — Verify + document:** `npx tsc -b --noEmit`; browser-verify guest-vs-signed-in gating and the fill-then-edit flow; update `PLAN.md` including a "monetization later" section (see §9).

**User's manual steps when Phase 1/2 land (same pattern as prior Edge Functions):** deploy the function via the Supabase dashboard (paste `index.ts`), set the `ANTHROPIC_API_KEY` secret, run `0004_extractions.sql` in the SQL editor.

**HARD PREREQUISITE the user must do before Phase 1's live test:** create an **Anthropic API account with billing + an API key** (separate from their Claude Code subscription — Claude Code does not provide an API key with billing). That key's spend is what the cap protects.

---

## 6. OPEN DECISIONS (blockers — get these answered first)

1. **Per-user free monthly limit** — proposed default **20 extractions/user/month**.
2. **Global monthly cap** — the hard ceiling bounding total spend. At Haiku rates ~0.4¢/extraction, **5,000/month ≈ $20**. User picks their comfort number; wire it in as the ceiling.
3. **Period** — proposed **calendar month** (resets on the 1st); simplest.
4. **v1 scope** — proposed **screenshot/image only**, with PDF as an easy follow-on. (User's original idea #3 mentioned "pdf or screenshot"; PDF via Anthropic `document` block is straightforward to add later.)
5. **Entry point** — proposed **"Extract from screenshot" button inside the add-application form** (`ApplicationForm.tsx`), vs. a separate button on the board.

---

## 7. Key decisions & why

- **Haiku 4.5 (`claude-haiku-4-5`) for extraction, not Sonnet/Opus.** Vision extraction of clearly-visible fields is not a hard reasoning task; Haiku is ~3× cheaper (~0.4¢/extraction vs ~1.3¢ Sonnet standard). The user accepted "if reviews are bad on vision, upgrade later." Crucially, the feature has a **review-before-save step**, so extraction errors are low-stakes (the user edits a field, no corrupt data). We agreed the honest way to validate Haiku's quality is to **test both Haiku and Sonnet on a handful of the user's REAL target postings** rather than trust a general prior — flagged for later, not blocking.
- **Pricing basis (verify, don't trust blindly):** from the `claude-api` skill, cached 2026-06-24. Anthropic API list prices: Haiku 4.5 $1/1M input, $5/1M output; Sonnet 5 $3/$15 (intro $2/$10 through 2026-08-31); Opus 4.8 $5/$25. Per-extraction estimate assumed ~2,800 input tokens (~2,000 image + ~800 instructions) + ~300 output. 20,000 Haiku extractions ≈ **$80** (NOT $260 — the $260 the user first quoted was the Sonnet figure; corrected). Structured output / tool use adds **no** separate charge beyond tokens. Prompt caching won't help here (instruction block is below the ~2,048-token cache minimum). Re-verify current prices via the `claude-api` skill next session; they can change.
- **Capped-free first, monetization later.** The user's actual worry was affordability/surprise-bill, which a **spend cap solves completely without any Stripe machinery.** Monetization is a separate, heavier goal. Confirmed to the user that starting capped-free does NOT make monetization harder — the `extraction_events` table + quota-in-function IS the substrate monetization builds on (add a credits balance / paid flag, change the quota check to "under free cap OR has credits," add Stripe Checkout + webhook).
- **Auth-gate + quota is the point.** An ungated AI endpoint on a public URL is an open invoice; anyone could script thousands of calls. The per-user quota + global cap enforced server-side in the Edge Function is the mitigation.
- **Password/security-gated actions go through ONE Edge Function (`account-action`), not one-per-action.** Adding a future password-gated action = a new `case` in its dispatch, not a new function. Server-side verification (not just client-side) is required because a client-only check can't stop a direct API call with a stolen session token.

---

## 8. Monetization-later notes (so the head-start isn't lost)

- User has a **Stripe account connected to a Romanian bank (BCR)**. No Stripe keys shared yet.
- Planned shape when we get there: **Stripe Checkout** (Stripe hosts the payment page — we never touch card data) + a `credits` table in Supabase with RLS + an Edge Function that (a) creates Checkout sessions and (b) receives Stripe's webhook to credit the user. Stripe secret key stays server-side only (same discipline as `RESEND_API_KEY` / `ANTHROPIC_API_KEY`).
- **Compliance surface flagged to the user (NOT our call, they must check):** activating Stripe for live payments needs business/identity verification; **EU VAT on digital services** applies when selling to EU consumers (user is in Romania). We are not tax/legal advisors — this needs real checking before charging anyone.

---

## 9. Dead-ends & gotchas (do NOT repeat these)

1. **M7's first attempt broke and was fully reverted (`git checkout ba09e92`).** It wired `change-password` into the UI without curl-testing the deployed Edge Function first; it crashed with the generic "Edge Function returned a non-2xx status code" for BOTH right and wrong passwords, and debugging took a long, painful detour. **LESSON, now a standing rule: curl-test every Edge Function action standalone, against the real deployed function, BEFORE any UI touches it.** This is baked into M8 Phase 1.
2. **`supabase.auth.updateUser()` and `supabase.auth.signOut()` throw `"Auth session missing!"`** when called on a Supabase client built from only the caller's `Authorization` header (`global: { headers: { Authorization: authHeader } }`). They need an actual session set via `setSession()`, which needs a refresh token the Edge Function doesn't have (it only has the access token). **Fix used in `account-action`:** use a **service-role admin client** (`createClient(url, SUPABASE_SERVICE_ROLE_KEY)`) and call `admin.auth.admin.updateUserById(user.id, { password })`. Verified against GoTrue docs + a GitHub discussion, not guessed. If M8 ever needs a privileged auth mutation, use the admin client.
3. **`scope: 'others'` logout silently revokes the CURRENT session too.** We briefly added a raw `fetch` to `/auth/v1/logout?scope=others` to sign out other devices after a password change. GoTrue's logout handler **falls back to a FULL GLOBAL logout** (including the current session) if it can't resolve "which session made this request." Symptom: the user's own session got revoked, and their very next action (delete account) failed with `{"error":"Not authenticated"}` / `session_not_found` even though the token wasn't expired. Diagnosed by calling `/auth/v1/user` directly with the token (returned `session_not_found`) and reading GoTrue source. **We REMOVED the feature entirely (commit `8d2c5c9`). Do not reintroduce sign-out-other-devices from an Edge Function.**
4. **supabase-js `functions.invoke()` error handling:** `error.message` is a useless generic `"Edge Function returned a non-2xx status code"`. The real message is in `error.context` (the raw `Response`). `callAccountAction` in `remoteStore.ts` extracts it via `await context.json()` then `parsed.error`. **Reuse this for M8's client call.**
5. **Terminal / curl testing with the user is fiddly — give SINGLE-LINE commands and handle secrets carefully:**
   - Multi-line curl with trailing `\` repeatedly broke into a stuck `dquote>` prompt (paste artifacts). Prefer one single line.
   - The user's password contains `!`, which zsh history-expands. Fix: `set +H` first, and NEVER put the password inline — use `read -s` to prompt for it (`printf "Current password: "; read -s VAR; echo`). Note: zsh `read` does NOT support `-p` (that's bash) — use `printf` then `read -s`.
   - Session tokens expire ~1 hour; a token that "looks valid" can be server-side-revoked. Fetch a fresh one right before testing.
   - Browser console command to get the user's access token (they run this on the live site, signed in):
     `JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.includes('auth-token')))).access_token`
     (copy WITHOUT the surrounding quotes DevTools prints).
6. **Cloudflare env-var location trap (cost us a blank-page bug):** build-time vars for a static-asset Worker are under **Settings → Build → "Variables and secrets"**, NOT the runtime "Variables and secrets" section (which refuses variables for static-asset-only workers). `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` must go in the **Build** one. When they were missing, `createClient('', '')` threw synchronously and blanked the whole app — `src/lib/supabase.ts` now has a placeholder fallback so that degrades to guest mode instead.
7. **Edge Functions have NO CLI link — they're deployed by pasting `index.ts` into the Supabase dashboard editor.** Redeploy is a manual step every time the code changes. `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the platform; `RESEND_API_KEY` (and future `ANTHROPIC_API_KEY`) are Function secrets set in the dashboard.
8. **Browser-automation tool limits (from this whole project):** it can't produce trusted synthetic drag/multi-click events; ref-based clicks (`read_page` → `ref_N`) are more reliable than coordinate clicks; it CANNOT reach a live authenticated Supabase session, so anything needing a real signed-in session must be user-run or curl-tested. Don't burn time fighting these.
9. **Do not commit** `claude-code-prompts.md` or `repo-setup.md` — pre-existing untracked scratch files, out of scope by design.

---

## 10. How to verify the current state

Run these from the repo root (`/Users/burak2/Desktop/Claude`):

```bash
# 1. Typecheck — expect NO output (clean pass)
npx tsc -b --noEmit

# 2. Working tree — expect ONLY the two untracked scratch files
git status --short
#   ?? claude-code-prompts.md
#   ?? repo-setup.md

# 3. Everything pushed — expect EMPTY output
git log origin/main..HEAD --oneline

# 4. Latest commit — expect: 8d9b6db Update PLAN.md: sidebar polish logged
git log --oneline -1

# 5. Run locally
npm run dev     # then open the printed localhost URL
```

- **Production:** open https://jobtracker.fazare.dev — should render the app (guest mode: "Create your first tracker" CTA if IndexedDB is empty). No console warnings about missing Supabase env vars means the live env vars are wired.
- **M7 sanity (already user-verified, only re-check if something seems off):** sign up requires a Name; the sidebar shows the name; the account panel (name/email/change-password/export/delete/sign-out) works; password change succeeds with the correct current password and is rejected with a clear error on the wrong one; account deletion sends a confirmation email and wipes the account.
- **There is nothing for M8 to verify yet — no M8 code exists.**

---

## 11. TL;DR for the next session

The app is done through M7 + sidebar polish, fully committed/pushed, and live. We were mid-planning **M8: AI job extraction from a screenshot using Haiku 4.5, spend-capped (per-user + global quota), capped-free now with Stripe monetization as a later follow-on.** The full plan is in §5. **Do not start coding** — first get the user's answers to the 5 decisions in §6 and an explicit go-ahead, then begin Phase 1 (the `extract-job-details` Edge Function), curl-verifying it standalone before any UI. Heed the gotchas in §9, especially: curl-test Edge Functions before wiring UI, use the admin client for privileged auth mutations, never add `scope: 'others'` logout, and remember the user needs an Anthropic API key with billing before the live test.
