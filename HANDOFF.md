# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

## Session scope

Built the entire OfferTrail Pro paywall end to end (Cloudflare Worker, subscriptions table, pricing page, export/extraction gates, account billing UI, Terms of Service + Privacy Policy updates), deployed it, then moved to live Stripe mode at the user's request and hit a checkout bug that's still open. See `PLAN.md`'s 2026-07-27 "Current status" entry for the full build account — this file covers only the live-debugging delta from the tail end of the session.

## Commits this session

- `32e14d5` — "Build and ship the OfferTrail Pro paywall end to end" (the full build, 37 files)
- `1b43338` — "Switch Worker Price IDs from sandbox to live Stripe Products" (`wrangler.jsonc` only — swapped the four `STRIPE_PRICE_*` vars from sandbox to live Price IDs, redeployed)

Both pushed to `origin/main`. Nothing uncommitted, nothing stashed. Two pre-existing untracked directories (`extension/store-assets/`, `final/`) are unrelated to this work and were deliberately left out of both commits.

## Exact stopping point

**Live Stripe Checkout session creation is failing on production**, user-visible as a generic red "Something went wrong. Please try again." banner on the `/pricing` page (that's `PricingPage.tsx`'s catch-all in `handleSubscribe()`, which means whatever error actually happened didn't come back as a clean `{error: "..."}` JSON body the frontend could show verbatim — see `src/lib/billing.ts`'s `authorizedJsonPost`/`responseError`, which fall back to that generic string when `response.json()` itself fails to parse, i.e. the Worker returned something that wasn't valid JSON).

**Two causes already found and fixed this session, in order:**
1. `STRIPE_SECRET_KEY` was set to a value starting `mk_...` — not a real Stripe key prefix at all. Confirmed via `npx wrangler tail` live logs showing `Error: Stripe API error (401): {"error":{"message":"Invalid API Key provided: mk_1TxUl***..."}}`, thrown from `stripeRequest()` in `worker/stripe.ts:23`, called via `createCheckoutSession()` (`worker/stripe.ts:41`) from `handleCreateCheckoutSession()` (`worker/index.ts:60`). User re-pasted the key via `wrangler secret put STRIPE_SECRET_KEY` — turned out to be a **live** key, not test/sandbox.
2. Stripe has renamed/restructured "Test mode" into fully separate **Sandboxes** (a bigger change than a toggle — a sandbox is a distinct environment, its own Products/Prices/webhooks, not a mode flag on the live account). The four Price IDs and the webhook destination had been created in a **sandbox**, so a live secret key couldn't see them. User then explicitly chose to go live rather than go back to the sandbox ("just bind it please i dont want to entagnle myself with these bullshit anymore") — acknowledged the "real money moves on a completed checkout" risk when I raised it earlier in the session.

**What's actually been done for the live switch:**
- User created a live Product ("OfferTrail Pro (Monthly)" / "OfferTrail Pro (Quarterly)") + 4 live Prices in the Stripe dashboard (live mode), sent via `/Users/burak2/Downloads/prices.csv`:
  - Monthly USD `price_1TxoJDAROImIFWYs0opw8kdP`, Monthly EUR `price_1TxoJ0AROImIFWYss6rcn2wL`
  - Quarterly USD `price_1TxoK6AROImIFWYsYUTHknMz`, Quarterly EUR `price_1TxoJrAROImIFWYsTGuSzu4D`
- `wrangler.jsonc`'s `vars.STRIPE_PRICE_*` updated to these four (commit `1b43338`), rebuilt, redeployed (`npx wrangler deploy` succeeded, confirmed via the deploy output showing the new Price IDs bound).
- User registered a live webhook (Stripe dashboard, live mode, same URL `https://jobtracker.fazare.dev/api/stripe-webhook`, same 3 events, Snapshot payload style) and ran `wrangler secret put STRIPE_WEBHOOK_SECRET` with the live signing secret.
- `npx wrangler secret list` confirms all three secrets present by name: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`. **Values were never re-verified after the corrections** — only that a name exists, not that the current value is actually the correct live one this time.
- Sanity checks that DID pass after the live switch: `curl -X POST .../api/create-checkout-session` (no auth) → `{"error":"Not signed in"}` correctly; `curl -X POST .../api/stripe-webhook` (bad signature) → `{"error":"Invalid signature"}` correctly; `curl .../api/currency` → `{"currency":"eur"}` correctly. **These only prove the Worker is up and routing correctly — none of them exercise the actual Stripe API call path that's failing.**

**Where it was left:** a second `npx wrangler tail` session was started (`/tmp/wrangler-tail-live.log`, process killed at session end — **rerun `wrangler tail` fresh next session, don't rely on that log file, it may be stale/rotated**) and the user was asked to click "Subscribe monthly" on the live site while watching. The session ended (`/handoff` called) before that click happened or before any new log output was captured. **We do not yet know if the same `mk_...`/wrong-key class of error is still happening, or if it's now a different error** (e.g. a currency mismatch, a "no such price" if the Price IDs are somehow still resolving against the wrong mode, a Stripe Tax/automatic_tax config issue, or something in `customer_email` if `user.email` came back empty from Supabase's `/auth/v1/user`).

## Next action

1. Run `npx wrangler tail --format pretty` (or reuse the pattern from this session: background it, redirect to a log file, `cat` after a wait).
2. Have the user sign in on `jobtracker.fazare.dev` and click "Subscribe monthly" or "Subscribe quarterly" on `/pricing` — creating a Checkout *session* doesn't charge anything, safe to repeat.
3. Read the actual thrown error from the tail output — do not guess. Likely next candidates, roughly in order of likelihood: (a) the webhook/secret key values are still subtly wrong despite the name existing in `wrangler secret list` — consider having the user re-paste both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` one more time, carefully, from the live dashboard; (b) the live Price IDs might not actually be active/might have a currency or billing-interval mismatch — check them directly in the Stripe dashboard (live mode) rather than assuming the CSV was accurate; (c) `customer_email` sent to Stripe could be empty — add a temporary log line in `handleCreateCheckoutSession` (`worker/index.ts:60`) to print what `user.email` actually resolved to, since Supabase's `/auth/v1/user` response shape was never explicitly re-verified after the live switch.
4. Once checkout works, still need a **real completed purchase** (Claude will not do this step — executing a real payment is off-limits) to prove the webhook fires and `subscriptions` gets a real live-mode row, `isPro()` flips, and the Stripe Customer Portal ("Manage billing" in `AccountModal.tsx`) round-trips a real cancellation.
5. **Separately, still pending from earlier in the session, not urgent but not forgotten:** the `extract-job-details` Edge Function's tier-aware-cap change is committed in `32e14d5` but likely not deployed (dashboard-only, no CLI link — see `PLAN.md`'s note). Redeploy it and bump `FUNCTION_VERSION` when picking this back up.
6. **Also still pending, deliberately deferred mid-session:** Google sign-in — see `PLAN.md`'s "Postponed / deferred" section for the specific scope (OAuth client setup, migration-trigger verification, two doc updates).

## Learned this session

- **Stripe has replaced "Test mode" with "Sandboxes"** — not just a rename. A sandbox is a fully separate environment (own dashboard view, own Products/Prices/webhooks/API keys), not a toggle on the live account the way test mode used to be. Anything built/verified in a sandbox (Price IDs, webhook destinations, signing secrets) is invisible to the live account and vice versa — there's no shared namespace. Worth remembering for any future Stripe work: "which environment was this created in" is now a real, easy-to-get-wrong question with three-ish possible answers (a specific sandbox, or live), not two.
- **A Stripe secret key that fails auth throws an uncaught exception all the way up through the Worker**, since `stripeRequest()` (`worker/stripe.ts:23`) has no try/catch around the `fetch` call's error path — it just throws `new Error(...)`, and nothing in `worker/index.ts`'s route handlers catches it either. The result is a raw Workers-runtime error response, not JSON — which is exactly why the frontend shows the generic fallback string instead of a real message. **This is a real gap worth fixing**: wrapping the route handlers (or at least `handleCreateCheckoutSession`/`handleCreatePortalSession`) in a try/catch that returns a proper `json({error: ...}, 500)` would make future Stripe-side failures actually debuggable from the browser instead of requiring `wrangler tail` every time. Not fixed this session — flagging as a real improvement, not just a one-off debugging need.
- **`wrangler tail`'s reconnection behavior is noisy but not a problem** — during live debugging it logged several "Tail connection lost. Reconnecting..." cycles (including one explicit "did not respond to a keep-alive ping within 10000ms") with no missed events once reconnected. Don't mistake those warnings for a real issue; just let it reconnect.
- **`npx wrangler secret list` only proves a secret's *name* exists, never its value.** Twice this session a secret was "set" (confirmed via `secret list`) but was actually wrong (first an invalid `mk_...` string, then a valid-but-wrong-environment live key). Don't treat `secret list` output as proof of correctness going forward — only as proof the variable name is wired up.

## Open questions

- Is the live-mode checkout failure the *same* root cause class as the two already fixed (a bad/mismatched key), or something new? Genuinely unknown — this is the first thing to resolve next session.
- Are the four live Price IDs from `prices.csv` actually correct (right amounts, right currencies, right billing interval — especially that both "Quarterly" prices are really set to a 3-month interval and didn't silently default to monthly/yearly in the Stripe UI, a failure mode flagged as a real risk back when the sandbox Prices were first created)? Never independently re-verified after the live switch.
- Once live checkout works, is there a plan for who does the first real end-to-end purchase (small live charge, presumably immediately refunded/canceled) versus leaving it fully unverified until an actual paying customer arrives? Not discussed.

## Verify

```bash
git log --oneline -3
# expect: 1b43338 Switch Worker Price IDs..., 32e14d5 Build and ship..., 584c07c Rebrand display name...

git status --short
# expect: only extension/store-assets/ and final/ untracked, nothing else

npx wrangler secret list
# expect: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY all present by name (does NOT prove values are correct -- see "Learned this session")

curl -s https://jobtracker.fazare.dev/api/currency
# expect: {"currency":"eur"} or {"currency":"usd"} depending on request origin -- proves the Worker is deployed and routing

curl -s -X POST https://jobtracker.fazare.dev/api/create-checkout-session -d '{"plan":"monthly"}'
# expect: {"error":"Not signed in"} -- proves auth-gating still works; does NOT exercise the actual bug, which only reproduces for a real signed-in user

npm test && npx tsc -b --noEmit && npx oxlint
# expect: 216 tests passing, clean typecheck, only the two pre-existing react-hooks warnings in Board.tsx (lines ~415/447, both pre-existing/documented, not regressions)
```
