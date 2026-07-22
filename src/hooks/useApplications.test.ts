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
