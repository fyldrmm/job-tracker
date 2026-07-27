import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InsightsView } from './InsightsView'
import type { Application, Tracker } from '../types/application'

afterEach(() => {
  cleanup()
})

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'app-1',
    user_id: null,
    tracker_id: 't1',
    company: 'Acme',
    role_title: 'Engineer',
    job_link: null,
    date_applied: '2026-01-01',
    current_stage: 'interview',
    salary_range: null,
    location: null,
    employment_type: null,
    work_mode: null,
    notes: null,
    is_priority: false,
    is_archived: false,
    archive_reason: null,
    archived_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeTracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 't1',
    user_id: null,
    name: 'My Applications',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderInsightsView(overrides: { isPro?: boolean; onUpgradeRequest?: () => void } = {}) {
  render(
    <InsightsView
      applications={[makeApplication()]}
      interviews={[]}
      stageHistory={[]}
      trackers={[makeTracker()]}
      isPro={overrides.isPro ?? true}
      onUpgradeRequest={overrides.onUpgradeRequest ?? vi.fn()}
    />,
  )
}

describe('InsightsView CSV export gate', () => {
  it('shows the plain label for a Pro user', () => {
    renderInsightsView({ isPro: true })
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument()
  })

  it('routes a free user to the upgrade flow instead of exporting', async () => {
    const user = userEvent.setup()
    const onUpgradeRequest = vi.fn()
    renderInsightsView({ isPro: false, onUpgradeRequest })
    const button = screen.getByRole('button', { name: 'Export CSV (Pro)' })
    await user.click(button)
    expect(onUpgradeRequest).toHaveBeenCalledOnce()
  })

  it('does not disable the export button for a free user just because they are free', () => {
    renderInsightsView({ isPro: false })
    expect(screen.getByRole('button', { name: 'Export CSV (Pro)' })).toBeEnabled()
  })
})
