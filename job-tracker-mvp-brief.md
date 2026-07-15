# Job Application Tracker — MVP Task Brief

> A build brief for Claude Code. It defines *what* to build and the constraints that matter, not line-by-line implementation. Where this brief and the project's existing Claude Code guidelines / house stack disagree, defer to the house guidelines and flag the conflict.

---

## 1. Overview & goal

A web app that helps job seekers track their job applications through a pipeline — from jobs they're eyeing, to applied, to interviews and offers. The core experience is a **Kanban board** where each card is one application and columns are pipeline stages.

The app is **free** and donation-supported. The MVP is intentionally narrow: **manual entry** of applications and a clean board to manage them. Automatic extraction of job details from a link is a *future* feature, not part of this build — but the data model and add-application flow should be shaped so it slots in later without a rewrite.

## 2. Target users & guiding principles

Users are job seekers, many of them recent graduates without income. That shapes several choices:

- **Never charge, never lose their data.** Multiple safety nets (local persistence, undo, export) are core, not extras.
- **Speed and low friction**, especially for archiving — it will be one of the most-used actions in the app (rejections are common). One click to archive.
- **PC/desktop-first.** Drag-and-drop is the primary interaction. Mobile is allowed to lack features and stay simple; it just shouldn't break.
- **Keep the surface calm.** Cards show only 3 fields; everything else lives one click away.
- **Accessible interactions.** No critical action should depend on hover-only or timed-hover behavior; drag-and-drop should have a keyboard path (dnd-kit handles this).

## 3. Tech stack

Recommended default (adjust to the project's house stack if one exists):

- **Frontend:** React + Vite + TypeScript, Tailwind CSS
- **Drag-and-drop:** dnd-kit (modern, accessible, keyboard-friendly)
- **Backend:** Supabase — Postgres, Auth, and Realtime for sync
- **Local persistence:** IndexedDB for guest/offline data; syncs to Supabase once signed in
- **Hosting:** any static host (Vercel / Netlify / Cloudflare Pages) for the frontend; Supabase for the backend

Two non-negotiables on Supabase:

- **Row Level Security (RLS) must be ON for every table.** Each user can read/write only their own rows. Shipping with RLS off is the single most common Supabase mistake and would expose all user data — do not launch without it.
- **Leave the Supabase spend cap ON** so usage can never produce a surprise bill.

## 4. Architecture: local-first + accounts

The app works **without an account** and offers accounts as a backup/sync layer.

**Guest mode.** A first-time visitor can use the full board immediately, with data stored locally in IndexedDB. No signup wall.

**Account nudge.** Show a gentle, **dismissible** banner encouraging account creation, noting that without an account their data could be lost if they clear their browser. It must not nag (dismiss should stick for the session).

**Account creation & data migration — critical.** When a guest creates an account, **all of their existing local data must transfer automatically into the new account with zero loss.** This is the highest-risk part of the build and deserves its own dedicated, well-tested task — it is a classic source of data-loss bugs. The MVP case is the easy one: a brand-new account starts empty, so migration is a one-way upload of local data. After migration, Supabase becomes the source of truth and the local store acts as a cache/mirror.

**Deferred:** multi-device merge and offline-edit conflict resolution. Assume the new account is empty at migration time; single-device use is the MVP assumption.

## 5. Data model

**`applications`**
- `id` — uuid, PK
- `user_id` — uuid, FK to auth user (RLS scopes every query to this)
- `company` — text, required
- `role_title` — text, required
- `job_link` — text, nullable *(kept structured for future auto-parsing)*
- `date_applied` — date, required (defaults to today)
- `current_stage` — enum: `eyes_on` | `applied` | `interview` | `offer`
- `salary_range` — text, nullable
- `location` — text, nullable
- `notes` — text, nullable
- `is_archived` — boolean, default false
- `archive_reason` — enum: `rejected` | `withdrawn` | `no_response` | `accepted`, nullable
- `archived_at` — timestamptz, nullable
- `created_at`, `updated_at` — timestamptz

On archive, `current_stage` is **preserved** (not cleared) so we always know how far an application got.

**`stage_history`** — one row per stage transition, for later analytics (time-in-stage, funnel):
- `id` — uuid, PK
- `application_id` — uuid, FK
- `stage` — enum (same as above)
- `entered_at` — timestamptz

Mirror the same shape in IndexedDB for guest data so migration is a straight copy.

## 6. Core screens & features (MVP)

### 6.1 Kanban board (primary view)
- Four columns, left to right: **Eyes on** (`eyes_on`), **Applied** (`applied`), **Interview** (`interview`), **Offer** (`offer`).
- Archived applications do **not** appear on the board.
- Each **card front shows only**: company, role title, date applied. *(Optional nice-to-have: a subtle "stale" indicator on cards untouched for a while — in-app visual only, no notifications.)*
- **Drag a card between columns** to change its stage; this updates `current_stage` and appends a `stage_history` row.
- A **quiet archived count** somewhere on the board (e.g. a "14 archived" link into the archive view) so archiving never feels like data vanished.

### 6.2 Add / edit application (manual entry)
- A "+" action opens a form with: **company\***, **role title\***, **date applied\*** (defaults to today), job link, salary range, location, notes. (\* = required.)
- New cards land in the column the "+" was triggered from, defaulting to **Applied** if added globally.
- Same form edits an existing application.

### 6.3 Card detail view
- Clicking a card opens a detail panel/modal showing all fields, with edit and the archive control (6.4).

### 6.4 Archive system
- Archiving is the general "this application is done" action; the reason is metadata. Reasons: **Rejected**, **Withdrawn**, **No response**, **Accepted**.
- **Split-button UI:** the main **Archive** button archives instantly with the default reason **Rejected** (the common case). A small **▾** next to it opens the four reasons to pick a different one. Choosing a reason is optional — never force it.
- Archived items leave the board and live in a **separate Archive view**, where the user can see them and **un-archive** (soft flag, not a delete).

### 6.5 Undo
- After archiving, show an **undo toast** ("Archived — Undo") that disappears after ~10 seconds.
- **Ctrl/Cmd+Z** undoes the **last archive** (same mechanism as the toast). Scope for MVP is the last archive only — not a general app-wide undo stack.

### 6.6 Account & data management
- Supabase Auth for sign-up / log-in (email + password is fine for MVP; pick the exact method per house guidelines).
- Guest mode and the migration flow from §4.
- **Export all my data** as JSON (also doubles as the guest safety net).
- **Delete my account** that truly deletes all the user's data.

## 7. Security & compliance

- **RLS on for all tables** (see §3).
- **GDPR essentials** (EU users): the JSON export above, real account deletion, and a short **privacy policy** page. Cheap to include now, painful to retrofit.

## 8. Out of scope for MVP — build with these in mind

Do **not** implement these, but don't design them out either:

- **Link auto-parsing** — paste a job URL and auto-fill the fields. Keep `job_link` and the add-form structured so this drops in later.
- **Follow-up reminders** (email/push). The optional in-app "stale" indicator in §6.1 is the only nod to this in MVP; real reminders come later once the backend is in place.
- **Alternate views** (sortable table/list, filtering). Build the board as one *rendering* of the data model so other views are just new renderings, not a refactor.
- **Mobile-first / responsive polish.** PC-first; keep mobile functional but basic.
- **Full multi-level undo.** MVP is last-archive-only.
- **Real donations integration.** A simple external donation link (e.g. Ko-fi / Buy Me a Coffee) in the footer is fine; anything beyond a link is out of scope.

## 9. Suggested build sequence

1. Scaffold the stack; create the Supabase project with **RLS on** from the start.
2. Data model — Supabase schema + IndexedDB mirror.
3. Kanban board rendering from data (4 columns) + card front.
4. Add / edit application form (manual entry).
5. Drag-and-drop between columns → stage update + `stage_history`.
6. Card detail view.
7. Archive system (split button, reasons, archive view, counter, un-archive).
8. Undo (toast + Ctrl/Cmd+Z for last archive).
9. **Auth + guest mode + migration flow** — treat the migration as its own task and test it hard (no data loss).
10. GDPR — export, delete account, privacy page.
11. Polish — empty states, optional stale indicator, donation link.

## 10. Deferred decisions to confirm before / during build

- Exact auth method (email+password vs magic link vs OAuth).
- Frontend framework if the house standard differs from the recommendation above.
- Hosting choice.
- Whether "Eyes on" cards need an explicit "mark as applied" quick action, or whether drag alone is enough.
