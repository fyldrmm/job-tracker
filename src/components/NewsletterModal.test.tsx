import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

afterEach(() => {
  cleanup()
  vi.resetModules()
})

async function renderNewsletterModal(
  email = '',
  overrides: { subscribeToNewsletter?: () => Promise<void> } = {},
) {
  vi.doMock('../lib/newsletter', () => ({
    subscribeToNewsletter: overrides.subscribeToNewsletter ?? vi.fn().mockResolvedValue(undefined),
  }))
  const { NewsletterModal } = await import('./NewsletterModal')
  render(<NewsletterModal email={email} onClose={vi.fn()} />)
}

describe('NewsletterModal', () => {
  it('pre-fills the email field for a signed-in user', async () => {
    await renderNewsletterModal('ada@example.com')
    expect(screen.getByPlaceholderText('you@example.com')).toHaveValue('ada@example.com')
  })

  it('disables Subscribe until the consent checkbox is checked', async () => {
    await renderNewsletterModal('ada@example.com')
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeDisabled()
    await userEvent.setup().click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: 'Subscribe' })).not.toBeDisabled()
  })

  it('the consent checkbox is unticked by default', async () => {
    await renderNewsletterModal('ada@example.com')
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('shows a success message after subscribing', async () => {
    await renderNewsletterModal('ada@example.com')
    const user = userEvent.setup()
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))
    await waitFor(() => expect(screen.getByText(/You're on the list/)).toBeInTheDocument())
  })

  it('shows an error and stays put if subscribing fails', async () => {
    await renderNewsletterModal('ada@example.com', {
      subscribeToNewsletter: () => Promise.reject(new Error('Please enter a valid email address.')),
    })
    const user = userEvent.setup()
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))
    await waitFor(() => expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument())
    expect(screen.queryByText(/You're on the list/)).not.toBeInTheDocument()
  })
})
