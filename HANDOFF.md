# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

## Session scope

Three threads, in order: (1) verified/corrected the security-review deploy status left ambiguous by the prior handoff, and shipped a small client-side fix for a new Supabase password policy discovered along the way; (2) executed the full domain migration from `jobtracker.fazare.dev` to `offertrail.app`, including the `www` redirect and decommissioning the old domain; (3) caught and fixed a stale Stripe webhook URL that the migration plan hadn't flagged. A fourth thread (Resend email-confirmation template) was raised by the user at the very end and is **not started** — see "Next action".

## Commits this session

- `d765462` — "Surface new password requirements (upper/lower/digit) to users" — pushed.
- `658028f` — "Point the app and browser extension at offertrail.app" — pushed.

Both are on `origin/main`. Nothing stashed, no scratch branches. (Also confirmed as a side-finding: `ec0cf35`/`606504c` from the *prior* session, which that session's handoff said were "not yet pushed," were in fact already on `origin/main` — corrected in `PLAN.md`.)

## Exact stopping point

**Domain migration: fully complete**, including the decommission step (which the plan had gated on a separate explicit go-ahead — user gave it this session). Current live state:
- `offertrail.app` — Worker Custom Domain binding, HSTS/CSP/security headers, `wrangler.jsonc`'s `PUBLIC_APP_URL`, extension manifests all point here. Verified end-to-end in-browser and via `curl`.
- `www.offertrail.app` — CNAME + 301 redirect to apex, verified working.
- `jobtracker.fazare.dev` — Worker Custom Domain binding **deleted**; confirmed via `curl -v` that it no longer resolves at all (`Could not resolve host`).
- Stripe webhook endpoint in the Stripe Dashboard — user edited it in place from `jobtracker.fazare.dev/api/stripe-webhook` to `offertrail.app/api/stripe-webhook` (same signing secret, no `STRIPE_WEBHOOK_SECRET` rotation). Verified reachable (`curl` unsigned POST → `400`/`Invalid signature`, correct behavior). **Not yet verified with a real Stripe event** — user deferred a live-card test to later, by choice.

**Still open from this migration, both deliberately left for the user:**
- Chrome Web Store extension republish — manifests are already updated to `offertrail.app` (this session, commit `658028f`), but the *published* extension is still the old version pointing at the dead domain, broken for existing installs until a new version is submitted and approved.
- A real live-mode Stripe purchase, to confirm the webhook fires correctly end-to-end post-migration (checkout-session creation was already confirmed working; the webhook delivery itself was only signature-checked, not exercised with a real event).

**Security review: 8/10 findings confirmed live, 2 still not deployed.** `supabase/migrations/0017_newsletter_hardening.sql` and `0018_field_length_limits.sql` are confirmed **run** (this session, via live PostgREST probes + the user's own SQL-editor error confirming `0018`). But `newsletter-subscribe/index.ts` is still running the **old** code (`x-function-version: newsletter-subscribe@2026-07-27.1`; source says it should be `@2026-07-28.1`), and `newsletter-confirm/index.ts` was never deployed at all (`404`). Full detail in `PLAN.md`'s "Current status".

**Not started at all: the Resend email-confirmation template fix**, raised by the user in the last message before this handoff. Two reported issues: (1) subject/title says "Job Tracker Test" (stale branding), (2) the confirmation link apparently can't be opened from a different browser/device than the one that requested it. No investigation has happened yet — not even confirming where this template lives (Supabase's built-in template editor vs. something custom).

## Next action

Start the Resend email-confirmation template fix. First step should be **investigation, not a fix**: confirm where the template actually lives (Supabase Dashboard → Authentication → Email Templates is the most likely place, since Supabase's SMTP is configured to send via Resend per the "Resend domain verified" note in `PLAN.md` — but confirm rather than assume), and read its current HTML/subject there. Then investigate issue (2) specifically — check whether the confirmation link uses Supabase's PKCE flow (which binds a code verifier to the *requesting* browser's storage and would explain "can't open on another device/browser" as expected-but-undesirable PKCE behavior, not a bug) versus the older implicit/token-hash flow (which is a plain URL, portable across devices). `useAuth.ts` and any `supabase.auth.signInWithOtp`/`resetPasswordForEmail`/`signUp` call sites are the places to check which flow this project is actually using.

## Learned this session

- **`npx wrangler deploy` does not rebuild the frontend — it silently serves whatever's already in `dist/`.** Cost a real bug: right after editing `wrangler.jsonc`'s `PUBLIC_APP_URL`, ran `wrangler deploy` without rebuilding first; it reported "No updated asset files to upload" and exited successfully, but the live site was still missing that same session's earlier password-requirements UI change. Fixed by always running `npm run build` before `wrangler deploy` whenever frontend source changed, and confirming via `grep` on the built JS that the expected string is actually present before trusting a deploy. **Do this every time a Worker deploy follows a frontend change — there's no warning from wrangler that `dist/` is stale.**
- **A Cloudflare zone's `permissions` array (from `GET /zones?name=...`) does NOT reflect what a specific API token was actually granted** — it reflects what's possible for the zone/plan in general. Only a direct call against the specific endpoint (e.g. `GET /zones/{id}/dns_records`) tells you the token's real access; a `403`/`Authentication error` there means missing permission regardless of what the zone's own permissions list shows.
- **Cloudflare's permission picker has near-duplicate-named groups that are easy to conflate**, and this cost two separate back-and-forths this session: "DNS" (governs `/dns_records`, what's needed for actual record CRUD) vs. "DNS Settings" (governs DNSSEC/CAA zone config, not records) — the user's first attempt checked the wrong one. Same trap with "Dynamic URL Redirects": it has separate **Read** and **Edit** checkboxes, and the first attempt only checked Read, which passes nothing (redirect *rule creation* needs Edit).
- **The account-level Cloudflare `workers/domains` endpoint (`/accounts/{account_id}/workers/domains`) is account-scoped, not zone-scoped** — it worked for creating the `offertrail.app` Worker Custom Domain binding even before any zone-specific DNS/Redirect-Rules permissions were sorted out. Worth remembering: not every Cloudflare API surface follows the same scoping as `/zones/{id}/...` endpoints.
- **Deleting a Worker Custom Domain binding by its specific binding ID removes only that hostname's binding (and its DNS record) — a sibling binding on the same Worker service is untouched.** Confirmed directly: deleting `jobtracker.fazare.dev`'s binding left `offertrail.app` fully live with zero interruption.
- **Checkout-session creation working is not proof a Stripe integration survived a domain move — the webhook is a separate, easily-missed piece.** The webhook endpoint URL lives in the Stripe Dashboard itself, entirely outside the app's code and config, so nothing in a `grep` for the old domain across the repo would have caught it. Found only because the user proactively asked "do we need to change anything in Stripe" after noticing the purchase *button* still worked — which it always would have, regardless of webhook health, since checkout-session creation doesn't touch the webhook URL at all.
- **Editing a Stripe webhook endpoint's URL in place preserves its signing secret; deleting and recreating it does not.** Confirmed by design (not tested destructively) — worth remembering as the reason to always prefer in-place edits for this specific object.

## Open questions

- Should the two still-undeployed security-review pieces (`newsletter-subscribe` redeploy, `newsletter-confirm` first-time deploy) be picked up before or after the new Resend-template task? Not asked this session — the user pivoted straight to the domain migration and then the Resend issue without addressing this. Both are dashboard-only manual deploys for the user; no blocker either way.
- Chrome Web Store republish timing is entirely the user's call and outside any session's control once submitted (review turnaround).
- Real live-mode Stripe purchase test — user said "I'll do a live test with a real card and account later," explicitly deferred, no timeline given.

## Verify

```bash
git log --oneline -5
# d765462 and 658028f should be present, both on origin/main (git status: not ahead)

git status
# should be clean except pre-existing untracked extension/store-assets/ and final/ (unrelated to this session)

curl -sI "https://offertrail.app/?cb=$(date +%s)" | grep -i "strict-transport-security\|content-security-policy:"
# strict-transport-security: max-age=63072000; includeSubDomains; preload
# content-security-policy: default-src 'self'; connect-src 'self' https://*.supabase.co; ...

curl -v "https://jobtracker.fazare.dev" 2>&1 | grep "Could not resolve"
# "Could not resolve host: jobtracker.fazare.dev" -- confirms decommission held

curl -sL -o /dev/null -w "%{url_effective} -> %{http_code}\n" "https://www.offertrail.app/?cb=$(date +%s)"
# https://offertrail.app/?cb=... -> 200

curl -s -X POST "https://offertrail.app/api/stripe-webhook" -d '{}'
# {"error":"Invalid signature"} -- confirms endpoint live and verifying signatures (not proof a real event was ever received)

curl -sI -X OPTIONS "https://fjlmyaamarnjlthbhycx.supabase.co/functions/v1/newsletter-subscribe" | grep -i x-function-version
# newsletter-subscribe@2026-07-27.1 -- if this is still the version shown, the security-review redeploy still hasn't happened

curl -sI -X OPTIONS "https://fjlmyaamarnjlthbhycx.supabase.co/functions/v1/newsletter-confirm"
# HTTP/2 404 -- if still 404, this function has never been deployed

npx tsc -b --noEmit && npx oxlint && npx vitest run
# tsc: "No errors found"; oxlint: only the two known pre-existing react-hooks(exhaustive-deps) warnings in Board.tsx;
# vitest: PASS (192) FAIL (52) -- same pre-existing baseline as documented in the prior handoff, not something this session introduced
```
