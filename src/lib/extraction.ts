// Client-side mirror of the extract-job-details Edge Function's per-user
// monthly caps, used only to DISPLAY remaining extractions. The server is
// authoritative -- it enforces these same limits (tier-aware, looked up
// from `subscriptions`) before calling Anthropic; these constants just
// drive the "N of 5/500 left this month" hint. If the server values
// change, update these too.
export const PER_USER_MONTHLY_LIMIT = 5
export const PRO_MONTHLY_LIMIT = 500

// Start of the current calendar month in UTC, matching the Edge Function's
// startOfCurrentMonthUtc() so the client's count lines up with the server's.
export function startOfCurrentMonthUtc(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}
