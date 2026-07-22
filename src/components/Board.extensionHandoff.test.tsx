import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetIndexedDb } from '../test/dbHelpers'
import { EXTENSION_MESSAGE_SOURCE } from '../lib/extensionHandoff'
import { Board } from './Board'

// Separate file/mock from Board.test.tsx (guest-only, session: null) and
// Board.migration.test.tsx (signed-in via a static pre-set session) for the
// same reason Board.migration.test.tsx gives for its own file: these tests
// need to drive a LIVE sign-up/log-in transition mid-test (for the
// hold-across-sign-in-wall case), which needs the onAuthStateChange
// callback captured and invocable, not just a session read once at mount.
interface FakeUser {
  id: string
  email: string
  created_at: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
  aud: string
}

let currentSessionUser: FakeUser | null = null
let authChangeCallback: ((event: string, session: { user: FakeUser } | null) => void) | null = null
let extractedFields: Record<string, string | null> = {}
let extractShouldFail = false

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

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: currentSessionUser ? { user: currentSessionUser } : null } }),
      onAuthStateChange: (cb: (event: string, session: { user: FakeUser } | null) => void) => {
        authChangeCallback = cb
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      // Mirrors what a real Supabase client does: the sign-in call itself
      // is what fires the auth-state-change event the app listens to.
      signInWithPassword: ({ email }: { email: string }) => {
        const user = makeUser({ email })
        currentSessionUser = user
        authChangeCallback?.('SIGNED_IN', { user })
        return Promise.resolve({ error: null })
      },
    },
    // Every remote table read fails -- useApplications/useTrackers fall
    // back to the local IndexedDB cache by design. Writes succeed, so
    // tracker creation (the extraction handoff's "ensure a tracker exists"
    // step) actually goes through.
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: null, error: new Error('mocked: no network in tests') }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
    functions: {
      invoke: () =>
        extractShouldFail
          ? Promise.resolve({ data: null, error: { message: 'Extraction failed' } })
          : Promise.resolve({ data: { success: true, fields: extractedFields }, error: null }),
    },
  },
}))

function postExtensionMessage(text: string, sourceUrl: string | null = null) {
  fireEvent(
    window,
    new MessageEvent('message', {
      data: { source: EXTENSION_MESSAGE_SOURCE, type: 'extract', text, sourceUrl },
      origin: window.location.origin,
    }),
  )
}

describe('Board browser-extension handoff (milestone B1)', () => {
  beforeEach(async () => {
    await resetIndexedDb()
    sessionStorage.clear()
    currentSessionUser = null
    authChangeCallback = null
    extractedFields = {}
    extractShouldFail = false
  })

  afterEach(() => {
    cleanup()
  })

  it('shows the sign-in wall for a guest, since page text cannot be extracted from without an account', async () => {
    render(<Board />)
    await screen.findByRole('button', { name: '+ Create tracker' })

    postExtensionMessage('Senior Engineer at Acme Corp')

    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
    expect(screen.getByText('Sign in to extract job details from this page.')).toBeInTheDocument()
  })

  it('ignores a message from an unrelated source', async () => {
    render(<Board />)
    await screen.findByRole('button', { name: '+ Create tracker' })

    fireEvent(
      window,
      new MessageEvent('message', {
        data: { source: 'some-other-extension', type: 'extract', text: 'irrelevant' },
        origin: window.location.origin,
      }),
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole('heading', { name: 'Create an account' })).not.toBeInTheDocument()
  })

  it('extracts and opens a pre-filled add form for an already signed-in user with no tracker yet', async () => {
    currentSessionUser = makeUser()
    extractedFields = { company: 'Acme Corp', role_title: 'Senior Engineer', salary_range: null, location: null, job_link: null, employment_type: null, work_mode: null }

    render(<Board />)
    await screen.findByRole('button', { name: 'Sign out' })

    postExtensionMessage('Senior Engineer at Acme Corp', 'https://jobs.example.com/acme')

    expect(await screen.findByRole('heading', { name: 'Add application' })).toBeInTheDocument()
    expect(screen.getByLabelText(/company/i)).toHaveValue('Acme Corp')
    expect(screen.getByLabelText(/role title/i)).toHaveValue('Senior Engineer')
    // No job_link came back from the (mocked) extraction -- falls back to
    // the page URL the extension sent, rather than leaving it empty.
    expect(screen.getByLabelText(/job link/i)).toHaveValue('https://jobs.example.com/acme')
  })

  it('still opens the form seeded with the page URL when extraction itself fails', async () => {
    currentSessionUser = makeUser()
    extractShouldFail = true

    render(<Board />)
    await screen.findByRole('button', { name: 'Sign out' })

    postExtensionMessage('Senior Engineer at Acme Corp', 'https://jobs.example.com/acme')

    expect(await screen.findByRole('heading', { name: 'Add application' })).toBeInTheDocument()
    expect(screen.getByLabelText(/job link/i)).toHaveValue('https://jobs.example.com/acme')
    // showError prefers the server's actual error message over its own
    // fallback text (existing app behavior) -- just confirm a toast fired.
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('holds a guest handoff across the sign-in wall and resumes automatically once logged in', async () => {
    const user = userEvent.setup()
    extractedFields = { company: 'Acme Corp', role_title: 'Senior Engineer', salary_range: null, location: null, job_link: null, employment_type: null, work_mode: null }

    render(<Board />)
    await screen.findByRole('button', { name: '+ Create tracker' })

    postExtensionMessage('Senior Engineer at Acme Corp')
    await screen.findByRole('heading', { name: 'Create an account' })

    // Switch to log-in (an existing user, not a fresh sign-up) and complete it.
    // Scoped to the modal form -- the sidebar also has its own "Log in"
    // button for guests, which would otherwise ambiguously match too.
    await user.click(screen.getByRole('button', { name: 'Already have an account? Log in' }))
    const modalForm = screen.getByRole('heading', { name: 'Log in' }).closest('form') as HTMLElement
    await user.type(within(modalForm).getByLabelText('Email'), 'ada@example.com')
    await user.type(within(modalForm).getByLabelText('Password'), 'correct-horse-battery')
    await user.click(within(modalForm).getByRole('button', { name: 'Log in' }))

    // No second postMessage -- the held payload resumes on its own once
    // signed in, migration settles (nothing to migrate here), and a
    // tracker is auto-created since this fresh account has none yet.
    expect(await screen.findByRole('heading', { name: 'Add application' })).toBeInTheDocument()
    expect(screen.getByLabelText(/company/i)).toHaveValue('Acme Corp')
  })
})
