# Repo setup — connect to GitHub (do this before Session 1)

This is a one-time step that puts the project under git and pushes it to a new GitHub repo. After this, every milestone's commits are backed up on GitHub.

## Prerequisites (your one-time steps)

These involve your GitHub account, so you do them yourself — Claude Code can't log in as you:

1. **Git installed** — check with `git --version`.
2. **A GitHub account.**
3. **GitHub CLI authenticated** — install the `gh` CLI, then run `gh auth login` and follow the prompts. This is the login step only you can do.

*(If you'd rather not use `gh`, you can instead create an empty repo at github.com yourself and use the manual path below.)*

## Path A — let Claude Code create and connect the repo

Once `gh auth login` is done, paste this into Claude Code as your first (Session 0) action, before the M1 prompt:

```
Set this project up under git and connect it to a new GitHub repo.

Steps:
1. Confirm gh is authenticated (gh auth status). If it isn't, stop and tell me to run `gh auth login` — do not attempt to log in yourself.
2. Make sure job-tracker-mvp-brief.md, PLAN.md, and .gitignore are in the repo root. Verify .gitignore excludes .env before committing anything.
3. git init, then make an initial commit containing only the brief, PLAN.md, and .gitignore.
4. Create a new PRIVATE GitHub repo named "job-tracker" with `gh repo create`, set it as the origin remote, and push the initial commit.
5. Confirm the push succeeded and show me the repo URL. Then stop — do not start M1 in this session.
```

## Path B — manual (if you created the empty repo yourself)

Run these in the project folder (swap in your repo URL):

```
git init
git add job-tracker-mvp-brief.md PLAN.md .gitignore
git commit -m "Initial commit: brief, plan, gitignore"
git branch -M main
git remote add origin https://github.com/<your-username>/job-tracker.git
git push -u origin main
```

## Pushing during the build

Local commits alone don't back anything up off your machine. To get the safety benefit, **push at least at the end of every milestone/session** — you can add "and push to origin when the milestone is done" to any of the milestone prompts, or just run `git push` yourself after each session.

## Secrets — important

- The `.gitignore` excludes `.env`, so your Supabase keys won't be committed. Keep it that way.
- Supabase gives you two keys. The **anon/publishable key** is safe in client-side code *because RLS is on* — that's exactly why RLS being enabled everywhere matters. The **service_role key** must **never** be committed or used in the frontend; it bypasses RLS entirely.
- Commit a `.env.example` with empty placeholder variable names (no real values) so the required keys are documented without exposing them.
