# HANDOFF.md

**Session scope:** Diagnosed and fixed a bug where extracting from a non-job-posting image (e.g. a personal photo) silently deducted the user's AI-extraction quota with no error or message. Iterated the fix through a design reversal (refund → charge-with-warning) and a follow-on bug fix, plus documented the prompt-injection threat model and simplified duplicated code in the Edge Function. Also touched the browser extension (republish + tracker/stage picker + quota display) and the Chrome Web Store listing assets earlier in this session, both already fully committed before the extraction-warning work started.

## Commits this session

- `1c60e97` — Update the browser extension: republish + tracker/stage picker + quota line
- `f9728c1` — Document how the store listing images were built
- `5a9dc11` — Refund extraction quota when nothing usable comes back (superseded by next commit's design reversal, kept as history)
- `71866a9` — Charge for blank extractions again, point to Feedback, simplify Edge Function
- `1e21548` — Fix silent no-warning extraction on genuinely irrelevant images

All pushed to `origin/main`. `git status` is clean except untracked `extension/store-assets/` (generated marketing PNGs, gitignored-by-convention), `final/` (pre-existing brand assets, unrelated to this session), and `test-images/` (3 real user-provided test photos used for live verification — safe to delete, not referenced by any code).

## Exact stopping point

Nothing in progress. The extraction-warning feature is complete, deployed, and verified live:

- `supabase/functions/extract-job-details/index.ts` — live version `2026-08-02.1` (confirmed via `curl -sI -X OPTIONS <url> | grep x-function-version`). Key logic at the "usable extraction" check: `hasRequiredFields = extracted.company != null || extracted.role_title != null`, driving a `warning: {reason: 'not_job_posting'|'no_details_found', message} | null` that's always attached to a `200 success:true` response. Token usage is now recorded unconditionally (blank results are charged).
- `src/components/ApplicationForm.tsx` — inline warning render block (~line 222-235) shows `extractWarning.message`, with a "send feedback" button (calls the new `onOpenFeedback` prop) appended only when `reason === 'no_details_found'`.
- `src/components/Board.tsx` — wires `onOpenFeedback={() => setFeedbackModalOpen(true)}` into `<ApplicationForm>`, and `runExtensionExtraction` shows a toast (via existing `showError`) with the same feedback-pointer text for the text-mode (extension handoff) extraction path.
- `src/lib/remoteStore.ts` — `extractJobDetails`/`extractJobDetailsFromText` now return `{fields, warning}` instead of just `fields`.

User's final instruction in this arc: leave it as-is, don't build a live test case for the `no_details_found` path specifically (declined), and don't list this feature under PLAN.md's "Postponed / deferred" section since it's done, not deferred. Both PLAN.md's "Current status" and "Decisions & notes" sections have been updated with the full account (see the 2026-08-01/02 entries) — no further doc work needed for this arc.

## Next action

None queued — this arc is closed. If resuming general work on the repo, check PLAN.md's "Current status" for the other still-open items (unrelated to this session): a real live-mode Stripe purchase test, and confirming the Chrome Web Store re-submission of the updated extension went through (both pre-existing open items, not re-raised this session).

## Learned this session

- **A junk/non-job-posting extraction costs almost the same tokens as a real one** (~1,172 vs ~1,175 in a live measurement) — the model has to read the full input regardless of verdict. This directly drove the refund→charge design reversal; don't assume a "failed" AI call is cheap without measuring.
- **The first fix attempt had a real bug**: checking "any of the 7 optional fields is non-null" as the bar for "usable" was too lenient — a stray guessed field (e.g. `work_mode`) on an obviously irrelevant image kept `warning` at `null` even though the extraction was junk, reproducing the exact reported symptom. The fix required narrowing to the 2 fields (`company`, `role_title`) that `ApplicationForm.tsx`'s `handleSubmit` actually requires — worth remembering as the correct standard for "did this extraction produce anything usable" anywhere else this pattern might recur.
- **Costly detour, now a standing lesson**: spun up headless Chrome (`puppeteer-core` against system Chrome) to synthesize a fake test image for a diagnostic, inlined ~17KB of base64 into a browser `javascript_tool` call, and burned ~30 minutes plus the user's entire monthly extraction quota without root-causing anything (hit an unrelated, unexplained 502). The correct cheap approach — confirmed working immediately after — is real small user-provided images, with base64 read from a file via Bash+curl+python3 rather than pasted inline into browser tool calls.
- **`<input type="file">.value` cannot be set programmatically** (`InvalidStateError`) — the file-picker UI cannot be automated from this environment, so any test needing to go through the actual `ApplicationForm` file input must be done via direct API calls (curl/fetch to the Edge Function) instead of browser automation.
- The unrelated 502 hit during the synthetic-image detour was never root-caused and is **not** the same bug as the one reported (a real 502 already surfaces a visible error via the client's existing `catch` block) — deliberately not chased further, out of scope.

## Open questions

None outstanding for this arc. Pre-existing open items from PLAN.md (unrelated to this session, not re-raised): live-mode Stripe purchase test; Chrome Web Store re-submission confirmation; Google sign-in (deferred to post-beta).

## Verify

```bash
git log --oneline -5
```
Expect `1e21548` at the top, `71866a9` and `5a9dc11` below it, all present in `git log origin/main --oneline -5` too (confirms pushed).

```bash
curl -sI -X OPTIONS https://fjlmyaamarnjlthbhycx.supabase.co/functions/v1/extract-job-details | grep -i x-function-version
```
Expect `x-function-version: extract-job-details@2026-08-02.1`.

```bash
npx tsc -b --noEmit && npx vitest run
```
Expect `tsc` clean, `vitest` at the pre-existing baseline (192 passed / 52 failed — unrelated pre-existing failures, unchanged by this session's work).
