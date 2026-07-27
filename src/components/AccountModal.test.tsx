import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SubscriptionSummary } from '../lib/entitlements'

afterEach(() => {
  cleanup()
  vi.resetModules()
})

const FREE: SubscriptionSummary = {
  isPro: false,
  isCompAccount: false,
  plan: 'none',
  currency: 'none',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
}

async function renderAccountModal(
  subscription: SubscriptionSummary,
  overrides: { onOpenPricing?: () => void; createPortalSession?: () => Promise<string> } = {},
) {
  vi.doMock('../lib/billing', () => ({
    createPortalSession: overrides.createPortalSession ?? vi.fn().mockResolvedValue('https://billing.stripe.com/session/abc'),
  }))
  const { AccountModal } = await import('./AccountModal')
  render(
    <AccountModal
      name="Ada"
      email="ada@example.com"
      subscription={subscription}
      onUpdateName={vi.fn()}
      onChangePassword={vi.fn()}
      onExport={vi.fn()}
      onOpenDeleteAccount={vi.fn()}
      onOpenPricing={overrides.onOpenPricing ?? vi.fn()}
      onSignOut={vi.fn()}
      onClose={vi.fn()}
    />,
  )
}

describe('AccountModal plan display', () => {
  it('shows Free plus an upgrade link for a free user', async () => {
    const onOpenPricing = vi.fn()
    await renderAccountModal(FREE, { onOpenPricing })
    expect(screen.getByText('Free')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Upgrade to Pro' }))
    expect(onOpenPricing).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Manage billing' })).not.toBeInTheDocument()
  })

  it('shows the plan, renewal date, and a Manage billing link for a Pro subscriber', async () => {
    const future = '2026-09-15T12:00:00.000Z'
    await renderAccountModal({
      isPro: true,
      isCompAccount: false,
      plan: 'quarterly',
      currency: 'eur',
      currentPeriodEnd: future,
      cancelAtPeriodEnd: false,
    })
    expect(screen.getByText(/Pro quarterly/)).toBeInTheDocument()
    expect(screen.getByText(/renews Sep 15, 2026/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage billing' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upgrade to Pro' })).not.toBeInTheDocument()
  })

  it('shows "cancels" instead of "renews" for a subscription canceling at period end', async () => {
    const future = '2026-08-27T13:49:00.000Z'
    await renderAccountModal({
      isPro: true,
      isCompAccount: false,
      plan: 'monthly',
      currency: 'usd',
      currentPeriodEnd: future,
      cancelAtPeriodEnd: true,
    })
    expect(screen.getByText(/cancels Aug 27, 2026/)).toBeInTheDocument()
    expect(screen.queryByText(/renews/)).not.toBeInTheDocument()
  })

  it('shows "Unlimited (team account)" for a comp account, with no billing link at all', async () => {
    await renderAccountModal({
      isPro: true,
      isCompAccount: true,
      plan: 'none',
      currency: 'none',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    })
    expect(screen.getByText('Unlimited (team account)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Manage billing' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upgrade to Pro' })).not.toBeInTheDocument()
  })

  it('redirects to the returned Stripe Portal URL when Manage billing succeeds', async () => {
    const location = { href: '' }
    vi.stubGlobal('location', location)

    await renderAccountModal(
      {
        isPro: true,
        isCompAccount: false,
        plan: 'monthly',
        currency: 'usd',
        currentPeriodEnd: '2026-08-01T00:00:00.000Z',
        cancelAtPeriodEnd: false,
      },
      { createPortalSession: () => Promise.resolve('https://billing.stripe.com/session/xyz') },
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Manage billing' }))
    await waitFor(() => expect(location.href).toBe('https://billing.stripe.com/session/xyz'))

    vi.unstubAllGlobals()
  })

  it('shows an error and stays put if opening the billing portal fails', async () => {
    await renderAccountModal(
      {
        isPro: true,
        isCompAccount: false,
        plan: 'monthly',
        currency: 'usd',
        currentPeriodEnd: '2026-08-01T00:00:00.000Z',
        cancelAtPeriodEnd: false,
      },
      { createPortalSession: () => Promise.reject(new Error('No billing account on file')) },
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Manage billing' }))
    await waitFor(() => expect(screen.getByText('No billing account on file')).toBeInTheDocument())
  })
})
