# OfferTrail — Terms of Service (DRAFT — ARCHIVED, SUPERSEDED)

**Superseded 2026-07-27.** This early draft was replaced by the Termly-generated Terms of Service, reviewed and corrected (see the terms.rtf review pass that fixed the address placeholder, missing price-grandfathering clause, the self-contradictory User Contributions section, the Reviews section overstating the private Feedback feature, and the premature Social Media/sign-in section), now live at [src/components/TermsOfService.tsx](src/components/TermsOfService.tsx) and served at `/terms`. Kept here only for historical reference — do not treat this as current. §10 (Contribution License) in the live document still has a minor unresolved inconsistency flagged in the handoff; see that instead of this file.

**Status: rough draft only.** This is a starting point for a real Terms of Service, written by Claude Code, not a lawyer. Do not publish or rely on this as a binding legal document until §10/§11/§12 have gone through a free ToS generator (see the summary at the bottom). Remaining open items are flagged inline with **[REVIEW: ...]** notes and summarized again at the bottom. Those notes are written *for you*, not for end users — strip them all out before this ever goes live.

Last updated: [DATE — fill in on publish]

---

## 1. Who these Terms are between

These Terms of Service ("Terms") are an agreement between you and **Fatih Yildirim**, an individual operating in Romania ("we," "us," "our"), governing your use of the OfferTrail application, browser extension, and related services (together, the "Service").

**[REVIEW: this Service is currently operated by an individual, not a registered company — confirm whether any Romanian registration (e.g. PFA) is legally required before accepting payments at this volume, separately from the Terms wording itself. If you later incorporate, this section just needs the entity name swapped — nothing else in this document depends on that choice.]**

By creating an account, using the Service as a guest, or subscribing to OfferTrail Pro, you agree to these Terms. If you don't agree, don't use the Service.

## 2. The Service

OfferTrail is a job-application tracking tool. It has two tiers:

- **Free** — the Kanban board, manual entry, drag-and-drop, multiple trackers, archive with undo, guest mode, account creation and data migration, interview scheduling and calendar export, and JSON data export.
- **Pro** — a paid subscription that raises the monthly AI-extraction limit from 5 to 500 extractions, and unlocks XLSX/CSV export for the Table and Insights views. Pro pricing, billing, and cancellation are covered in §5.

Our current commitment to keeping the free tier free is described on our pricing page, not as a term of this contract.

## 3. Accounts

You need an account (email, password, and a display name) to use the Service beyond guest mode. You're responsible for keeping your login credentials secure and for all activity under your account. Tell us immediately if you suspect unauthorized access.

You must be old enough to form a binding contract in your country of residence to create an account.

## 4. Acceptable use

You agree not to:

- Use the Service for any unlawful purpose, or to track, harass, or store information about people without a lawful basis to do so.
- Attempt to bypass the AI-extraction quota, the free/Pro entitlement checks, or any other access control.
- Submit content to the AI-extraction feature that you don't have the right to submit, or that's designed to manipulate the underlying AI model (e.g., prompt injection attempts).
- Reverse-engineer, scrape, or attempt to extract the Service's source code beyond what's already open (if applicable), or interfere with its normal operation (e.g., attempting to overwhelm the extraction quota system).
- Resell, sublicense, or provide the Service to third parties as your own product.

We may suspend or terminate accounts that violate this section — see §9.

## 5. Subscriptions, billing, and cancellation (Pro tier)

**5.1 Pricing.** Pro costs $5.99/month or $14.99/quarter (or the EUR-equivalent digits, shown automatically based on your location — see our Privacy Policy for how that's determined). These are the actual prices charged; we don't display a fake "regular" price alongside a permanent discount.

**5.2 Price changes and grandfathering.** We may change Pro's price for *new* subscribers at any time. If you're already subscribed, your price stays the same for as long as you keep your subscription without interruption. If you cancel and re-subscribe later, the then-current price applies.

**5.3 Billing.** Payment is processed by Stripe. We never see or store your card details. Subscriptions renew automatically each billing period (monthly or quarterly, matching your plan) until canceled. You authorize us (via Stripe) to charge your payment method each renewal.

**5.4 Cancellation.** You can cancel anytime from Account settings via the Stripe billing portal. Cancellation takes effect at the end of your current billing period — you keep Pro access until then, and are not charged again afterward. **[REVIEW: confirm this matches the actual Stripe Customer Portal configuration once it's set up — Stripe's default portal behavior should match this, but verify the portal settings weren't left on "cancel immediately."]**

**5.5 Right of withdrawal and refunds.** If you're a consumer in the EU, you have the right to withdraw from your Pro subscription within **14 days** of it starting. To exercise this right, **email us at fazare@fazare.dev within that 14-day window** requesting withdrawal. We will refund you in full if, at the time of your request, **you have used 5 or fewer AI extractions during the current billing period** — that's the same amount already included free, so a refund at or under that usage means you haven't drawn on anything beyond what the free tier already offers. If you've used more than 5 extractions, the withdrawal right doesn't apply and no refund is given, but you may still cancel to stop future renewals (see §5.4). Outside the 14-day window, subscriptions are non-refundable except where required by law.

**[REVIEW: this policy is written to match what you described, but confirm with a lawyer that tying refund eligibility to extraction usage (rather than a no-questions-asked refund) is compatible with how the EU withdrawal right actually needs to be honored for digital services — the usage-based condition is a reasonable-sounding business rule, but its legal validity as a *complete* substitute for a plain withdrawal right hasn't been verified.]**

**5.6 Taxes.** Prices may not include applicable VAT/sales tax, which is calculated and added at checkout via Stripe Tax where required by law.

## 6. AI extraction feature

The "Extract with AI" feature (screenshot upload and the browser extension) uses a third-party AI model (Anthropic's Claude) to read job-posting details and pre-fill the application form. You should review and correct the pre-filled fields before saving — **the extracted data is not guaranteed to be accurate, and we're not responsible for decisions you make based on incorrect extracted data.**

Free accounts get 5 extractions per month; Pro accounts get 500 per month. Unused extractions don't carry over, and we may adjust these limits with notice.

## 7. Your content and data

You keep ownership of the data you enter into OfferTrail (application details, notes, etc.). You grant us the limited right to store, process, and display that data back to you as needed to run the Service (e.g., storing it in our database, sending screenshots to Anthropic when you explicitly request extraction). We don't use your content to train AI models, sell it, or use it for advertising — see our Privacy Policy for the full data-handling picture.

You're responsible for the legality of the data you store — e.g., don't use OfferTrail to store information about other people in ways that would violate their privacy rights.

## 8. Intellectual property

The Service's design, code, and branding belong to us (or our licensors). These Terms don't grant you any rights to our intellectual property beyond what's needed to use the Service as intended.

## 9. Termination

**By you:** delete your account anytime from Account settings — this permanently removes your data (see Privacy Policy). Canceling a Pro subscription is separate from account deletion — see §5.4.

**By us:** we may suspend or terminate your account if you violate §4 (Acceptable use), or if we discontinue the Service entirely (with reasonable notice where practical). If you have an active Pro subscription at termination through no fault of your own, **[REVIEW: decide the refund/proration policy for this case — ties into §5.5.]**

## 10. Disclaimers

**[PENDING — sourcing from a free ToS generator (Termly/GetTerms/Enzuzo), per your 2026-07-27 decision. Paste the generator's disclaimer clause here, then delete this bracket. Don't publish this section with the bracket still in it.]**

The Service is provided "as is" and "as available." We don't guarantee it will be uninterrupted, error-free, or that AI-extracted data will be accurate. This placeholder sentence should be replaced by the generator's own wording, not kept as-is — it's here only so the document reads coherently until then.

## 11. Limitation of liability

**[PENDING — sourcing from a free ToS generator, per your 2026-07-27 decision. This is the highest-priority section to replace: you're operating as an individual (§1), not through a liability-limited company, so this clause carries more real weight for you personally than it would for an incorporated business. Paste the generator's liability clause here, then delete this bracket.]**

## 12. Governing law and disputes

**[PENDING — sourcing from a free ToS generator, per your 2026-07-27 decision. Double-check the generator actually accounts for Rome I / EU consumer-protection rules (a Romanian-law clause isn't automatically enforceable against consumers in other EU countries) — most reputable generators handle this correctly for EU-facing businesses, but verify rather than assume. Paste the generator's governing-law clause here, then delete this bracket.]**

## 13. Changes to these Terms

We may update these Terms from time to time. If we make a material change, we'll make reasonable efforts to notify you (e.g., via the app or email) before it takes effect. Continuing to use the Service after a change takes effect means you accept the updated Terms.

## 14. Contact

Questions about these Terms: [fazare@fazare.dev](mailto:fazare@fazare.dev)

---

## Summary of what still needs attention (for you, not for the published page)

**Resolved:**
- §1 — entity is Fatih Yildirim, operating individually (no company).
- §5.5 — concrete refund/withdrawal policy in place (14-day email request, refund only if ≤5 extractions used this billing period). Still worth a lawyer's confirmation, if you ever get one cheaply, that this usage-based condition is a valid way to satisfy the EU withdrawal right rather than just a reasonable-sounding business rule — but not a blocker for publishing given the budget constraint.
- §3 (age) intentionally left generic, no explicit number.
- The free-tier-forever commitment was removed from binding Terms language entirely (§2 now just points to the pricing page).

**Still open — blocking publication:**
- §10 (disclaimers), §11 (limitation of liability), §12 (governing law) are all marked `[PENDING]`, to be filled from a free ToS generator (Termly, GetTerms, Enzuzo, or similar) per your decision on 2026-07-27. **Do not publish this document with any `[PENDING]` bracket still present** — that's the actual gate, not a suggestion. §11 is the one to prioritize if you only get to one before a deadline, since you're operating personally rather than through a liability-limited company.
