# Job Application Tracker — Monetization (Free/Pro) Brief

> A build brief for Claude Code, in the same spirit as `job-tracker-mvp-brief.md`. It defines *what* to build and the constraints that matter, not line-by-line implementation.

---

## 1. Overview & goal

Add a paid **Pro** tier on top of the existing free product. This is a real departure from the MVP brief's founding line — "the app is free and donation-supported," "never charge" — made deliberately, not by drift: the app got unplanned traction from friends' feedback, and the team is choosing to try sustaining/growing it via a cheap subscription rather than donations alone.

**The line that must hold regardless:** everything that was designed as the free safety net stays free, forever, no exceptions — Kanban board, manual entry, drag-and-drop, multiple trackers, archive system + undo, guest mode, account + migration, JSON export, account deletion. Nothing that guards a job seeker's data or basic ability to track applications goes behind a paywall. Pro gates **AI extraction** (the one feature with real per-use Anthropic cost) plus a handful of power-user extras.

**No fake anchor price.** The pricing page shows the real, current price — no manufactured "regular price" strikethrough. Instead it states plainly that pricing may change for future subscribers, but **whoever is subscribed at a given price keeps that price for as long as they stay subscribed** (grandfathering, not a discount code). This gives the team the same safety margin a fake anchor was meant to provide — room to raise the price later if costs run unexpectedly high — without the deceptive framing: no "founder discount" off a number nobody was ever going to pay, no fabricated urgency. $9.99/mo and $99.99/yr remain an **internal, undisplayed ceiling** the team does not intend to exceed; if the product can't sustain itself even there, the plan is to shut it down rather than charge more.

## 2. Pricing

| | Free | Pro |
|---|---|---|
| Board, manual entry, drag-and-drop, archive/undo, guest mode, account, JSON export, account deletion | ✅ forever | ✅ |
| AI extraction (screenshot + browser-extension pre-fill) | 5/month, resets monthly | 500/month, resets monthly |
| XLSX/CSV export (table view, Insights) | ❌ | ✅ |
| Calendar export (interview scheduling) | ❌ | ✅ |

**Current price (what's actually charged and displayed):** $5.99/mo, $59/yr for USD; €5.99/mo, €59/yr for EUR — same digits in both currencies (not FX-converted), since the Stripe payout account is EUR-denominated and same-digit pricing is the SaaS-industry norm rather than a number that needs revisiting every time exchange rates move. Derived from real Haiku 4.5 extraction cost (3,000 in / 100 out tokens ≈ $0.0035/extraction; 500/mo cap ≈ $1.75 worst-case AI cost; ~63% margin after Stripe fees even at full utilization).

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

- **Billing:** Stripe directly (Checkout + Customer Portal). No Paddle/Lemon Squeezy — avoids paying a platform subscription against no revenue yet. Note: the Stripe account settles to a **EUR-denominated Romanian bank account** — this is why EUR is priced natively rather than always converting from USD (see §2).
- **Stripe Tax:** enable per-transaction tax calculation (no platform subscription required) given the app markets to EU users — ties into the existing Privacy Policy disclosure pattern (Stripe joins Supabase/Anthropic/Resend/Cloudflare in "who else is involved"). Note for later: Stripe Tax calculates VAT but doesn't file/remit it — EU cross-border OSS registration only becomes relevant above €10,000/year in cross-border (non-Romania EU) sales, well above near-term volume, but worth a real accountant conversation once the business is meaningfully sized.
- **Products/Prices in Stripe:** one Product ("Job Tracker Pro"), with **four** Price objects — USD monthly, USD annual, EUR monthly, EUR annual. No anchor price, no founder coupon needed to derive the charged price (see §2's grandfathering note for how future price changes work instead).
- **Currency routing:** Checkout-session creation reads the visitor's country from Cloudflare's edge (`request.cf.country`), checks it against a static EU-27 list, and selects the EUR or USD Price ID accordingly (see §2).
- **Webhooks:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → keep the app's `subscriptions` table in sync. Needs the same test discipline as the guest-data migration work — a missed/retried webhook is a silent billing bug.

## 5. Data model

New table, RLS scoped to own row (`select` only — writes come from the service role via webhook):

**`subscriptions`**
- `id` — uuid, PK
- `user_id` — uuid, FK to auth user, unique
- `stripe_customer_id` — text, nullable (null for comp accounts)
- `stripe_subscription_id` — text, nullable
- `status` — enum: `active` | `canceled` | `past_due` | `none`
- `plan` — enum: `monthly` | `annual` | `none`
- `currency` — enum: `usd` | `eur` | `none` — which Price the subscriber is actually on, so a future price change for new signups doesn't accidentally get applied when reasoning about an existing subscriber's rate
- `current_period_end` — timestamptz, nullable
- `is_comp_account` — boolean, default false — unlimited Pro, bypasses Stripe entirely
- `created_at`, `updated_at` — timestamptz

**Entitlement check** (used by the extraction quota RPC and the export/calendar gates):
```
is_pro := subscriptions.is_comp_account = true
       OR (subscriptions.status = 'active' AND subscriptions.current_period_end > now())
```
Extends the existing `reserve_extraction()` Postgres function (see `AUDIT.md` M2 / PLAN.md M8) with a tier-aware cap: `is_pro ? 500 : 5` per rolling calendar month, same reset mechanics as today's per-user monthly cap.

## 6. Core screens & features

### 6.1 Pricing page
- Shows the real current price only — $5.99/mo, $59/yr (or €-equivalent, selected server-side by visitor country per §2/§4). No strikethrough, no fake anchor.
- The locked-in-pricing disclosure line sits directly under the price (see §2).
- CTA → Stripe Checkout using the currency-appropriate Price ID.

### 6.2 Upgrade prompts
- Triggered at the point of friction: hitting the free AI-extraction cap (5/mo), or clicking a gated export/calendar action.
- Never blocks the free core — only appears on the gated actions themselves.

### 6.3 Account settings
- Shows current plan (Free / Pro monthly / Pro annual / comp), renewal date, and a "Manage billing" link to the Stripe Customer Portal (handles cancel/update-card/switch-plan without custom UI).
- Comp accounts show "Unlimited (team account)" with no billing link.

### 6.4 Admin: granting comp accounts
- No in-app UI for MVP — set `is_comp_account = true` by hand in the Supabase SQL editor for specific `user_id`s. Revisit an admin UI only if this becomes frequent.

## 7. Security & compliance

- RLS on `subscriptions`: users can `select` their own row only; all writes go through the webhook handler using the service-role key, never the browser client — same pattern as `extraction_events`.
- Never trust a client-supplied "I'm Pro" flag — every gated action (extraction, export, calendar) re-checks entitlement server-side at the point of use.
- Privacy Policy: add a "Billing" section — Stripe processes payment; the app never sees or stores card details; a subscription's plan/status is stored to gate features.

## 8. Out of scope for this build — keep in mind for later

- **Admin UI for comp accounts / discount codes.** Manual Stripe dashboard + SQL editor is enough at this scale.
- **Usage-based / metered billing.** Flat monthly/annual only; the 500/mo cap is a hard ceiling, not pay-per-extraction.
- **Multi-seat / team plans.** Single-user accounts only, same as the rest of the app.
- **Proration edge cases beyond what Stripe Checkout/Portal handle by default.** Rely on Stripe's built-in behavior rather than custom logic.
- **Raising the price.** $9.99/$99.99 is an internal, undisplayed ceiling the team does not intend to exceed — a future increase (even within that ceiling) is a deliberate, separate decision (new Price objects, new signups only, per §2), not something this build should make automatic or easy to slide into unnoticed.
- **Full currency localization (Stripe Adaptive Pricing or similar).** This build is a binary EU/non-EU, EUR/USD split, not per-country localized pricing across many currencies.

## 9. Suggested build sequence

1. Stripe: create Product + four Prices (USD monthly $5.99, USD annual $59, EUR monthly €5.99, EUR annual €59), enable Stripe Tax.
2. `subscriptions` table (incl. `currency`) + RLS + migration.
3. Currency routing helper: read `request.cf.country` at the Worker edge, check against a static EU-27 list, resolve to the right Price ID.
4. Webhook handler (Edge Function) for `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted`, keeping `subscriptions` in sync (including `currency`). Test with the Stripe CLI's webhook forwarding before going live.
5. Entitlement check (`is_pro`) as a shared helper, used by: extraction quota RPC (tier-aware cap), export gates, calendar-export gate.
6. Pricing page (real price by currency + locked-in-pricing disclosure + CTA to Checkout).
7. Account settings: plan display + Customer Portal link.
8. Upgrade prompts at the free-cap friction points.
9. Privacy Policy billing section.
10. Manually set `is_comp_account = true` for the owner's own account via SQL editor; confirm unlimited access end-to-end.
11. Live-verify the full flow: Checkout (both currencies) → webhook → `is_pro` flips → gated features unlock → Customer Portal cancel → webhook → `is_pro` flips back.

## 10. Deferred decisions to confirm before / during build

- Whether the "EU" list for currency routing is strictly the 27 EU member states, or widened to include EUR-adjacent non-EU countries.
- Exact wording/placement of the locked-in-pricing disclosure (pricing page only, vs. also in the Checkout confirmation email, vs. also in account settings).
- Whether to eventually expose "X of 500 extractions used this month" in the UI (same unbuilt-counter gap noted for the free tier in `AUDIT.md` L8).
- Whether a visitor whose country can't be resolved from `request.cf.country` (rare, but possible) should default to USD or EUR.
