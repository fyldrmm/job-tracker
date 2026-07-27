// Which visitor countries see EUR pricing (monetization-mvp-brief.md §4).
// Decided 2026-07-26: EEA (30) + United Kingdom + Switzerland = 32. UK and CH
// are display-only additions -- neither is in the EEA, so their cards still
// get Stripe's non-EEA processing rate regardless of which currency is
// shown; only the 30 EEA countries get EUR display AND the cheaper rate
// together. Everything else, including an unresolvable country, falls back
// to USD.
export const EUR_COUNTRIES = new Set([
  // EU-27
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE',
  // EEA non-EU
  'IS', 'LI', 'NO',
  // Display-only additions, not in the EEA
  'GB', 'CH',
])

export function currencyForCountry(countryCode: string | null | undefined): 'eur' | 'usd' {
  if (countryCode && EUR_COUNTRIES.has(countryCode)) return 'eur'
  return 'usd'
}
