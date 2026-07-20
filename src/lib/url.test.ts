import { describe, expect, it } from 'vitest'
import { isSafeHttpUrl } from './url'

describe('isSafeHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isSafeHttpUrl('http://example.com')).toBe(true)
    expect(isSafeHttpUrl('https://example.com/jobs/123?ref=x')).toBe(true)
  })

  it('rejects javascript: and other non-http schemes', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isSafeHttpUrl('mailto:someone@example.com')).toBe(false)
    expect(isSafeHttpUrl('ftp://example.com')).toBe(false)
  })

  it('rejects non-URL / relative / empty values', () => {
    expect(isSafeHttpUrl('')).toBe(false)
    expect(isSafeHttpUrl('not a url')).toBe(false)
    expect(isSafeHttpUrl('/jobs/123')).toBe(false)
    expect(isSafeHttpUrl('example.com')).toBe(false)
  })
})
