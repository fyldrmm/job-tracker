# Job Application Tracker — Monetization (Free/Pro) Brief

> A build brief for Claude Code, in the same spirit as `job-tracker-mvp-brief.md`. It defines *what* to build and the constraints that matter, not line-by-line implementation.

---

## 1. Overview & goal

Add a paid **Pro** tier on top of the existing free product. This is a real departure from the MVP brief's founding line — "the app is free and donation-supported," "never charge" — made deliberately, not by drift: the app got unplanned traction from friends' feedback, and the team is choosing to try sustaining/growing it via a cheap subscription rather than donations alone.

**The line that must hold regardless:** everything that was designed as the free safety net stays free, forever, no exceptions — Kanban board, manual entry, drag-and-drop, multiple trackers, archive system + undo, guest mode, account + migration, JSON export, account deletion. Nothing that guards a job seeker's data or basic ability to track applications goes behind a paywall. Pro gates **AI extraction** (the one feature with real per-use Anthropic cost) plus a handful of power-user extras.

**No fake anchor price.** The pricing page shows the real, current price — no manufactured "regular price" strikethrough. Instead it states plainly that pricing may change for future subscribers, but **whoever is subscribed at a given price keeps that price for as long as they stay subscribed** (grandfathering, not a discount code). This gives the team the same safety margin a fake anchor was meant to provide — room to raise the price later if costs run unexpectedly high — without the deceptive framing: no "founder discount" off a number nobody was ever going to pay, no fabricated urgency. $9.99/mo remains an **internal, undisplayed ceiling** the team does not intend to exceed; if the product can't sustain itself even there, the plan is to shut it down rather than charge more. The quarterly equivalent of that ceiling is **not yet set** — the old $99.99/yr figure doesn't carry over now that annual is replaced by quarterly, and no quarterly ceiling has been decided (see §10).

## 2. Pricing

| | Free | Pro |
|---|---|---|
| Board, manual entry, drag-and-drop, archive/undo, guest mode, account, JSON export, account deletion | ✅ forever | ✅ |
| **Interview tracking** (schedule/edit/view rounds) **and per-interview calendar export** (`.ics` download + Add-to-Google-Calendar) | ✅ forever | ✅ |
| AI extraction (screenshot + browser-extension pre-fill) | 5/month, resets monthly | 500/month, resets monthly |
| XLSX/CSV export (table view, Insights) | ❌ | ✅ |

**Interview tracking is free, decided 2026-07-26 and not to be revisited quietly.** `src/lib/entitlements.ts` exists solely as a one-line seam (`canScheduleInterviews()`) built in M13 so this *could* be gated later; the decision is that it stays `return true`. Per-interview calendar export goes with it: exporting an interview the user already entered is data portability on their own data, costs nothing marginal, and gating it would make "interview tracking is free" false in practice. **XLSX/CSV export is the Pro export gate**, with free JSON export standing as the portability guarantee.

**Free cap correction:** the running Edge Function currently allows **20** extractions/month per user (`PER_USER_MONTHLY_LIMIT` in `supabase/functions/extract-job-details/index.ts`), not the 5 this brief assumed — the original figure was drafted without checking live code. Decided 2026-07-26: **lower it to 5 for everyone**, no grandfathering, on the user's statement that the app has no users yet. If any friend/tester accounts do turn out to be in use, the `is_comp_account` mechanism (§3) covers them at no cost rather than a legacy-cap column.

**Current price (what's actually charged and displayed):** $5.99/mo, $14.99/quarter for USD; €5.99/mo, €14.99/quarter for EUR — same digits in both currencies (not FX-converted), since the Stripe payout account is EUR-denominated and same-digit pricing is the SaaS-industry norm rather than a number that needs revisiting every time exchange rates move. Derived from real Haiku 4.5 extraction cost (3,000 in / 100 out tokens ≈ $0.0035/extraction; 500/mo cap ≈ $1.75 worst-case AI cost, ~$5.25/quarter; ~60% margin after Stripe fees even at full utilization). Quarterly billing also *reduces* fee drag versus monthly — one $0.30 fixed fee per three months instead of three.

**Quarterly, not annual — and lifetime is deliberately deferred.** The long-term option is a quarterly plan, replacing the annual plan earlier drafts assumed. A **lifetime** one-time plan is explicitly off the table *until the user decides the site will never be shut down* — offering lifetime access while shutdown remains a live scenario is the objection that killed it, and that objection is resolved by a durability decision, not by a pricing tweak. Revisit only then.

**Currency selection:** determined server-side from the visitor's country, not client-reported locale.
- Cloudflare gives the visitor's country on every request at no cost (`request.cf.country`, edge-populated — no geo-IP API call, no extra latency, no new service).
- Country in the EU-27 list → EUR price. Everything else → USD price.
- Decide during build whether "EU list" should also include EUR-adjacent-but-non-EU countries (e.g. users physically in a country that uses EUR but isn't in the 27) — default to the strict EU-27 list unless there's a reason to widen it.

**Locked-in pricing disclosure:** shown near the price, plain language, e.g. *"Early pricing — this rate may change for new subscribers in the future. If you're already subscribed, your price stays the same for as long as you keep your subscription."* This is the honest replacement for the fake-anchor "founder discount" framing — same effect (protects early subscribers, gives room to raise price later) without asserting a price that was never real.

**How grandfathering actually works technically:** Stripe Prices are immutable — you never edit an existing Price's amount, you create a *new* Price object and point Checkout at it. Existing subscriptions keep billing against whatever Price they were created with, indefinitely, unless someone explicitly migrates them. So a future price increase is: create new Price objects, update the Checkout/pricing-page code to reference them for new signups, and simply *do nothing* to existing subscriptions — the grandfathering is a structural property of Stripe, not a coupon trick.

**Cost basis (for future re-pricing, not for this build):** query real per-mode token averages from `extraction_events` (see the SQL in HANDOFF/PLAN discussion) — this brief and its price points were planned off an assumed 3,000 in / 100 out tokens per extraction, not measured production data.

## 3. Discount codes & master accounts

Two distinct mechanisms — don't conflate them:

**Future discount codes — Stripe Coupons + Promotion Codes.** Not used to fabricate a "founder discount" off a fake anchor (see §1/§2) — the current price is just the current price. This mechanism is for genuine future discounts: referral codes, a real time-limited promo, a sale.
- Create a Stripe **Coupon** (`percent_off` or `amount_off`, whatever duration fits the specific promo — `once`, `repeating`, or `forever` depending on intent).
- Create a **Promotion Code** pointing at it (the human-facing code), redeemable via a pre-filled Checkout link or entered manually.
- No admin UI needed for MVP — Stripe's dashboard is enough to create and manage these.

**Master / comp accounts (the user's own unlimited access) — do NOT model this as a 100%-off Stripe coupon.** A coupon still requires a Stripe customer + subscription object per account and a card on file (even at $0, Stripe generally still wants a payment method for a subscription unless using a $0-price trial forever, which is fragile to maintain). Simpler and more robust: a manual entitlement flag.
- Add a boolean (or enum) column directly on the app's `subscriptions`/`profiles` table, e.g. `is_comp_account boolean default false`, set by hand via the Supabase SQL editor for specific `user_id`s (starting with the owner's own account).
- The entitlement check (§5) treats `is_comp_account = true` as unlimited Pro — no Stripe customer, no subscription row, no card, no recurring charge risk.
- This keeps "unlimited credits without paying" completely outside the billing system — nothing to accidentally bill, refund, or leak via a coupon code.

## 4. Tech / integration

- **Billing processor — settled 2026-07-26: Stripe direct.** Compared against Paddle (5%+$0.50, blocks sub-$10 products with a sales-demo requirement — kills the $5.99 monthly plan outright), Creem (flat 3.9%+$0.40 MoR), Polar (5%+$0.50+1.5% intl-card+0.5% subscription on the free tier; the cheaper 4%+$0.40 rate needs a $20/mo paid plan), and Stripe's own new Managed Payments MoR product (2.9%+$0.30 base plus a 3.5% MoR surcharge, ≈6.4%+ — the most expensive option found). Even in the worst case for Stripe's percentage-based model — a $5.99 monthly charge on a non-EEA card requiring currency conversion (3.25% + 1 lei + 2% conversion ≈ 8.9%) — it still beats every MoR candidate (Creem ≈10.6%, Polar Starter ≈15.4%), because none of them undercuts Stripe's $0.30 fixed fee, and the fixed fee is what dominates at this ticket size. The reason to pay a MoR at all is offloading VAT remittance, which per §4's VAT note isn't needed until €10k/yr cross-border EU sales — not yet. EEA-card transactions are cheaper still (1.5% + 1 lei ≈ 5.2% monthly / 3.0% quarterly). Billed via Checkout + Customer Portal, no platform subscription fee. Note: the payout account being **EUR-denominated Romanian** is why EUR is priced natively rather than always converting from USD (see §2).
- **Stripe Tax:** enable per-transaction tax calculation (no platform subscription required) given the app markets to EU users — ties into the existing Privacy Policy disclosure pattern (Stripe joins Supabase/Anthropic/Resend/Cloudflare in "who else is involved"). Note for later: Stripe Tax calculates VAT but doesn't file/remit it — EU cross-border OSS registration only becomes relevant above €10,000/year in cross-border (non-Romania EU) sales, well above near-term volume, but worth a real accountant conversation once the business is meaningfully sized.
- **Products/Prices in Stripe:** one Product (**"OfferTrail Pro"** — renamed from "Job Tracker Pro" after the 2026-07-26 display-name rebrand, commit `584c07c`), with **four** Price objects — USD monthly, USD quarterly, EUR monthly, EUR quarterly. No anchor price, no founder coupon needed to derive the charged price (see §2's grandfathering note for how future price changes work instead).
- **Currency routing — settled 2026-07-26.** This repo's Cloudflare deployment was static-assets-only (`wrangler.jsonc` has no `main`/fetch handler) — there was no server code on Cloudflare to read `request.cf.country` from. This build adds a real Worker in front of the SPA to do that. It checks the visitor's country against a **32-country list — EEA (30) + United Kingdom + Switzerland** — and selects the EUR or USD Price ID accordingly; everything else (including an unresolvable country) falls back to USD. UK and Switzerland are display-only additions: they aren't in the EEA, so their cards still hit Stripe's non-EEA processing rate regardless of which currency is shown — the 30 EEA countries are the only ones where EUR display and Stripe's cheaper card rate actually line up. Binary EUR/USD only — no per-country local-currency display (Stripe Adaptive Pricing), which was considered and declined: it would reintroduce exchange-rate volatility into the price a subscriber sees, instead of a fixed digit. Charging a USD Price to an international card and having Stripe convert that USD collection to EUR at payout to the Romanian bank account is *not* a new feature — it's Stripe's normal settlement behavior, and its ~2% conversion fee is already priced into the effective-fee figures above.
- **Webhooks — settled 2026-07-26: same Cloudflare Worker as currency routing, not a Supabase Edge Function.** This repo's existing Supabase functions (`extract-job-details`, `account-action`, `delete-account`) are dashboard-deploy-only with no CLI link, so every change to them is a manual copy-paste-and-redeploy — a real recurring friction, hit twice already in this session for one-line constant changes. The Worker gets a proper `wrangler`-based CLI/CI deploy story instead, matching how the SPA itself already ships. Trade-off, stated plainly: the Worker needs the Supabase **service-role key** as a `wrangler secret` to write to `subscriptions`, so that key now lives in two secret stores instead of one. Handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → keeps `subscriptions` in sync. Needs the same test discipline as the guest-data migration work — a missed/retried webhook is a silent billing bug — verified against Stripe CLI's webhook forwarding before going live.

## 5. Data model

New table, RLS scoped to own row (`select` only — writes come from the service role via webhook):

**`subscriptions`**
- `id` — uuid, PK
- `user_id` — uuid, FK to auth user, unique
- `stripe_customer_id` — text, nullable (null for comp accounts)
- `stripe_subscription_id` — text, nullable
- `status` — enum: `active` | `canceled` | `past_due` | `none`
- `plan` — enum: `monthly` | `quarterly` | `none` (leave room to add `lifetime` later without a migration, but do not add it now — see §2)
- `currency` — enum: `usd` | `eur` | `none` — which Price the subscriber is actually on, so a future price change for new signups doesn't accidentally get applied when reasoning about an existing subscriber's rate
- `current_period_end` — timestamptz, nullable
- `is_comp_account` — boolean, default false — unlimited Pro, bypasses Stripe entirely
- `created_at`, `updated_at` — timestamptz

**Entitlement check** (used by the extraction quota RPC and the export/calendar gates):
```
is_pro := subscriptions.is_comp_account = true
       OR (subscriptions.status = 'active' AND subscriptions.current_period_end > now())
```
Extends the existing `reserve_extraction()` Postgres function (see `AUDIT.md` M2 / PLAN.md M8) with a tier-aware cap: `is_pro ? 500 : 5` per rolling calendar month, same reset mechanics as today's per-user monthly cap. Note the function already takes `p_per_user_limit` as a *parameter* supplied by the Edge Function, so the tier-aware part is a change in `extract-job-details/index.ts` (look up entitlement, pass 500 or 5) — the SQL itself needs no change. **The Pro cap is 500 per month even on the quarterly plan** — it does not pool into 1,500/quarter, so the existing rolling-calendar-month machinery works unchanged for both plans.

## 6. Core screens & features

### 6.1 Pricing page
- Shows the real current price only — $5.99/mo, $14.99/quarter (or €-equivalent, selected server-side by visitor country per §2/§4). No strikethrough, no fake anchor.
- The locked-in-pricing disclosure line sits directly under the price (see §2). **Disclosure placement, settled 2026-07-26: pricing page and Terms of Service.** Not account settings, not the Checkout confirmation email — deliberately narrower than what was first proposed.
- CTA → Stripe Checkout using the currency-appropriate Price ID.

### 6.2 Upgrade prompts
- Triggered at the point of friction: hitting the free AI-extraction cap (5/mo), or clicking the gated XLSX/CSV export action.
- Never blocks the free core — only appears on the gated actions themselves. **Never on interview scheduling or per-interview calendar export** (§2).

### 6.3 Account settings
- Shows current plan (Free / Pro monthly / Pro quarterly / comp), renewal date, and a "Manage billing" link to the Stripe Customer Portal (handles cancel/update-card/switch-plan without custom UI).
- Comp accounts show "Unlimited (team account)" with no billing link.

### 6.4 Admin: granting comp accounts
- No in-app UI for MVP — set `is_comp_account = true` by hand in the Supabase SQL editor for specific `user_id`s. Revisit an admin UI only if this becomes frequent.

## 7. Security & compliance

- RLS on `subscriptions`: users can `select` their own row only; all writes go through the webhook handler using the service-role key, never the browser client — same pattern as `extraction_events`.
- Never trust a client-supplied "I'm Pro" flag — every gated action (extraction, export, calendar) re-checks entitlement server-side at the point of use.
- Privacy Policy: add a "Billing" section — Stripe processes payment; the app never sees or stores card details; a subscription's plan/status is stored to gate features.

## 8. Out of scope for this build — keep in mind for later

- **Admin UI for comp accounts / discount codes.** Manual Stripe dashboard + SQL editor is enough at this scale.
- **Usage-based / metered billing.** Flat monthly/quarterly only; the 500/mo cap is a hard ceiling, not pay-per-extraction.
- **Lifetime plans.** Deferred by decision, not oversight — gated on the user concluding the site will never be shut down (§2).
- **Multi-seat / team plans.** Single-user accounts only, same as the rest of the app.
- **Proration edge cases beyond what Stripe Checkout/Portal handle by default.** Rely on Stripe's built-in behavior rather than custom logic.
- **Raising the price.** $9.99/mo (quarterly ceiling TBD, §10) is an internal, undisplayed ceiling the team does not intend to exceed — a future increase (even within that ceiling) is a deliberate, separate decision (new Price objects, new signups only, per §2), not something this build should make automatic or easy to slide into unnoticed.
- **Full currency localization (Stripe Adaptive Pricing or similar).** Explicitly considered and declined 2026-07-26 in favor of the binary EUR (EEA + UK + Switzerland) / USD split — see §4's currency-routing note.

## 9. Suggested build sequence

0. ~~Processor selection~~ — **done 2026-07-26: Stripe direct**, confirmed against Paddle/Creem/Polar/Stripe Managed Payments (see §4). No processor switch needed.
1. Stripe: create Product ("OfferTrail Pro") + four Prices (USD monthly $5.99, USD quarterly $14.99, EUR monthly €5.99, EUR quarterly €14.99), enable Stripe Tax.
2. `subscriptions` table (incl. `currency`) + RLS + migration. **Processor-agnostic — safe to build before step 0 resolves.**
2b. Lower `PER_USER_MONTHLY_LIMIT` from 20 to 5 in `supabase/functions/extract-job-details/index.ts` (see §2's free-cap correction), and update the user-facing cap message that interpolates it.
3. New Cloudflare Worker (`main` added to `wrangler.jsonc`, replacing the current assets-only config): reads `request.cf.country` at the edge, checks against the 32-country EEA+UK+Switzerland list, resolves to the right Price ID.
4. Webhook handler in that same Worker for `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted`, keeping `subscriptions` in sync (including `currency`) via the Supabase service-role key stored as a `wrangler secret`. Test with the Stripe CLI's webhook forwarding before going live.
5. Entitlement check (`is_pro`) as a shared helper in `src/lib/entitlements.ts` alongside the existing `canScheduleInterviews()`, used by: extraction quota RPC (tier-aware cap) and the XLSX/CSV export gate. **Not** the calendar export, and `canScheduleInterviews()` keeps returning `true` (§2).
6. Pricing page (real price by currency + locked-in-pricing disclosure + CTA to Checkout).
7. Account settings: plan display + Customer Portal link.
8. Upgrade prompts at the free-cap friction points.
9. Privacy Policy billing section.
10. Manually set `is_comp_account = true` for the owner's own account via SQL editor; confirm unlimited access end-to-end.
11. Live-verify the full flow: Checkout (both currencies) → webhook → `is_pro` flips → gated features unlock → Customer Portal cancel → webhook → `is_pro` flips back.

## 10. Deferred decisions to confirm before / during build

- **The quarterly internal price ceiling.** $9.99/mo carries over; the retired $99.99/yr has no quarterly counterpart and no replacement has been chosen (§2). Still open.
- Whether to eventually expose "X of 500 extractions used this month" in the UI (same unbuilt-counter gap noted for the free tier in `AUDIT.md` L8). Still open.

Resolved 2026-07-26 (kept here for the record, not still open):
- Currency-routing list: EEA (30) + UK + Switzerland → EUR; everything else, including an unresolvable country, → USD (§4).
- Locked-in-pricing disclosure: pricing page + Terms of Service, not account settings or the Checkout email (§6.1).
- Webhook host: a new Cloudflare Worker, not a second Supabase Edge Function (§4).
