import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useStaleReminders } from './useStaleReminders'
import { getNotifiedMap } from '../lib/reminders'
import type { Application } from '../types/application'

function makeApplication(overrides: Partial<Application> = {}): Application {
  const staleDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  return {
    id: crypto.randomUUID(),
    user_id: null,
    tracker_id: 'tracker-1',
    company: 'Acme',
    role_title: 'Engineer',
    job_link: null,
    date_applied: '2026-01-01',
    current_stage: 'applied',
    salary_range: null,
    location: null,
    employment_type: null,
    work_mode: null,
    notes: null,
    is_priority: false,
    is_archived: false,
    archive_reason: null,
    archived_at: null,
    created_at: staleDate,
    updated_at: staleDate,
    ...overrides,
  }
}

class MockNotification {
  static permission: NotificationPermission = 'granted'
  onclick: (() => void) | null = null
  constructor(
    public title: string,
    public options?: NotificationOptions,
  ) {}
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('Notification', MockNotification)
})

describe('useStaleReminders', () => {
  it('notifies once for a newly-stale application and records it', () => {
    const app = makeApplication()
    const spy = vi.spyOn(globalThis, 'Notification' as never)
    renderHook(() => useStaleReminders([app], true))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(getNotifiedMap()[app.id]).toBe(app.updated_at)
  })

  it('does not re-notify the same application on a second run with unchanged updated_at', () => {
    const app = makeApplication()
    renderHook(() => useStaleReminders([app], true))
    const spy = vi.spyOn(globalThis, 'Notification' as never)
    renderHook(() => useStaleReminders([app], true))
    expect(spy).not.toHaveBeenCalled()
  })

  it('notifies again once updated_at changes (app became active, then stale again)', () => {
    const app = makeApplication()
    renderHook(() => useStaleReminders([app], true))
    const changed = { ...app, updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() }
    const spy = vi.spyOn(globalThis, 'Notification' as never)
    renderHook(() => useStaleReminders([changed], true))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not notify for applications that are not yet stale', () => {
    const app = makeApplication({ updated_at: new Date().toISOString() })
    const spy = vi.spyOn(globalThis, 'Notification' as never)
    renderHook(() => useStaleReminders([app], true))
    expect(spy).not.toHaveBeenCalled()
  })

  it('does not notify for archived applications', () => {
    const app = makeApplication({ is_archived: true })
    const spy = vi.spyOn(globalThis, 'Notification' as never)
    renderHook(() => useStaleReminders([app], true))
    expect(spy).not.toHaveBeenCalled()
  })

  it('does nothing when disabled', () => {
    const app = makeApplication()
    const spy = vi.spyOn(globalThis, 'Notification' as never)
    renderHook(() => useStaleReminders([app], false))
    expect(spy).not.toHaveBeenCalled()
  })

  it('sends one batched notification for multiple newly-stale applications', () => {
    const apps = [makeApplication(), makeApplication()]
    const spy = vi.spyOn(globalThis, 'Notification' as never)
    renderHook(() => useStaleReminders(apps, true))
    expect(spy).toHaveBeenCalledTimes(1)
    expect((spy.mock.calls[0]?.[1] as NotificationOptions)?.body).toContain('2 applications')
  })
})
