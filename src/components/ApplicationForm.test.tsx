import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

afterEach(() => {
  cleanup()
  vi.resetModules()
})

// getExtractionUsageThisMonth is mocked per-test via vi.doMock so each test
// can control how many extractions are already "used" this month --
// PER_USER_MONTHLY_LIMIT/PRO_MONTHLY_LIMIT are real, unmocked constants.
async function renderFormWithUsage(used: number, overrides: { isPro?: boolean; onUpgradeRequest?: () => void } = {}) {
  vi.doMock('../lib/remoteStore', () => ({
    getExtractionUsageThisMonth: () => Promise.resolve(used),
    extractJobDetails: vi.fn(),
  }))
  const { ApplicationForm: FreshApplicationForm } = await import('./ApplicationForm')
  render(
    <FreshApplicationForm
      initial={null}
      defaultStage="applied"
      userId="user-1"
      isPro={overrides.isPro ?? false}
      onUpgradeRequest={overrides.onUpgradeRequest ?? vi.fn()}
      onSubmit={vi.fn()}
      onRequestSignUp={vi.fn()}
      onClose={vi.fn()}
    />,
  )
}

describe('ApplicationForm extraction-cap display', () => {
  it('shows the free-tier limit (5) for a non-Pro user', async () => {
    await renderFormWithUsage(2, { isPro: false })
    await waitFor(() => expect(screen.getByText(/of 5 free AI extractions left this month/)).toBeInTheDocument())
  })

  it('shows the Pro limit (500) for a Pro user, without "free" wording', async () => {
    await renderFormWithUsage(50, { isPro: true })
    await waitFor(() => expect(screen.getByText(/450 of 500 AI extractions left this month/)).toBeInTheDocument())
    expect(screen.queryByText(/free/)).not.toBeInTheDocument()
  })

  it('disables the Extract button and offers an upgrade CTA when a free user hits zero', async () => {
    const onUpgradeRequest = vi.fn()
    await renderFormWithUsage(5, { isPro: false, onUpgradeRequest })
    await waitFor(() => expect(screen.getByText(/used all your free AI extractions/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Extract with AI' })).toBeDisabled()

    const upgradeButton = screen.getByRole('button', { name: 'Upgrade to Pro' })
    await userEvent.setup().click(upgradeButton)
    expect(onUpgradeRequest).toHaveBeenCalledOnce()
  })

  it('disables the Extract button at zero for a Pro user too, with no upgrade CTA', async () => {
    await renderFormWithUsage(500, { isPro: true })
    await waitFor(() => expect(screen.getByText(/used all your Pro AI extractions/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Extract with AI' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Upgrade to Pro' })).not.toBeInTheDocument()
  })
})
