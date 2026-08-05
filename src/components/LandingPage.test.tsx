import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LandingPage } from './LandingPage'

afterEach(() => {
  cleanup()
})

function renderLandingPage(
  overrides: {
    onContinueAsGuest?: () => void
    onSignUp?: () => void
    onLogIn?: () => void
    onGoogleSignIn?: () => Promise<void>
    onDismiss?: () => void
    signedInName?: string
  } = {},
) {
  render(
    <LandingPage
      onContinueAsGuest={overrides.onContinueAsGuest ?? vi.fn()}
      onSignUp={overrides.onSignUp ?? vi.fn()}
      onLogIn={overrides.onLogIn ?? vi.fn()}
      onGoogleSignIn={overrides.onGoogleSignIn ?? vi.fn().mockResolvedValue(undefined)}
      onDismiss={overrides.onDismiss}
      signedInName={overrides.signedInName}
    />,
  )
}

describe('LandingPage', () => {
  it('renders all four entry points with no separate close control', () => {
    renderLandingPage()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue as guest/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  it('shows a close button when onDismiss is provided (the voluntary reopen)', async () => {
    const onDismiss = vi.fn()
    renderLandingPage({ onDismiss })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('calls onSignUp from the sign-up button', async () => {
    const onSignUp = vi.fn()
    renderLandingPage({ onSignUp })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign up' }))
    expect(onSignUp).toHaveBeenCalledOnce()
  })

  it('calls onLogIn from the log-in button', async () => {
    const onLogIn = vi.fn()
    renderLandingPage({ onLogIn })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Log in' }))
    expect(onLogIn).toHaveBeenCalledOnce()
  })

  it('calls onContinueAsGuest from the guest button', async () => {
    const onContinueAsGuest = vi.fn()
    renderLandingPage({ onContinueAsGuest })
    await userEvent.setup().click(screen.getByRole('button', { name: /Continue as guest/ }))
    expect(onContinueAsGuest).toHaveBeenCalledOnce()
  })

  it('calls onGoogleSignIn from the Google button', async () => {
    const onGoogleSignIn = vi.fn().mockResolvedValue(undefined)
    renderLandingPage({ onGoogleSignIn })
    await userEvent.setup().click(screen.getByRole('button', { name: /Continue with Google/ }))
    await waitFor(() => expect(onGoogleSignIn).toHaveBeenCalledOnce())
  })

  it('surfaces an error if onGoogleSignIn rejects before the redirect', async () => {
    const onGoogleSignIn = vi.fn().mockRejectedValue(new Error('Google sign-in is not configured.'))
    renderLandingPage({ onGoogleSignIn })
    await userEvent.setup().click(screen.getByRole('button', { name: /Continue with Google/ }))
    await waitFor(() => expect(screen.getByText('Google sign-in is not configured.')).toBeInTheDocument())
  })

  it('greets a signed-in user by name instead of showing the entry-point buttons', async () => {
    const onContinueAsGuest = vi.fn()
    renderLandingPage({ signedInName: 'Ada', onContinueAsGuest })
    expect(screen.getByText('Welcome, Ada!')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign up' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /Continue to your board/ }))
    expect(onContinueAsGuest).toHaveBeenCalledOnce()
  })
})
