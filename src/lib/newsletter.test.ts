import { describe, expect, it, vi } from 'vitest'

async function subscribeWith(invokeResult: { data?: unknown; error?: unknown }) {
  vi.resetModules()
  const invoke = vi.fn().mockResolvedValue(invokeResult)
  vi.doMock('./supabase', () => ({
    supabase: { functions: { invoke } },
  }))
  const { subscribeToNewsletter } = await import('./newsletter')
  return { subscribeToNewsletter, invoke }
}

describe('subscribeToNewsletter', () => {
  it('calls the newsletter-subscribe function with the given email', async () => {
    const { subscribeToNewsletter, invoke } = await subscribeWith({ data: { ok: true } })
    await subscribeToNewsletter('ada@example.com')
    expect(invoke).toHaveBeenCalledWith('newsletter-subscribe', { body: { email: 'ada@example.com' } })
  })

  it('resolves without throwing on success', async () => {
    const { subscribeToNewsletter } = await subscribeWith({ data: { ok: true } })
    await expect(subscribeToNewsletter('ada@example.com')).resolves.toBeUndefined()
  })

  it('throws the error message from the function body when the call itself errors', async () => {
    const { subscribeToNewsletter } = await subscribeWith({
      error: { message: 'Edge Function returned a non-2xx status code' },
    })
    await expect(subscribeToNewsletter('bad')).rejects.toThrow('Edge Function returned a non-2xx status code')
  })

  it('throws when the response body carries an error even without a transport-level error', async () => {
    const { subscribeToNewsletter } = await subscribeWith({ data: { error: 'Please enter a valid email address.' } })
    await expect(subscribeToNewsletter('bad')).rejects.toThrow('Please enter a valid email address.')
  })
})
