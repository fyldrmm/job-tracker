// One comparator for every list that comes back from a store, so guest
// (IndexedDB), signed-in (Supabase), and the offline-read fallback all agree
// on order. Supabase returns rows in an unspecified order unless asked, and
// IndexedDB returns them in key order -- without this, card and tab order
// shifted between reloads and `trackers[0]` (the default active tracker in
// Board.tsx) was arbitrary. See AUDIT.md M3.
//
// Parameterised by field name because stage_history timestamps its rows with
// `entered_at`, not `created_at` (see 0001_init.sql).
export function byTimestamp<K extends string>(key: K) {
  return (a: Record<K, string>, b: Record<K, string>): number =>
    a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0
}

export const byCreatedAt = byTimestamp('created_at')

// Trackers order themselves by drag-and-drop (TrackerTabs.tsx) once the user
// sets one, but rows created before sort_order existed -- or never
// reordered -- have it undefined. Those fall back to created_at so tab order
// stays stable instead of going arbitrary.
export function byTrackerOrder(a: { sort_order?: number; created_at: string }, b: { sort_order?: number; created_at: string }): number {
  const ao = a.sort_order
  const bo = b.sort_order
  if (ao !== undefined && bo !== undefined && ao !== bo) return ao - bo
  if (ao !== undefined && bo === undefined) return -1
  if (ao === undefined && bo !== undefined) return 1
  return byCreatedAt(a, b)
}
