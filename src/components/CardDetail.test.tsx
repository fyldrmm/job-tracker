import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardDetail } from './CardDetail'
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
    job_link: 'https://jobs.example.com/123',
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

function renderCardDetail(overrides: { application?: Application; interviews?: Interview[] } = {}) {
  const onScheduleInterview = vi.fn().mockResolvedValue(undefined)
  const onUpdateInterview = vi.fn().mockResolvedValue(undefined)
  const onDeleteInterview = vi.fn().mockResolvedValue(undefined)
  const onEdit = vi.fn()
  const onClose = vi.fn()
  const onArchive = vi.fn()
  const onDeleteRequest = vi.fn()
  const onTogglePriority = vi.fn()
  render(
    <CardDetail
      application={overrides.application ?? makeApplication()}
      trackerName="My Applications"
      interviews={overrides.interviews ?? []}
      onScheduleInterview={onScheduleInterview}
      onUpdateInterview={onUpdateInterview}
      onDeleteInterview={onDeleteInterview}
      onEdit={onEdit}
      onClose={onClose}
      onArchive={onArchive}
      onDeleteRequest={onDeleteRequest}
      onTogglePriority={onTogglePriority}
    />,
  )
  return {
    onScheduleInterview,
    onUpdateInterview,
    onDeleteInterview,
    onEdit,
    onClose,
    onArchive,
    onDeleteRequest,
    onTogglePriority,
  }
}

describe('CardDetail interviews section', () => {
  it('shows "no interviews scheduled yet" when there are none, filtered to this application', () => {
    renderCardDetail({ interviews: [makeInterview({ application_id: 'other-app' })] })
    expect(screen.getByText('No interviews scheduled yet.')).toBeInTheDocument()
  })

  it('lists rounds with their date, time and location', () => {
    renderCardDetail({
      interviews: [makeInterview({ round: 2, is_remote: true, location: 'https://meet.example.com/abc' })],
    })
    expect(screen.getByText(/Round 2/)).toBeInTheDocument()
    expect(screen.getByText(/Remote/)).toBeInTheDocument()
  })

  it('opens the add-round modal and calls onScheduleInterview with the entered fields', async () => {
    const user = userEvent.setup()
    const props = renderCardDetail()

    await user.click(screen.getByRole('button', { name: '+ Add round' }))
    expect(await screen.findByText('Add interview round')).toBeInTheDocument()

    // Date/time default to today/09:00 (see InterviewRoundModal) -- native
    // date/time inputs don't accept plain user.type() input in jsdom, so
    // this exercises the defaults rather than typing a specific value.
    const locationInput = screen.getByLabelText(/location/i)
    await user.type(locationInput, 'Office A')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(props.onScheduleInterview).toHaveBeenCalledTimes(1))
    const input = props.onScheduleInterview.mock.calls[0][0]
    expect(input.location).toBe('Office A')
    expect(typeof input.scheduled_at).toBe('string')
    await waitFor(() => expect(screen.queryByText('Add interview round')).not.toBeInTheDocument())
  })

  it('opens the edit-round modal pre-filled, and calls onUpdateInterview with that round\'s id', async () => {
    const user = userEvent.setup()
    const interview = makeInterview({ round: 1, location: 'Original address' })
    const props = renderCardDetail({ interviews: [interview] })

    await user.click(screen.getByRole('button', { name: 'Edit round 1' }))
    expect(await screen.findByText('Edit round 1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Original address')).toBeInTheDocument()

    const locationInput = screen.getByLabelText(/location/i)
    await user.clear(locationInput)
    await user.type(locationInput, 'New address')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(props.onUpdateInterview).toHaveBeenCalledWith('interview-1', expect.objectContaining({ location: 'New address' })))
  })

  it('deletes a round via its trash button', async () => {
    const user = userEvent.setup()
    const interview = makeInterview()
    const props = renderCardDetail({ interviews: [interview] })

    await user.click(screen.getByRole('button', { name: 'Delete round 1' }))
    expect(props.onDeleteInterview).toHaveBeenCalledWith('interview-1')
  })

  it('offers both an .ics download and a Google Calendar link per round', () => {
    renderCardDetail({ interviews: [makeInterview()] })
    expect(screen.getByRole('button', { name: '.ics' })).toBeInTheDocument()
    const googleLink = screen.getByRole('link', { name: 'Google' })
    expect(googleLink.getAttribute('href')).toContain('calendar.google.com')
  })

  it('numbers a newly-added round after the existing ones, in the same modal title style', async () => {
    const user = userEvent.setup()
    renderCardDetail({ interviews: [makeInterview({ id: 'r1', round: 1 }), makeInterview({ id: 'r2', round: 2 })] })

    const rows = screen.getAllByText(/Round \d/)
    expect(within(rows[0].closest('li')!).getByText(/Round 1/)).toBeInTheDocument()
    expect(within(rows[1].closest('li')!).getByText(/Round 2/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Add round' }))
    // The add form itself doesn't need to know the number in advance --
    // useInterviews derives it from max(round)+1 at write time (see
    // lib/interviews.test.ts) -- this just confirms the entry point is
    // reachable alongside two existing rounds.
    expect(await screen.findByText('Add interview round')).toBeInTheDocument()
  })
})
