import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useInterviews } from './useInterviews'
import { getAllInterviews, deleteApplication, putApplication } from '../lib/localStore'
import { resetIndexedDb } from '../test/dbHelpers'
import type { Application } from '../types/application'
import type { InterviewInput } from './useInterviews'

afterEach(async () => {
  await resetIndexedDb()
})

const input: InterviewInput = {
  scheduled_at: '2026-08-04T13:00:00.000Z',
  duration_minutes: 60,
  is_remote: true,
  location: 'https://meet.example.com/abc',
  notes: null,
}

function application(id: string): Application {
  const now = '2026-07-23T10:00:00.000Z'
  return {
    id,
    user_id: null,
    tracker_id: 'tracker-1',
    company: 'Acme',
    role_title: 'Engineer',
    job_link: null,
    date_applied: '2026-07-01',
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
    created_at: now,
    updated_at: now,
  }
}

async function renderReady() {
  const { result } = renderHook(() => useInterviews(null))
  await waitFor(() => expect(result.current.loading).toBe(false))
  return result
}

describe('useInterviews.scheduleInterview (guest)', () => {
  it('numbers rounds per application, starting at 1', async () => {
    const result = await renderReady()

    await act(async () => {
      await result.current.scheduleInterview('app-1', input)
    })
    await act(async () => {
      await result.current.scheduleInterview('app-1', { ...input, scheduled_at: '2026-08-11T13:00:00.000Z' })
    })
    // A different application starts its own numbering over at 1.
    await act(async () => {
      await result.current.scheduleInterview('app-2', input)
    })

    const rounds = result.current.interviews.map((i) => `${i.application_id}:${i.round}`)
    expect(rounds.sort()).toEqual(['app-1:1', 'app-1:2', 'app-2:1'])
  })

  it('persists to IndexedDB, not just to state', async () => {
    const result = await renderReady()
    await act(async () => {
      await result.current.scheduleInterview('app-1', input)
    })

    const stored = await getAllInterviews()
    expect(stored).toHaveLength(1)
    expect(stored[0].location).toBe('https://meet.example.com/abc')
    expect(stored[0].is_remote).toBe(true)
  })
})

describe('useInterviews.removeInterview', () => {
  it('leaves a gap in the round numbers rather than renumbering', async () => {
    const result = await renderReady()
    await act(async () => {
      await result.current.scheduleInterview('app-1', input)
      await result.current.scheduleInterview('app-1', input)
      await result.current.scheduleInterview('app-1', input)
    })
    const round2 = result.current.interviews.find((i) => i.round === 2)!

    await act(async () => {
      await result.current.removeInterview(round2.id)
    })
    expect(result.current.interviews.map((i) => i.round).sort()).toEqual([1, 3])

    // The next scheduled round continues past the gap -- reusing 3 would hit
    // the unique (application_id, round) index remotely.
    await act(async () => {
      await result.current.scheduleInterview('app-1', input)
    })
    expect(result.current.interviews.map((i) => i.round).sort()).toEqual([1, 3, 4])
  })
})

describe('local cascade', () => {
  it('deleting an application takes its interviews with it', async () => {
    await putApplication(application('app-1'))
    await putApplication(application('app-2'))
    const result = await renderReady()
    await act(async () => {
      await result.current.scheduleInterview('app-1', input)
      await result.current.scheduleInterview('app-2', input)
    })

    await deleteApplication('app-1')

    const remaining = await getAllInterviews()
    expect(remaining.map((i) => i.application_id)).toEqual(['app-2'])
  })
})
