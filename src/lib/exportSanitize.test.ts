import { describe, expect, it } from 'vitest'
import { sanitizeExportField } from './exportSanitize'

describe('sanitizeExportField', () => {
  it.each(['=HYPERLINK("https://evil.example")', '+1+1', '-1-1', '@SUM(1,1)', '\ttab', '\rcr'])(
    'prefixes a leading apostrophe on %s',
    (value) => {
      expect(sanitizeExportField(value)).toBe(`'${value}`)
    },
  )

  it('leaves ordinary values untouched', () => {
    expect(sanitizeExportField('Acme Corp')).toBe('Acme Corp')
    expect(sanitizeExportField('')).toBe('')
  })
})
