import { useEffect } from 'react'
import type { Application } from '../types/application'
import { isStale, STALE_THRESHOLD_DAYS } from '../lib/stale'
import { getDismissedStaleMap, getNotifiedMap, setDismissedStaleMap, setNotifiedMap } from '../lib/reminders'

const POLL_INTERVAL_MS = 5 * 60 * 1000

// Fires a browser Notification for applications that have just crossed the
// stale threshold. Only runs while `enabled` (user opted in AND permission
// is already granted -- requesting permission itself happens elsewhere, from
// a real click, not from this effect). Each app is only notified once per
// updated_at value, so re-polling or reloading doesn't repeat it.
export function useStaleReminders(applications: Application[], enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    const check = () => {
      const notified = getNotifiedMap()
      const dismissed = getDismissedStaleMap()
      const due = applications.filter(
        (app) =>
          !app.is_archived &&
          isStale(app) &&
          notified[app.id] !== app.updated_at &&
          dismissed[app.id] !== app.updated_at,
      )
      const next = { ...notified }
      if (due.length > 0) {
        const notification =
          due.length === 1
            ? new Notification('Follow-up reminder', {
                body: `${due[0].company} — ${due[0].role_title} has had no activity in over ${STALE_THRESHOLD_DAYS} days.`,
                tag: `stale-${due[0].id}`,
              })
            : new Notification('Follow-up reminders', {
                body: `${due.length} applications have had no activity in over ${STALE_THRESHOLD_DAYS} days.`,
                tag: 'stale-batch',
              })
        notification.onclick = () => window.focus()
        due.forEach((app) => {
          next[app.id] = app.updated_at
        })
      }

      // Prune entries for applications that no longer exist or are archived,
      // so the maps don't grow unbounded over the life of the browser.
      const liveIds = new Set(applications.filter((app) => !app.is_archived).map((app) => app.id))
      const pruned = Object.fromEntries(Object.entries(next).filter(([id]) => liveIds.has(id)))
      if (Object.keys(pruned).length !== Object.keys(notified).length || due.length > 0) {
        setNotifiedMap(pruned)
      }
      const prunedDismissed = Object.fromEntries(Object.entries(dismissed).filter(([id]) => liveIds.has(id)))
      if (Object.keys(prunedDismissed).length !== Object.keys(dismissed).length) {
        setDismissedStaleMap(prunedDismissed)
      }
    }

    check()
    const interval = setInterval(check, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [applications, enabled])
}
