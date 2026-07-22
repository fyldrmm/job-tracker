const ENABLED_KEY = 'reminders:enabled'
const NOTIFIED_KEY = 'reminders:notified'
const DISMISSED_KEY = 'reminders:dismissed-stale'

export function getRemindersEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === 'true'
}

export function setRemindersEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, String(enabled))
}

// Maps application id -> the updated_at value it was last notified for, so a
// stale app is only notified once per stage change rather than on every poll.
export function getNotifiedMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function setNotifiedMap(map: Record<string, string>): void {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map))
}

// Maps application id -> the updated_at value its stale badge/notification
// was dismissed for ("this is fine where it is, stop flagging it"). Once the
// card sees real activity (updated_at changes), the dismissal naturally
// expires and it's eligible to go stale again later.
export function getDismissedStaleMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function setDismissedStaleMap(map: Record<string, string>): void {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(map))
}

export function dismissStale(applicationId: string, updatedAt: string): void {
  const map = getDismissedStaleMap()
  map[applicationId] = updatedAt
  setDismissedStaleMap(map)
}

export function isDismissedStale(applicationId: string, updatedAt: string): boolean {
  return getDismissedStaleMap()[applicationId] === updatedAt
}
