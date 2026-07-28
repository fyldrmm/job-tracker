import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

afterEach(() => {
  cleanup()
  vi.resetModules()
})

async function renderLandingPage(
  overrides: {
    onContinueAsGuest?: () => void
    onLogIn?: () => void
    onSubscribed?: (email: string) => void
    onDismiss?: () => void
    subscribeToNewsletter?: () => Promise<void>
    signedInName?: string
  } = {},
) {
  vi.doMock('../lib/newsletter', () => ({
    subscribeToNewsletter: overrides.subscribeToNewsletter ?? vi.fn().mockResolvedValue(undefined),
  }))
  const { LandingPage } = await import('./LandingPage')
  render(
    <LandingPage
      onContinueAsGuest={overrides.onContinueAsGuest ?? vi.fn()}
      onLogIn={overrides.onLogIn ?? vi.fn()}
      onSubscribed={overrides.onSubscribed ?? vi.fn()}
      onDismiss={overrides.onDismiss}
      signedInName={overrides.signedInName}
    />,
  )
}

describe('LandingPage', () => {
  it('renders the waitlist form and the log-in path, with no way to skip', async () => {
    await renderLandingPage()
    expect(screen.getByRole('button', { name: 'Get Access' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Log in/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument()
  })

  it('has no close button when onDismiss is not provided (the forced first-visit gate)', async () => {
    await renderLandingPage()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  it('shows a close button when onDismiss is provided (the voluntary reopen)', async () => {
    const onDismiss = vi.fn()
    await renderLandingPage({ onDismiss })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('subscribes the entered email and reports it upward on submit', async () => {
    const subscribeToNewsletter = vi.fn().mockResolvedValue(undefined)
    const onSubscribed = vi.fn()
    await renderLandingPage({ subscribeToNewsletter, onSubscribed })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Get Access' }))
    await waitFor(() => expect(subscribeToNewsletter).toHaveBeenCalledWith('ada@example.com'))
    expect(onSubscribed).toHaveBeenCalledWith('ada@example.com')
  })

  it('shows a confirmation state with the guest CTA after a successful signup', async () => {
    await renderLandingPage()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Get Access' }))
    await waitFor(() => expect(screen.getByText(/You're on the list/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Start tracking now/ })).toBeInTheDocument()
  })

  it('surfaces an error and stays on the form if the signup fails', async () => {
    const onSubscribed = vi.fn()
    await renderLandingPage({
      subscribeToNewsletter: () => Promise.reject(new Error('Please enter a valid email address.')),
      onSubscribed,
    })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Get Access' }))
    await waitFor(() => expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument())
    expect(screen.queryByText(/You're on the list/)).not.toBeInTheDocument()
    expect(onSubscribed).not.toHaveBeenCalled()
  })

  it('lets a subscriber start tracking as a guest after joining', async () => {
    const onContinueAsGuest = vi.fn()
    await renderLandingPage({ onContinueAsGuest })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Get Access' }))
    await user.click(await screen.findByRole('button', { name: /Start tracking now/ }))
    expect(onContinueAsGuest).toHaveBeenCalledOnce()
  })

  it('calls onLogIn from the log-in link', async () => {
    const onLogIn = vi.fn()
    await renderLandingPage({ onLogIn })
    await userEvent.setup().click(screen.getByRole('button', { name: /Log in/ }))
    expect(onLogIn).toHaveBeenCalledOnce()
  })

  it('greets a signed-in user by name instead of showing the email form or log-in link', async () => {
    const onContinueAsGuest = vi.fn()
    await renderLandingPage({ signedInName: 'Ada', onContinueAsGuest })
    expect(screen.getByText('Welcome, Ada!')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Log in/ })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /Continue to your board/ }))
    expect(onContinueAsGuest).toHaveBeenCalledOnce()
  })
})
