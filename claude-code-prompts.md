# Claude Code — Session Prompts

Paste these into Claude Code **one per session**, in order. Each builds one milestone and stops. Between sessions, nothing lives in your head or the chat — `PLAN.md` and git hold the state.

## How to use this

1. Put `job-tracker-mvp-brief.md` and `PLAN.md` in the repo root before Session 1.
2. Run **one milestone per session.** Paste the prompt, let Claude Code show its plan, approve it, then let it build and commit.
3. When a session finishes a milestone, start a fresh session for the next one.
4. **If a session hits the time limit mid-milestone,** don't panic — the committed work is safe. Next session, use the **Resume prompt** at the bottom; it picks up from PLAN.md and git.
5. **Effort:** set it per the note in each prompt. Routine milestones run on **High**; the two hard ones (M3, M5) suggest **Extra high**. Don't run everything at the top — it just burns your window faster.

---

## Session 1 — M1: Foundation  *(effort: High)*

```
Read job-tracker-mvp-brief.md and PLAN.md in the repo root, then complete ONLY Milestone M1 (Foundation).

First, show me your execution plan for M1 and wait for my approval before writing any code. Then build it, committing after each working sub-step and checking off items in PLAN.md as you go.

Scope for this session is M1 only: project scaffold, Supabase project with RLS enabled on all tables from the start, the applications and stage_history schema, and the IndexedDB local mirror. End with the app shell running. Do NOT start M2 — stop when M1 is done, committed, and PLAN.md is updated.
```

## Session 2 — M2: Board + manual entry  *(effort: High)*

```
Read PLAN.md and job-tracker-mvp-brief.md, then check the current state of the code. Complete ONLY Milestone M2 (Board + manual entry).

Show me your plan for M2 first and wait for approval. Then build, committing after each working sub-step and updating PLAN.md.

M2 scope: the 4-column Kanban board (Eyes on, Applied, Interview, Offer), cards showing only company / role / date applied, and the add-and-edit application form persisting to the local store. The board should be fully usable as a guest by the end. Do NOT start M3 — stop when M2 runs, is committed, and PLAN.md is updated.
```

## Session 3 — M3: Movement + detail  *(effort: Extra high)*

```
Read PLAN.md and job-tracker-mvp-brief.md, then check the current state of the code. Complete ONLY Milestone M3 (Movement + detail).

Show me your plan first and wait for approval. Then build, committing after each working sub-step and updating PLAN.md.

M3 scope: drag-and-drop between columns with dnd-kit (keyboard-accessible), stage changes that update current_stage and append a stage_history row, and the card detail view with edit. Do NOT start M4 — stop when M3 runs, is committed, and PLAN.md is updated.
```

## Session 4 — M4: Archive + undo  *(effort: High)*

```
Read PLAN.md and job-tracker-mvp-brief.md, then check the current state of the code. Complete ONLY Milestone M4 (Archive + undo).

Show me your plan first and wait for approval. Then build, committing after each working sub-step and updating PLAN.md.

M4 scope: the split-button archive (default reason Rejected, ▾ opens Rejected/Withdrawn/No response/Accepted), current_stage preserved on archive, a separate Archive view with un-archive, a quiet archived count on the board, the ~10s undo toast, and Ctrl/Cmd+Z to undo the last archive only. Do NOT start M5 — stop when M4 runs, is committed, and PLAN.md is updated.
```

## Session 5 — M5: Auth + migration  *(effort: Extra high — the risky one)*

```
Read PLAN.md and job-tracker-mvp-brief.md, then check the current state of the code. Complete ONLY Milestone M5 (Auth + guest-to-account migration).

Show me your plan first and wait for approval. Treat the migration as the highest-risk part of the whole build — it must transfer ALL local guest data into a newly created account with zero loss, be idempotent, and be tested. Then build, committing after each working sub-step and updating PLAN.md.

M5 scope: Supabase Auth (sign up / log in), the dismissible account-nudge banner, the guest-to-account migration, Supabase becoming the source of truth with the local store as cache, and verifying RLS scopes each user to their own rows only. Assume a brand-new account is empty (do NOT build multi-device merge / conflict resolution). Do NOT start M6 — stop when M5 runs, is committed, and PLAN.md is updated.
```

## Session 6 — M6: GDPR + polish  *(effort: High)*

```
Read PLAN.md and job-tracker-mvp-brief.md, then check the current state of the code. Complete ONLY Milestone M6 (GDPR + polish).

Show me your plan first and wait for approval. Then build, committing after each working sub-step and updating PLAN.md.

M6 scope: JSON export of all the user's data, account deletion that truly deletes everything, a short privacy policy page, and empty states. Optional if time allows: a subtle stale-card indicator (in-app only) and an external donation link in the footer. This completes the MVP — stop when M6 runs, is committed, and PLAN.md is updated.
```

---

## Resume prompt (use if a session died mid-milestone)

```
Read PLAN.md and job-tracker-mvp-brief.md, then inspect the current state of the code and the git log to see exactly what's already done. Continue the milestone currently marked active in PLAN.md from the next unchecked item — do not redo completed work.

Commit after each working sub-step and keep PLAN.md updated. Complete only that one milestone, then stop; do not start the next one.
```
