# JobTracker — Monetization & Launch Strategy

> **Purpose of this document:** Self-contained context for AI assistants (Claude) working on this
> product. Everything needed to understand the product and the business decisions is stated here.
> Do not assume prior conversation context.

---

## 1. Product Context (read first)

- **What it is:** A job application tracker web app. Users save job postings, track them through
  pipeline stages (saved → applied → interview → offer), and manage interviews.
- **Current URL:** `https://jobtracker.fazare.dev` (a **rebrand is planned** — see §7; do not
  treat "JobTracker" as the final name).
- **Tech stack:**
  - Frontend: **Vite-built React SPA** (static hosting behind **Cloudflare**). It is *not* Next.js.
  - Backend: **Supabase** (Postgres + Auth + Edge Functions). Project:
    `fjlmyaamarnjlthbhycx.supabase.co`
  - Auth: Supabase Auth, **email/password only** (all OAuth providers disabled). Email confirmation
    is enforced. Sessions are stored in `localStorage` (Supabase default).
  - AI: **Anthropic API called from a Supabase Edge Function** (the API key is server-side only;
    it must NEVER appear in the client bundle).
- **Existing features:**
  - **"Extract with AI":** user picks a screenshot of a job posting → base64 → edge function →
    Anthropic vision → structured fields (`company`, `role_title`, `salary_range`, …) pre-fill the
    form. Image-only validation, 5 MB max. Screenshots are sent only on explicit user action and
    are **never stored**; only timestamp + token count are logged per extraction.
  - **Browser extension:** saves jobs from job boards; also uses AI extraction, so it consumes the
    same quota as screenshots.
  - Privacy policy page (`/privacy`), account/data deletion flow, Google Calendar links, Ko-fi
    donation link.
- **Business state:** Completely free today, no paywall. Solo developer, near-zero marginal cost
  per user. Paywall launch is imminent (days, not months).

---

## 2. Pricing (decided)

- **Pro Monthly: $5.99/month.**
- **Pro Lifetime: $59.99 one-time** — framed as *"pay once, yours for every job search, forever."*
- **NO annual plan.** Rationale: users expect to be employed within 2–4 months; a year of prepaid
  subscription feels pessimistic and drives refunds/chargebacks. Lifetime fits the real usage
  pattern (people job hunt episodically, every few years).
- **NO weekly billing, ever.** (Teal's $13/week compounding to $52–65/month is the category's most
  hated dark pattern.)
- Pricing-page anchor copy: *"Less than one week of Teal+."* (Teal+ = $13/week, Huntr Pro = $40/mo.)
- If prices ever increase, **grandfather existing buyers** — early supporters keep their price
  forever; this is part of the launch story.

## 3. Tiers & Paywall Split (decided)

**Free tier:**
- Unlimited manual tracking (adding/editing jobs by hand, kanban, pipeline stages).
- **5 AI extractions per month, recurring monthly reset.** This reset matters: it is a free tier,
  not a trial. Never switch to one-time credits (that is Teal's anti-pattern).

**Pro tier ($5.99/mo or $59.99 lifetime):**
- **500 AI extractions per month** (screenshot extractions and extension saves draw from the same
  quota, because both cost the same AI tokens).
- Interview tracking was considered as Pro-only; the recommendation is to keep it **free** to avoid
  a "rug-pull" moment when users get their first interview. Final call: owner's decision.

**Hard rules:**
- Manual tracking is never paywalled. The value story is one sentence: *"Unlimited tracking free
  forever; pay for the AI that saves you typing."*
- Never retroactively shrink the free tier for existing users. Only gate *new* features.
  (Huntr retroactively capping existing users at 100 jobs destroyed its community reputation.)

## 4. Quota Enforcement & Abuse Protection (implementation spec)

All quota logic MUST be enforced **server-side in the Supabase Edge Function**, never client-side.

- **Monthly volume cap: 500 extractions/month (Pro), 5/month (Free).** This is the only volume
  limit. Do NOT add a daily cap — the monthly cap already bounds cost, and daily caps punish
  legitimate bursty behavior (users batch applications on weekends).
- **Velocity limit: ~10 extractions per minute per user.** Invisible to humans (a person blitzing
  tops out around 8–12/min including API latency), strangles scripts. Implement as a count of
  extraction-log rows in the last 60 seconds.
- **Count only successful extractions.** Failed API calls or unusable results must not decrement
  quota.
- **Deduplication:**
  - Screenshots: hash the image (SHA-256); re-uploads of an identical image return the cached
    result without a new Anthropic call or quota decrement.
  - Extension saves: dedupe by job URL; re-clipping an already-saved posting returns the cached
    extraction.
- **Anomaly detection (using the existing extraction log):** alert on any account that (a) exceeds
  ~80% of the monthly cap for 2+ consecutive months, or (b) sustains max velocity for >1 hour.
  These are abuse signatures; legitimate users never match them.
- **ToS fair-use clause:** personal job-search use only; automated or bulk use prohibited; right
  to throttle or terminate abusive accounts.
- **UX:** display remaining quota ("147 / 500 this month"), soft-warn at ~90%, and a graceful
  "resets on the 1st" message when exhausted. Never surprise-block a paying user.

## 5. AI Cost Optimization (implementation spec)

- **Extension sends cleaned DOM text, not screenshots.** Text-only extraction is ~2–4x cheaper than
  vision and more accurate. Truncate the page payload to ~4,000 characters (job pages carry tens of
  KB of navigation junk). Reserve vision calls for actual image uploads only.
- **Use the cheapest adequate Anthropic model (Haiku class)** for structured extraction:
  ~$0.003/extraction. Verify which model the edge function currently calls; if it is Sonnet-class,
  switching is the single biggest cost lever.
- Reference economics: 500 extractions ≈ $1.50–2.50/month worst case per maxed-out user on Haiku.
  A lifetime buyer's long-term API liability is a few dollars in practice (job searches end).
- Reference behavior: a heavy real user ("save 100 jobs, apply to 10–15%") consumes ~130
  extractions/month including retries — about 26% of the Pro cap. The 500 cap has 4–5x headroom.

## 6. Payments, Refunds, Cancellation

- Prefer a **merchant of record** (Lemon Squeezy or Paddle) over raw Stripe when selling globally —
  they handle VAT/sales tax as the seller of record.
- **Refund policy: 7 days, no questions asked**, published on the pricing page (not buried in ToS).
  EU/UK note: consumer law grants a 14-day withdrawal right on digital purchases unless the buyer
  explicitly waives it in exchange for immediate access — a merchant of record handles this wording
  automatically; with raw Stripe, add the waiver checkbox at checkout.
- **Cancellation: one click from account settings.** No retention maze, no "are you sure" gauntlet.
  Access continues until the end of the paid period. (Teal's cancellation friction is its one-star
  review engine; easy cancellation increases conversion and brings users back for their next search.)
- Keep the **Ko-fi** link as a no-commitment tip-jar fallback.

## 7. Naming & Brand

- **Do not keep "JobTracker" as the product name.** It is generic/descriptive (weak trademark,
  impossible SEO — the category keyword itself), a commercial product already exists at
  usejobtracker.com, and jobtracker.com is unobtainable.
- **Recommended new name: OfferTrail.** Double meaning: the *trail* of tracked applications leading
  to an *offer*. Available domains (verified 2026-07-25): `offertrail.io`, `offertrail.app`,
  `offertrail.dev`. The `.com` is registered/parked.
- Social handles: `@offertrail` is available on GitHub, X, TikTok, npm; **taken on YouTube**;
  unknown on Instagram/Reddit/Facebook/Product Hunt. The uniform-handle fallback is
  `@offertrailapp` (unchecked as of this writing).
- Tagline keeps the SEO keyword: **"OfferTrail — the privacy-first job application tracker."**
- Before committing: run USPTO TESS and EUIPO eSearch (Class 9/42), and register domains before any
  public announcement.
- Backup name: **JobHarbor** (privacy/safe-harbor story; `.io`/`.app`/`.dev` also verified
  available). Runner-up because "harbor" is static while the product is about motion.

## 8. Competitive Positioning (why these decisions were made)

| Competitor | Pricing | Key mistake to avoid copying |
|---|---|---|
| **Teal** (~4M cumulative users, ~$19M VC, unprofitable on $4.2M/2024 revenue) | Free unlimited tracker; Teal+ $13/week (~$29/mo) | Weekly-billing trap; silent 44% price hike; cancellation friction; one-time "free" AI credits that are really a trial; overclaimed marketing ("6X more interviews", no methodology) |
| **Huntr** (~250K extension users) | Free capped at 100 jobs; Pro $40/mo | Retroactively shrank the free tier for existing users (community revolt); $160/6-month lock-in push; refund policy capped at 2 invoices |
| **Simplify** (1M+ extension users) | Free autofill; Pro $39.99/mo | — (free tier pressure on everyone) |
| Budget wave (TrackJobs $6/mo, Oaki $50 one-time, ApplyArc ~$24/mo) | cheap / one-time | — (proves the $5–15/mo and lifetime price points) |

**Structural category facts:**
- Churn-by-success: when a user lands a job, they cancel. LTV is inherently 2–4 months of
  subscription. Mitigation: lifetime plan, easy return, expansion features later.
- Users are unemployed and price-sensitive; willingness-to-pay ceiling is real.
- The category frontier is moving to auto-apply/AI agents; pure tracking is table stakes. This
  product's wedge is AI data-entry elimination + privacy, not auto-apply.

**Positioning statement:** *"Built by a job seeker. No billing tricks, no weekly plans, cancel in
one click, your screenshots are never stored, your data stays yours."* The incumbents' dark patterns
are this product's marketing.

## 9. Pre-Launch Security Blockers (from security review, 2026-07-24)

MUST be fixed before accepting payments:

1. **H-1 (High):** Site currently serves over plaintext HTTP with **no redirect to HTTPS** and **no
   HSTS**. Fix in Cloudflare: enable "Always Use HTTPS", enable HSTS
   (`max-age=31536000; includeSubDomains; preload`), set SSL/TLS mode to Full (Strict).
2. **M-1 (Medium):** Missing security headers on all responses. Add via Cloudflare Transform Rules:
   `Content-Security-Policy` (allow `connect-src` to the Supabase project + its websocket),
   `X-Frame-Options: DENY` (or `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
3. **M-3 (verification gap):** Audit Supabase RLS before paying users arrive: every public table has
   RLS enabled with `auth.uid()`-scoped policies; storage bucket policies embed `auth.uid()` in
   object paths; audit any `SECURITY DEFINER` functions.
4. Supabase Auth hardening: enable refresh-token rotation + reuse detection; confirm password policy.

Already verified good (no action): RLS blocks anonymous reads of the `applications` table; email
confirmation enforced; no Anthropic/Supabase service keys in the client bundle; no sourcemaps or
dotfiles exposed; no app-level `dangerouslySetInnerHTML`/`eval` usage.

## 10. Open Items / Not Yet Decided

- Whether interview tracking ships free or Pro-only (recommendation: free — see §3).
- `@offertrailapp` handle availability sweep (unchecked).
- Final name confirmation pending USPTO/EUIPO trademark search.
- Payment processor selection (Lemon Squeezy vs Paddle vs Stripe).
- Free-tier extraction count (5/month) and Pro count (500/month) are decided but can be tuned after
  launch using the extraction-log data.
