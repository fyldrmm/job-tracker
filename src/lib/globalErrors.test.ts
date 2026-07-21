import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GLOBAL_ERROR_MESSAGE,
  installGlobalErrorHandlers,
  resetGlobalErrorsForTest,
  subscribeToGlobalErrors,
} from './globalErrors'

// jsdom doesn't dispatch real 'error'/'unhandledrejection' events from
// actual uncaught throws/rejections, so these tests dispatch the events
// manually. A genuine `ErrorEvent` is used rather than a plain `Event`
// with error/message bolted on via Object.assign -- jsdom special-cases
// a dispatched 'error' event that merely *looks* like an ErrorEvent
// (duck-typed) and never invokes addEventListener('error', ...)
// listeners for it at all, so a real ErrorEvent instance is required for
// this to exercise the code under test.
function dispatchError(overrides: Partial<Pick<ErrorEvent, 'error' | 'message'>> = {}) {
  const event = new ErrorEvent('error', {
    error: new Error('boom'),
    message: 'boom',
    cancelable: true,
    ...overrides,
  })
  // Unlike real browsers (whose default action for an unhandled 'error'
  // event is just "log to console"), jsdom surfaces one with no
  // preventDefault() as an actual uncaught exception in the test
  // process. Suppress that default action -- our own handler doesn't
  // check defaultPrevented, so this doesn't affect what's under test.
  const suppressDefault = (e: Event) => e.preventDefault()
  window.addEventListener('error', suppressDefault)
  try {
    window.dispatchEvent(event)
  } finally {
    window.removeEventListener('error', suppressDefault)
  }
}

function dispatchRejection(reason: unknown) {
  const event = Object.assign(new Event('unhandledrejection'), { reason })
  window.dispatchEvent(event as unknown as PromiseRejectionEvent)
}

describe('globalErrors', () => {
  let uninstall: () => void

  beforeEach(() => {
    resetGlobalErrorsForTest()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers()
    uninstall = installGlobalErrorHandlers()
  })

  afterEach(() => {
    uninstall()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('notifies a subscriber on an uncaught error', () => {
    const listener = vi.fn()
    subscribeToGlobalErrors(listener)
    dispatchError()
    expect(listener).toHaveBeenCalledWith(GLOBAL_ERROR_MESSAGE)
  })

  it('notifies a subscriber on an unhandled promise rejection', () => {
    const listener = vi.fn()
    subscribeToGlobalErrors(listener)
    dispatchRejection(new Error('rejected'))
    expect(listener).toHaveBeenCalledWith(GLOBAL_ERROR_MESSAGE)
  })

  it('throttles a burst to a single notification, then allows another after the window', () => {
    const listener = vi.fn()
    subscribeToGlobalErrors(listener)
    dispatchError()
    dispatchError()
    dispatchError()
    expect(listener).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(10001)
    dispatchError()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('caps notifications per page load', () => {
    const listener = vi.fn()
    subscribeToGlobalErrors(listener)
    for (let i = 0; i < 5; i++) {
      dispatchError()
      vi.advanceTimersByTime(10001)
    }
    // MAX_NOTICES_PER_PAGE = 3
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('ignores ResizeObserver loop errors', () => {
    const listener = vi.fn()
    subscribeToGlobalErrors(listener)
    dispatchError({ message: 'ResizeObserver loop completed with undelivered notifications.' })
    expect(listener).not.toHaveBeenCalled()
  })

  it('ignores opaque cross-origin "Script error." with no error object', () => {
    const listener = vi.fn()
    subscribeToGlobalErrors(listener)
    dispatchError({ message: 'Script error.', error: undefined })
    expect(listener).not.toHaveBeenCalled()
  })

  it('ignores AbortError rejections', () => {
    const listener = vi.fn()
    subscribeToGlobalErrors(listener)
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    dispatchRejection(abortError)
    expect(listener).not.toHaveBeenCalled()
  })

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToGlobalErrors(listener)
    unsubscribe()
    dispatchError()
    expect(listener).not.toHaveBeenCalled()
  })

  it('stops dispatching entirely after uninstall', () => {
    const listener = vi.fn()
    subscribeToGlobalErrors(listener)
    uninstall()
    dispatchError()
    expect(listener).not.toHaveBeenCalled()
    // re-install a no-op so afterEach's uninstall() call is harmless
    uninstall = () => {}
  })

  it('buffers a report with no subscriber and delivers it once on the first subscribe', () => {
    dispatchError()
    const listener = vi.fn()
    subscribeToGlobalErrors(listener)
    expect(listener).toHaveBeenCalledTimes(1)

    const secondListener = vi.fn()
    subscribeToGlobalErrors(secondListener)
    expect(secondListener).not.toHaveBeenCalled()
  })
})
