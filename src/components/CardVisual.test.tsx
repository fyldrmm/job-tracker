import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CardVisual } from './CardVisual'
import type { Application, Interview } from '../types/application'

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

function makeInterview(overrides: Partial<Interview> = {}): Interview {
  return {
    id: 'interview-1',
    application_id: 'app-1',
    round: 2,
    scheduled_at: '2026-08-04T13:00:00.000Z',
    duration_minutes: 60,
    is_remote: false,
    location: null,
    notes: null,
    created_at: '2026-07-23T10:00:00.000Z',
    updated_at: '2026-07-23T10:00:00.000Z',
    ...overrides,
  }
}

describe('CardVisual interview badge', () => {
  it('shows no badge when there is no upcoming interview', () => {
    render(<CardVisual application={makeApplication()} nextInterview={null} />)
    expect(screen.queryByText(/^R\d/)).not.toBeInTheDocument()
  })

  it('shows the round number and formatted date/time when one is scheduled', () => {
    render(<CardVisual application={makeApplication()} nextInterview={makeInterview({ round: 2 })} />)
    expect(screen.getByText('R2')).toBeInTheDocument()
    expect(screen.getByText(/Aug 4/)).toBeInTheDocument()
  })

  it('omits the badge entirely when nextInterview is not passed at all', () => {
    render(<CardVisual application={makeApplication()} />)
    expect(screen.queryByText(/^R\d/)).not.toBeInTheDocument()
  })
})
