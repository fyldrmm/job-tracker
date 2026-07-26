# HANDOFF.md — Job Application Tracker

**Purpose:** Everything the next session needs to continue with zero re-explanation. Read this together with `PLAN.md` (the long-lived source of truth) and `job-tracker-mvp-brief.md` (original spec) — or just run `/continue`, which reads all three in the right order.

## Session scope

Monetization planning for a paid Pro tier — no app code touched. Covered: pricing model, free/Pro feature split, currency handling, discount/comp-account mechanics, an ethics correction on a fake-anchor-price idea, real infra/compliance cost research (Cloudflare, Supabase, Stripe fees, VAT, chargebacks), and a critical read of a second strategy doc (`MONETIZATION_AND_LAUNCH_STRATEGY_BY_KIMI.md`) the user brought in from a separate session with Kimi.

## Commits this session

One commit, pushed:

- `7a144dd` — Draft monetization plan: Pro tier brief + Kimi's launch strategy doc (adds `monetization-mvp-brief.md` and `MONETIZATION_AND_LAUNCH_STRATEGY_BY_KIMI.md`)

Plus this `/handoff`'s own `PLAN.md` edit, committed separately after this file is written (see the commit step below — not yet made as of this writing).

`extension/store-assets/` (`screenshot-1-popup.png`, `screenshot-2-prefilled-form.png`) is untracked in `git status` but **predates this session** (from earlier Chrome Web Store packaging work) — deliberately left uncommitted, not this session's concern, don't assume it needs handling.

## Exact stopping point

**No code was written this session.** The concrete artifact is `monetization-mvp-brief.md` (root of repo), a from-scratch build brief in the same format as `job-tracker-mvp-brief.md`, covering:
- §1–2: Free tier keeps the entire current product forever; Pro ($5.99/mo or $59/yr, EUR/USD same-digit dual pricing) gates AI extraction (500/mo vs. free's 5/mo) plus XLSX/CSV and calendar export.
- §2: no fake anchor price — real price shown plus a "your price won't change if you stay subscribed" disclosure; grandfathering via new Stripe Price objects for future price changes, not a coupon.
- §3: comp/master accounts via a plain `is_comp_account` boolean, not a Stripe coupon.
- §4: Stripe direct, 4 Price objects (USD/EUR × monthly/annual), currency routed server-side via Cloudflare's free `request.cf.country` edge header against an EU-27 list.
- §5–10: data model (`subscriptions` table), screens, security notes, build sequence, open questions.

**This brief is NOT yet reconciled with `MONETIZATION_AND_LAUNCH_STRATEGY_BY_KIMI.md`**, the second doc the user brought in, which disagrees on real points (lifetime pricing vs. annual, merchant-of-record vs. Stripe-direct, a rebrand to "OfferTrail"). See `PLAN.md`'s "Current status" (2026-07-26 entry) for the full point-by-point comparison — that entry is the authoritative summary, not repeated here.

**In parallel, the user said they're about to fork this conversation** to do a display-name + logo swap ("JobTracker" → "OfferTrail" in the UI only) and then return here to build the paywall. That fork's outcome is unknown as of this handoff — check whether it touched only component text/logo assets (compatible with continuing here) or also the domain/`wrangler.jsonc`/extension manifests (would need factoring into the reconciliation).

## Next action

**Reconcile the two monetization docs into one build-ready spec**, incorporating the corrections already made this session (see `PLAN.md` bullets — don't re-derive them):
1. Resolve lifetime-vs-annual with the user directly (Claude flagged concerns about lifetime given the user's own stated "might terminate the project" scenario; not yet the user's decision).
2. Fold in the verified-real facts: extraction already runs Haiku (not Sonnet), char cap is already 8,000 (not the 4,000 Kimi's doc suggests), extension already sends text not screenshots — none of these need code changes, Kimi's doc's suggestions on them are already-shipped or would-be regressions.
3. Fix `monetization-mvp-brief.md`'s Stripe Product name (`"Job Tracker Pro"`) once the rebrand fork's outcome is known.
4. Only after the docs converge: start the build sequence in `monetization-mvp-brief.md` §9 (Stripe Products/Prices → `subscriptions` table → currency routing → webhook handler → entitlement check → pricing page → …).

**Independent of the above, and blocking before any billing code ships:** the pre-launch security checklist in Kimi's doc §9 was independently verified this session, not just copied — `curl -sI http://jobtracker.fazare.dev/` returns a bare `200 OK` (no HTTPS redirect), and `curl -sI https://jobtracker.fazare.dev/` has no `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` headers. These are Cloudflare-dashboard fixes (Always Use HTTPS, HSTS, Transform Rules), not app code — can be done anytime, doesn't need to wait for doc reconciliation.

## Learned this session

- **The user's Stripe account settles to a EUR-denominated Romanian bank account** — this is a durable business fact, not a passing detail. It's why EUR pricing is native (same digits as USD) rather than always-converted, and why a USD-only pricing page would put ~100% of revenue through an FX conversion at payout, not just "when a customer's card currency differs" (an earlier, wrong framing corrected mid-session).
- **A fake "regular price" anchor is a real ethics/legal exposure, not just a marketing quibble.** When the user asked directly "how unethical is what I am doing," the honest answer was: showing a "regular" price with a strikethrough that was never actually charged to anyone, next to a permanent "founder discount," is a recognized deceptive-pricing pattern (FTC/EU unfair-commercial-practice guidance both scrutinize fake reference prices) — worse here because the app's own founding brief explicitly targets financially vulnerable users (job seekers, some with no income). The user agreed and the brief was rewritten to drop it. Worth remembering as a standing principle for this project, not just a one-off fix.
- **Chargeback/dispute fees have two distinct components** — confirmed via Stripe's own docs (WebFetch, not memory): a ~$15 "dispute received" fee that's charged the moment a dispute is filed and is **never** refunded regardless of outcome, versus a separate "dispute countered" fee (only charged if you manually submit evidence) that **is** refunded if you win. "Friendly fraud" — a legitimate customer disputing instead of cancelling, e.g. after landing a job — is a real, named phenomenon in subscription SaaS, not a hypothetical; the practical mitigations are a recognizable Stripe statement descriptor, an easy self-serve cancel flow, and refunding proactively before a dispute is ever filed (a self-issued refund is free; a filed dispute costs the $15 even if you'd have won it).
- **EU VAT/OSS for a Romania-established seller is real but not urgent at current scale.** Confirmed via the EU's own OSS documentation: the cross-border threshold is **€10,000/year in sales to EU countries other than Romania** — domestic Romanian sales and non-EU sales (e.g. US) don't count toward it. Even the "20 paying subscribers" breakeven scenario worked out earlier in the session is only ~$1,440/year, meaning roughly 150 sustained subscribers would be needed before OSS registration is triggered. Not a launch blocker; worth flagging to a Romanian accountant (*contabil*) as the business grows, not before.
- **This repo already has more of Kimi's recommendations implemented than the doc assumed.** Don't trust an externally-authored strategy doc's claims about current code state without checking — three of its "should implement" items (Haiku model, 8,000-char cap, text-not-screenshot extraction) turned out to already be shipped, and one (the 4,000-char suggestion) would have been a regression against the measured ~4,372-char real average from a prior session. General lesson for future sessions: when reconciling an external document with this repo, grep/read the actual code before accepting any claim about what it currently does.

## Open questions

- **Annual ($59/yr) vs. lifetime ($59.99 one-time) Pro pricing** — genuinely undecided, needs the user's explicit call. See `PLAN.md`'s Current status entry for Claude's stated objections to lifetime.
- **Stripe-direct vs. merchant-of-record (Paddle/Lemon Squeezy)** — Stripe-direct is fine to launch with (VAT/OSS threshold is far off), but worth a revisit once revenue is real. Paddle needs a sales demo for sub-$10 products (a real friction point, not yet resolved); Lemon Squeezy's independent status post-Stripe-acquisition needs checking before relying on it.
- **Rebrand scope and timing** — depends entirely on what the user's parallel forked-conversation work actually touches. Check before assuming "OfferTrail" is just a display-string change.
- **Whether interview tracking stays free or becomes Pro-only** — Kimi's doc flags this as open, recommends free (avoid a "rug-pull" after a user's first interview); not contradicted by anything Claude found, but not explicitly re-confirmed with the user this session either.
- Everything in `monetization-mvp-brief.md` §10 ("Deferred decisions") is still open: strict-EU-27 vs. wider EUR-country list for currency routing, exact placement of the locked-in-pricing disclosure, whether to build a live "X of 500 extractions used" counter, and the fallback currency when `request.cf.country` can't resolve.

## Verify

```bash
git status --short
# expect: clean after this handoff's PLAN.md commit lands (see next command)

git log --oneline -3
# expect (top to bottom), once this handoff's own commit is made:
# <new hash>  /handoff: monetization planning session delta
# 7a144dd     Draft monetization plan: Pro tier brief + Kimi's launch strategy doc
# bdae07b     Close out migration-race investigation and drop the old data-loss note

cat monetization-mvp-brief.md | head -30
# expect: the Free/Pro brief described above, §1 opens with "No fake anchor price."

cat MONETIZATION_AND_LAUNCH_STRATEGY_BY_KIMI.md | head -20
# expect: Kimi's doc, §1 "Product Context," mentions the OfferTrail rebrand in §7

curl -sI http://jobtracker.fazare.dev/ | head -3
# expect (still unfixed as of this session): "HTTP/1.1 200 OK", no Location redirect header

curl -sI https://jobtracker.fazare.dev/ | grep -i "strict-transport-security"
# expect (still unfixed as of this session): no output (header absent)
```

No test suite / build / typecheck run this session — no `.ts`/`.tsx`/config files were touched, only root-level `.md` docs. `npm test` / `tsc` / `oxlint` status is unchanged from the last code session (see the previous `HANDOFF.md` entry's verify block, now superseded by this one but still accurate for app-code health).
