import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { resetIndexedDb } from '../test/dbHelpers'
import { hasAnyLocalGuestData, putApplication, putTracker } from '../lib/localStore'
import { markPendingSignup } from '../lib/migration'
import type { Application, Tracker } from '../types/application'
import { Board } from './Board'

// Separate file from Board.test.tsx on purpose: that file's mock is a
// closed factory hardcoding session: null (guest mode only), and its own
// comment says so. These tests need a signed-in session, so they get
// their own mock rather than invalidating that one.
//
// currentSessionUser is read inside the vi.mock factory below despite
// being declared after this comment -- vi.mock calls are hoisted by
// Vitest, but the factory itself only actually RUNS when something
// imports '../lib/supabase' transitively, which happens after this
// module's top-level `let` has been assigned. Same pattern already used
// by migration.test.ts's upsertCalls/shouldFail.
interface FakeUser {
  id: string
  email: string
  created_at: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
  aud: string
}

let currentSessionUser: FakeUser | null = null

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: currentSessionUser ? { user: currentSessionUser } : null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    // Every remote read fails, so useApplications/useTrackers fall back to
    // the local IndexedDB cache -- by design (see their own console.warn
    // comments). That's enough to render a signed-in board without
    // stubbing the full remoteStore surface. Every remote WRITE (used by
    // migrateGuestDataToAccount) succeeds, so migration can actually run.
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: null, error: new Error('mocked: no network in tests') }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  },
}))

function makeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: { name: 'Ada' },
    aud: 'authenticated',
    ...overrides,
  }
}

function makeGuestTracker(overrides: Partial<Tracker> = {}): Tracker {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), user_id: null, name: 'Guest Tracker', created_at: now, updated_at: now, ...overrides }
}

function makeGuestApplication(trackerId: string, overrides: Partial<Application> = {}): Application {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    user_id: null,
    tracker_id: trackerId,
    company: 'Guest Co',
    role_title: 'Engineer',
    job_link: null,
    date_applied: '2026-01-01',
    current_stage: 'applied',
    salary_range: null,
    location: null,
    employment_type: null,
    work_mode: null,
    notes: null,
    is_priority: false,
    is_archived: false,
    archive_reason: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

async function seedGuestData() {
  const tracker = makeGuestTracker()
  await putTracker(tracker)
  await putApplication(makeGuestApplication(tracker.id))
}

const PENDING_SIGNUP_KEY = 'job-tracker:pending-signup'

describe('Board migration prompt vs. auto-migrate (AUDIT.md M6 regression)', () => {
  beforeEach(async () => {
    await resetIndexedDb()
    localStorage.clear()
    currentSessionUser = null
  })

  afterEach(() => {
    cleanup()
  })

  it('auto-migrates with no prompt when the flag matches the arriving session', async () => {
    await seedGuestData()
    markPendingSignup('ada@example.com')
    currentSessionUser = makeUser({ email: 'ada@example.com' })

    render(<Board />)
    await screen.findByRole('button', { name: 'Sign out' })

    await waitFor(async () => expect(await hasAnyLocalGuestData()).toBe(false))
    expect(screen.queryByText('Bring in your guest data?')).not.toBeInTheDocument()
  })

  it('shows the prompt instead of silently merging when the flag belongs to a different email', async () => {
    await seedGuestData()
    // Reproduces the reported bug directly: a flag left behind (by an
    // unrelated signup elsewhere) must not auto-migrate guest data into
    // THIS session just because guest data happens to exist.
    markPendingSignup('someone-else@example.com')
    currentSessionUser = makeUser({ email: 'ada@example.com' })

    render(<Board />)
    await screen.findByRole('button', { name: 'Sign out' })

    await screen.findByText('Bring in your guest data?')
  })

  it('clears the flag even with no guest data present, so it cannot outlive one session', async () => {
    // No seedGuestData() call -- this is the exact case that let the flag
    // linger before the fix: a signup (real or an already-registered-email
    // no-op) with nothing to migrate at that moment.
    markPendingSignup('ada@example.com')
    currentSessionUser = makeUser({ email: 'ada@example.com' })

    render(<Board />)
    await screen.findByRole('button', { name: 'Sign out' })

    await waitFor(() => expect(localStorage.getItem(PENDING_SIGNUP_KEY)).toBeNull())
    expect(screen.queryByText('Bring in your guest data?')).not.toBeInTheDocument()
  })
})
