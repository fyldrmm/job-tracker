import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useApplications } from './useApplications'
import { getAllStageHistory } from '../lib/localStore'
import { resetIndexedDb } from '../test/dbHelpers'
import type { ApplicationInput } from './useApplications'

afterEach(async () => {
  await resetIndexedDb()
})

const input: ApplicationInput = {
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
}

describe('useApplications.createApplication (guest)', () => {
  it('records an initial stage_history row for the stage the card was created into', async () => {
    const { result } = renderHook(() => useApplications(null))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createApplication(input, 'tracker-1')
    })

    const created = result.current.applications
    expect(created).toHaveLength(1)

    const history = await getAllStageHistory()
    const forApp = history.filter((h) => h.application_id === created[0].id)
    expect(forApp).toHaveLength(1)
    expect(forApp[0].stage).toBe('interview')
    // entered_at matches the application's created_at, so "days to reach this
    // stage" computes as zero for a card that started here.
    expect(forApp[0].entered_at).toBe(created[0].created_at)
  })
})

describe('useApplications.togglePriority', () => {
  it('flips the current value when no explicit value is given', async () => {
    const { result } = renderHook(() => useApplications(null))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.createApplication(input, 'tracker-1')
    })
    const id = result.current.applications[0].id

    await act(async () => {
      await result.current.togglePriority(id)
    })
    expect(result.current.applications[0].is_priority).toBe(true)

    await act(async () => {
      await result.current.togglePriority(id)
    })
    expect(result.current.applications[0].is_priority).toBe(false)
  })

  it('sets an explicit value regardless of the current one, for bulk actions', async () => {
    const { result } = renderHook(() => useApplications(null))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.createApplication(input, 'tracker-1')
    })
    const id = result.current.applications[0].id

    await act(async () => {
      await result.current.togglePriority(id, true)
    })
    expect(result.current.applications[0].is_priority).toBe(true)

    // Setting the same explicit value again is a no-op, not a second flip.
    await act(async () => {
      await result.current.togglePriority(id, true)
    })
    expect(result.current.applications[0].is_priority).toBe(true)

    await act(async () => {
      await result.current.togglePriority(id, false)
    })
    expect(result.current.applications[0].is_priority).toBe(false)
  })
})
