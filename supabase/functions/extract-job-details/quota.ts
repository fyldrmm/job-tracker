// Pure quota-comparison logic, pulled out of index.ts so it's testable
// without spinning up Deno or mocking the Supabase admin client -- the
// index.ts request handler still owns fetching the actual counts and
// turning the result into an HTTP response.

export interface QuotaLimits {
  perUserMonthlyLimit: number
  globalMonthlyLimit: number
}

export type QuotaCheckResult =
  | { allowed: true }
  | { allowed: false; reason: 'per-user' | 'global' }

export function checkQuota(userCount: number, globalCount: number, limits: QuotaLimits): QuotaCheckResult {
  if (userCount >= limits.perUserMonthlyLimit) return { allowed: false, reason: 'per-user' }
  if (globalCount >= limits.globalMonthlyLimit) return { allowed: false, reason: 'global' }
  return { allowed: true }
}
