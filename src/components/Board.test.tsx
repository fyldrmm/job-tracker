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
