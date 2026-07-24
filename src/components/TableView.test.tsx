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
      onBulkMove={vi.fn()}
      onBulkArchive={vi.fn()}
      onBulkSetPriority={vi.fn()}
      onDeleteRequest={vi.fn()}
    />,
  )
}

describe('TableView interview columns', () => {
  it('shows a dash for both columns when there are no interviews', () => {
    renderTableView([makeApplication()], [])
    const row = screen.getByText('Acme').closest('tr')!
    const cells = within(row).getAllByRole('cell')
    // 0: checkbox, 1: star, 2: Company, 3: Role, 4: Stage, 5: Date applied,
    // 6: Next interview, 7: Rounds, 8: Salary, 9: Location, ...
    expect(cells[6]).toHaveTextContent('—')
    expect(cells[7]).toHaveTextContent('—')
  })

  it('shows the soonest upcoming interview date and the total round count', () => {
    const interviews = [
      makeInterview({ id: 'past', round: 1, scheduled_at: '2026-01-01T00:00:00.000Z' }),
      makeInterview({ id: 'future', round: 2, scheduled_at: '2099-06-15T14:00:00.000Z' }),
    ]
    renderTableView([makeApplication()], interviews)
    const row = screen.getByText('Acme').closest('tr')!
    const cells = within(row).getAllByRole('cell')
    expect(cells[6]).toHaveTextContent('Jun 15')
    expect(cells[7]).toHaveTextContent('2')
  })
})
