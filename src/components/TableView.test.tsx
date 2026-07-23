import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { TableView } from './TableView'
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

function makeInterview(overrides: Partial<Interview> & { id: string }): Interview {
  return {
    application_id: 'app-1',
    round: 1,
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

function renderTableView(applications: Application[], interviews: Interview[]) {
  render(
    <TableView
      applications={applications}
      interviews={interviews}
      trackerName="My Applications"
      onCardOpen={vi.fn()}
      onStageChange={vi.fn()}
      onTogglePriority={vi.fn()}
    />,
  )
}

describe('TableView interview columns', () => {
  it('shows a dash for both columns when there are no interviews', () => {
    renderTableView([makeApplication()], [])
    const row = screen.getByText('Acme').closest('tr')!
    const cells = within(row).getAllByRole('cell')
    // 0: star, 1: Company, 2: Role, 3: Stage, 4: Date applied,
    // 5: Next interview, 6: Rounds, 7: Salary, 8: Location, ...
    expect(cells[5]).toHaveTextContent('—')
    expect(cells[6]).toHaveTextContent('—')
  })

  it('shows the soonest upcoming interview date and the total round count', () => {
    const interviews = [
      makeInterview({ id: 'past', round: 1, scheduled_at: '2026-01-01T00:00:00.000Z' }),
      makeInterview({ id: 'future', round: 2, scheduled_at: '2099-06-15T14:00:00.000Z' }),
    ]
    renderTableView([makeApplication()], interviews)
    const row = screen.getByText('Acme').closest('tr')!
    const cells = within(row).getAllByRole('cell')
    expect(cells[5]).toHaveTextContent('Jun 15')
    expect(cells[6]).toHaveTextContent('2')
  })
})
