import { afterEach, describe, expect, it } from 'vitest'
import {
  EXTENSION_MESSAGE_SOURCE,
  MAX_EXTRACTION_TEXT_CHARS,
  parseExtensionMessage,
  storePendingExtraction,
  consumePendingExtraction,
} from './extensionHandoff'

describe('parseExtensionMessage', () => {
  it('accepts a well-formed extract message', () => {
    const result = parseExtensionMessage({
      source: EXTENSION_MESSAGE_SOURCE,
      type: 'extract',
      text: 'Senior Engineer at Acme',
      sourceUrl: 'https://jobs.example.com/123',
    })
    expect(result).toEqual({ text: 'Senior Engineer at Acme', sourceUrl: 'https://jobs.example.com/123' })
  })

  it('defaults sourceUrl to null when absent', () => {
    const result = parseExtensionMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'extract', text: 'hi' })
    expect(result).toEqual({ text: 'hi', sourceUrl: null })
  })

  it('rejects messages from a different source', () => {
    expect(
      parseExtensionMessage({ source: 'something-else', type: 'extract', text: 'hi' }),
    ).toBeNull()
  })

  it('rejects a different message type from the same source', () => {
    expect(
      parseExtensionMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'ping', text: 'hi' }),
    ).toBeNull()
  })

  it('rejects empty or whitespace-only text', () => {
    expect(parseExtensionMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'extract', text: '   ' })).toBeNull()
    expect(parseExtensionMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'extract', text: '' })).toBeNull()
  })

  it('rejects non-string text', () => {
    expect(
      parseExtensionMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'extract', text: 12345 }),
    ).toBeNull()
  })

  it('rejects null, arrays, and primitives outright', () => {
    expect(parseExtensionMessage(null)).toBeNull()
    expect(parseExtensionMessage('a string')).toBeNull()
    expect(parseExtensionMessage(42)).toBeNull()
    expect(parseExtensionMessage(['array'])).toBeNull()
  })

  it('caps text at MAX_EXTRACTION_TEXT_CHARS -- defense in depth against a pathological page, mirrors the Edge Function limit', () => {
    const longText = 'a'.repeat(MAX_EXTRACTION_TEXT_CHARS + 500)
    const result = parseExtensionMessage({ source: EXTENSION_MESSAGE_SOURCE, type: 'extract', text: longText })
    expect(result?.text.length).toBe(MAX_EXTRACTION_TEXT_CHARS)
  })
})

describe('pending extraction hold-and-resume (sessionStorage)', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('round-trips a stored payload', () => {
    storePendingExtraction({ text: 'Role at Acme', sourceUrl: 'https://example.com/job' })
    expect(consumePendingExtraction()).toEqual({ text: 'Role at Acme', sourceUrl: 'https://example.com/job' })
  })

  it('clears after being read -- a one-shot, not a persistent flag', () => {
    storePendingExtraction({ text: 'Role at Acme', sourceUrl: null })
    consumePendingExtraction()
    expect(consumePendingExtraction()).toBeNull()
  })

  it('returns null when nothing was ever stored', () => {
    expect(consumePendingExtraction()).toBeNull()
  })

  it('returns null and does not throw on corrupted storage content', () => {
    sessionStorage.setItem('job-tracker:pending-extraction', 'not json{{{')
    expect(consumePendingExtraction()).toBeNull()
  })
})
