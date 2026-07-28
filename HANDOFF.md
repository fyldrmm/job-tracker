# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

## Session scope

Fixed all 10 findings from an external security review (`SECURITY_REVIEW.md`), then started planning a domain migration from `jobtracker.fazare.dev` to `offertrail.app` — that second task is planned but not yet started.

## Commits this session

- `ec0cf35` — "Address all 10 findings from the 2026-07-28 security review" — **committed on `main`, NOT pushed.** 22 files, +703/-133.

Nothing stashed, no scratch branches.

## Exact stopping point

**Security review**: all 10 findings coded and committed (`ec0cf35`). Deploy status, precisely:
- **Live and user-confirmed working**: HSTS + enforced CSP (Cloudflare, config-only, no code — done directly via API this session). `worker/index.ts`'s webhook fix (user ran `wrangler deploy`). `account-action/index.ts` (rate limiting, error de-detailing, honest session-revocation reporting, 10-char passwords) — user ran `supabase/migrations/0016_password_attempts.sql`, redeployed the function, and personally verified the lockout: 6 rapid wrong-password attempts, locked on the 5th, for 15 minutes.
- **Coded but NOT deployed**: `supabase/migrations/0017_newsletter_hardening.sql` (rate-limit + pending-confirmation tables) and `0018_field_length_limits.sql` (CHECK constraints) haven't been run. The rewritten `newsletter-subscribe/index.ts` and new `newsletter-confirm/index.ts` haven't been deployed. **Important**: `newsletter-subscribe/index.ts` now calls `check_newsletter_rate_limit()` and inserts into `newsletter_pending_confirmations` — deploying that function before running `0017` will break newsletter signup (the RPC/table won't exist yet), same ordering trap as `0016`/`account-action` had. Sequence: migration first, then function deploy.
- **Also not done**: Supabase dashboard manual step — enable leaked-password protection, raise the project's own minimum password length to 10 (Auth → Policies). No code blocks this; it's just an unclicked toggle.

**Domain migration**: plan written to `/Users/burak2/.claude/plans/before-google-sign-in-quizzical-metcalfe.md` and approved in substance via ExitPlanMode, but **zero implementation steps have run** — no Cloudflare API calls, no file edits. The plan's full content is also duplicated into `PLAN.md`'s "Current status" section (first bullet) and "Decisions & notes" (last block), so it survives even if the plan file gets overwritten by a future `/plan` session on an unrelated task, which is exactly what happened to the *previous* plan this file held (the security-review plan was overwritten by the domain-migration plan mid-session, causing a stale-UI mismatch the user flagged before triggering this handoff — see "Learned this session" below).

**Blocked on**: the user widening the `CLOUDFLARE_API_TOKEN` env var's zone scope (currently `fazare.dev`-only) to also include `offertrail.app`. Confirmed this session — every API call against the new zone returns `Unauthorized`, including `/user/tokens/verify`.

## Next action

Ask the user whether the Cloudflare token has been widened yet. If yes: re-verify with `curl -s https://api.cloudflare.com/client/v4/zones?name=offertrail.app -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"` returning zone id `ecb177c186ecbf478dacac6dff997c9a` with real data (not `Unauthorized`), then start the domain-migration plan's sequencing step 2 (create the Worker Custom Domain binding for `offertrail.app` → service `job-tracker`, copy over the HSTS/CSP/security-header config already live on `fazare.dev`, update `wrangler.jsonc`'s `PUBLIC_APP_URL`, `wrangler deploy`).

If instead picking the security-review thread back up: run `supabase/migrations/0017_newsletter_hardening.sql` and `0018_field_length_limits.sql` in the Supabase SQL editor, then redeploy `newsletter-subscribe` and deploy the new `newsletter-confirm` function via the dashboard (see `supabase/functions/newsletter-confirm/index.ts` — brand new file, needs a first-time function creation, not just a code paste into an existing one).

## Learned this session

- **No Supabase service-role or management API key is available in this environment** — only `VITE_SUPABASE_ANON_KEY` (the publishable key) is in `.env`. Every migration and every Edge Function deploy this session had to be relayed as dashboard instructions for the user to run themselves; I could not run them directly, unlike the Cloudflare API work (which has a working token in `CLOUDFLARE_API_TOKEN`) or `wrangler deploy` (which uses that same Cloudflare token and worked directly).
- **The Cloudflare token is zone-scoped, not account-wide.** Discovered by trying it against the freshly-created `offertrail.app` zone (same Cloudflare account, same login) and getting `Unauthorized` on every single call — including `/user/tokens/verify`, which isn't even a zone-scoped-looking endpoint. Don't assume "the token worked for zone A" implies "it'll work for zone B" — check per-zone before planning around it.
- **`write-excel-file`'s single-sheet API needs an explicit `sheet: 'Applications'` option** — without it, the output sheet is named something else internally and the existing `xlsxExport.test.ts` (which reads the file back via `workbook.getWorksheet('Applications')`, using exceljs as a read-only devDependency) fails with a confusing `Cannot read properties of undefined (reading 'getRow')` rather than a clear "wrong sheet name" error. Cost a debugging round.
- **Plan-mode file overwrites can desync from what the UI shows the user.** Mid-session, I overwrote the plan file (which held the finished security-review plan) with the new domain-migration plan. The user's plan-approval UI then showed content from neither plan but from *much earlier* in the same conversation (an "AI CV Helper teaser + newsletter opt-in" plan, from before this session's context was compacted) — a stale-render bug in however that panel refreshes, not anything wrong with the file itself (re-reading the file confirmed it had exactly the domain-migration content I'd written). Worth remembering: if a user describes plan content that doesn't match what you just wrote, don't assume you made an error — re-read the file first to check whether it's a display-side staleness issue.
- **Newsletter rate limiting had to be keyed on a hashed IP, not email** — the review's Finding #6 threat model is an attacker rotating *target* email addresses from one source, so an email-keyed limit would do nothing. `newsletter-subscribe/index.ts` hashes `x-forwarded-for` via `crypto.subtle.digest` (Deno's Web Crypto) before it ever touches Postgres, so no raw IP is stored at rest.
- **`account-action`'s `admin` (service-role) client already existed in that file before this session** (used for `updateUserById`) — the new rate-limit RPC calls reuse it rather than creating a second client, keeping with the file's existing pattern.

## Open questions

- Domain migration: once `offertrail.app` is verified live end-to-end, the plan's step 6 (removing the `jobtracker.fazare.dev` Worker Custom Domain binding) is explicitly gated on a **fresh, separate go-ahead at that point** — not implied by the overall plan approval, since it's the moment real users/bookmarks/the live extension start breaking. Don't skip that checkpoint even if resuming mid-plan.
- Not asked this session, but worth surfacing next time it comes up: should `ec0cf35` be pushed to `origin/main` now, or held until the two remaining migrations/deploys (`0017`, `0018`) land too, so a single push corresponds to a single fully-deployed state? Left uncommitted-to-remote deliberately, no instruction either way was given.
- Extension republishing (Chrome Web Store) for the domain migration is entirely outside any session's control (review turnaround time) — flagged in the plan but there's no way to shorten that gap; worth setting expectations with the user about a real gap-in-service window for extension users once the old domain is decommissioned.

## Verify

```bash
git log --oneline -3
# should show ec0cf35 at HEAD, on main, not yet on origin/main (git status will show "ahead of origin/main by 1 commit")

npx tsc -b --noEmit && npx oxlint && npx vitest run
# tsc: "No errors found"; oxlint: only the two known pre-existing react-hooks(exhaustive-deps) warnings in Board.tsx;
# vitest: PASS (192) FAIL (52) -- the 52 are pre-existing localStorage/getRemindersEnabled sandbox flakiness,
# confirmed identical on baseline `main` via `git stash` earlier this session, not something this session introduced

npm audit --omit=dev
# "found 0 vulnerabilities"

curl -sI https://jobtracker.fazare.dev | grep -i "strict-transport-security\|content-security-policy:"
# strict-transport-security: max-age=63072000; includeSubDomains; preload
# content-security-policy: default-src 'self'; connect-src 'self' https://*.supabase.co; ...
# (note: use a cache-busted URL like ?cb=$(date +%s) if you see the old report-only header -- it's edge caching, not a config regression)

curl -sI -X OPTIONS https://fjlmyaamarnjlthbhycx.supabase.co/functions/v1/account-action | grep -i x-function-version
# account-action@2026-07-28.1 -- confirms the rate-limiting deploy is live

curl -s https://api.cloudflare.com/client/v4/zones?name=offertrail.app -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
# check whether the token has been widened yet -- "Unauthorized" (errors code 10000/9109) means not yet;
# a real zone object with id ecb177c186ecbf478dacac6dff997c9a means it's ready to proceed
```
