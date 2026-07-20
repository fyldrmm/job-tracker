// Client-side mirror of the extract-job-details Edge Function's per-user
// monthly cap, used only to DISPLAY remaining extractions. The server is
// authoritative -- it enforces this same limit before calling Anthropic;
// this constant just drives the "N of 20 left this month" hint. If the
// server value changes, update this too.
export const PER_USER_MONTHLY_LIMIT = 20

// Start of the current calendar month in UTC, matching the Edge Function's
// startOfCurrentMonthUtc() so the client's count lines up with the server's.
export function startOfCurrentMonthUtc(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}
