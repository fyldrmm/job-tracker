import { describe, expect, it } from 'vitest'
import { currencyForCountry, EUR_COUNTRIES } from './euroCurrencyCountries'

describe('currencyForCountry', () => {
  it('is exactly 32 countries -- EEA (30) + UK + Switzerland', () => {
    expect(EUR_COUNTRIES.size).toBe(32)
  })

  it('shows EUR for an EU-27 country', () => {
    expect(currencyForCountry('DE')).toBe('eur')
  })

  it('shows EUR for an EEA non-EU country', () => {
    expect(currencyForCountry('NO')).toBe('eur')
  })

  it('shows EUR for the UK and Switzerland (display-only additions, not in the EEA)', () => {
    expect(currencyForCountry('GB')).toBe('eur')
    expect(currencyForCountry('CH')).toBe('eur')
  })

  it('shows USD for a non-European country', () => {
    expect(currencyForCountry('US')).toBe('usd')
  })

  it('falls back to USD when the country cannot be resolved', () => {
    expect(currencyForCountry(null)).toBe('usd')
    expect(currencyForCountry(undefined)).toBe('usd')
    expect(currencyForCountry('')).toBe('usd')
  })
})
