import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetIndexedDb } from '../test/dbHelpers'
import { installGlobalErrorHandlers, resetGlobalErrorsForTest } from '../lib/globalErrors'
import { Board } from './Board'

// Guest mode never touches Supabase, but useAuth() still calls these on
// mount -- stub them so tests don't depend on network/env config and stay
// deterministic (user always resolves to null, i.e. guest mode).
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}))

describe('Board archive/undo (guest mode)', () => {
  beforeEach(async () => {
    await resetIndexedDb()
  })

  afterEach(() => {
    cleanup()
  })

  async function addApplication(user: ReturnType<typeof userEvent.setup>, company: string) {
    await user.click(await screen.findByRole('button', { name: '+ Create tracker' }))
    await user.click(await screen.findByRole('button', { name: '+ Add your first application' }))
    await user.type(screen.getByLabelText(/company/i), company)
    await user.type(screen.getByLabelText(/role title/i), 'Engineer')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await screen.findByText(company)
  }

  it('archives a card and restores it via the undo toast', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addApplication(user, 'Acme Corp')

    await user.click(screen.getByText('Acme Corp'))
    await user.click(await screen.findByRole('button', { name: 'Archive' }))

    await screen.findByText(/archived acme corp/i)
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument())
  })

  it('archives a card and restores it via Ctrl/Cmd+Z', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addApplication(user, 'Globex Inc')

    await user.click(screen.getByText('Globex Inc'))
    await user.click(await screen.findByRole('button', { name: 'Archive' }))
    await screen.findByText(/archived globex inc/i)

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })

    await waitFor(() => expect(screen.getByText('Globex Inc')).toBeInTheDocument())
  })
})

describe('Board global error surfacing (AUDIT.md C4)', () => {
  let uninstall: () => void

  beforeEach(async () => {
    await resetIndexedDb()
    // main.tsx installs this once at boot in production; tests render
    // Board directly without main.tsx, so it has to be installed here to
    // exercise the same path a real uncaught error would take.
    resetGlobalErrorsForTest()
    uninstall = installGlobalErrorHandlers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    uninstall()
    vi.restoreAllMocks()
    cleanup()
  })

  // A genuine ErrorEvent, not a plain Event with properties bolted on --
  // jsdom never invokes addEventListener('error', ...) listeners for a
  // dispatched 'error' event that only duck-types as an ErrorEvent. Also
  // suppresses jsdom's default action for an unhandled 'error' event,
  // which (unlike real browsers) it turns into an actual uncaught
  // exception in the test process rather than just a console log.
  function dispatchWindowError(overrides: { error?: Error; message: string }) {
    const event = new ErrorEvent('error', { cancelable: true, ...overrides })
    const suppressDefault = (e: Event) => e.preventDefault()
    window.addEventListener('error', suppressDefault)
    try {
      fireEvent(window, event)
    } finally {
      window.removeEventListener('error', suppressDefault)
    }
  }

  it('routes a window-level uncaught error through the existing ErrorToast, not a second UI', async () => {
    render(<Board />)

    dispatchWindowError({ error: new Error('boom'), message: 'boom' })

    const toast = await screen.findByRole('alert')
    expect(toast).toHaveTextContent(/something went wrong in the background/i)
  })

  it('does not surface known-benign noise like a ResizeObserver loop notice', async () => {
    render(<Board />)

    dispatchWindowError({ message: 'ResizeObserver loop completed with undelivered notifications.' })

    // Give any (incorrect) toast a chance to appear before asserting absence.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

// Guests can't use screenshot extraction (the quota is per-account), so the
// only way they learn it exists is these prompts -- and they're the exact
// traffic an ad for the feature would send. See AUDIT.md C6.
describe('Board extraction discovery (guest mode)', () => {
  const PROMO_CTA = 'Extract from screenshot'

  beforeEach(async () => {
    await resetIndexedDb()
  })

  afterEach(() => {
    cleanup()
  })

  it('promotes extraction on the first empty state, before any tracker exists', async () => {
    render(<Board />)

    await screen.findByRole('button', { name: '+ Create tracker' })
    expect(screen.getByText(/skip the typing/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: PROMO_CTA })).toBeInTheDocument()
  })

  it('still promotes extraction on the empty-board state, after a tracker exists', async () => {
    const user = userEvent.setup()
    render(<Board />)

    await user.click(await screen.findByRole('button', { name: '+ Create tracker' }))

    await screen.findByRole('button', { name: '+ Add your first application' })
    expect(screen.getByRole('button', { name: PROMO_CTA })).toBeInTheDocument()
  })

  it('opens sign-up from the promo, since extraction needs an account', async () => {
    const user = userEvent.setup()
    render(<Board />)

    await user.click(await screen.findByRole('button', { name: PROMO_CTA }))

    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
  })

  // The card has no dismiss button on purpose -- an empty board IS the
  // dismissal condition. If it ever leaked onto a populated board it would
  // become a permanent nag, which is the thing this design avoids.
  it('disappears once the board has an application', async () => {
    const user = userEvent.setup()
    render(<Board />)

    await user.click(await screen.findByRole('button', { name: '+ Create tracker' }))
    await user.click(await screen.findByRole('button', { name: '+ Add your first application' }))
    await user.type(screen.getByLabelText(/company/i), 'Acme Corp')
    await user.type(screen.getByLabelText(/role title/i), 'Engineer')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await screen.findByText('Acme Corp')

    expect(screen.queryByText(/skip the typing/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: PROMO_CTA })).not.toBeInTheDocument()
  })

  // A guest who already has applications never sees the empty-state card,
  // so the in-form hint is their only path to discovering the feature.
  it('hints at extraction inside the add form, where the real button is hidden', async () => {
    const user = userEvent.setup()
    render(<Board />)

    await user.click(await screen.findByRole('button', { name: '+ Create tracker' }))
    await user.click(await screen.findByRole('button', { name: '+ Add your first application' }))

    const hint = await screen.findByRole('button', { name: 'Free with an account' })
    await user.click(hint)

    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
  })
})
