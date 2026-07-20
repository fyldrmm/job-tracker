import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetIndexedDb } from '../test/dbHelpers'
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
