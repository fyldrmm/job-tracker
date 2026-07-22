const ENABLED_KEY = 'reminders:enabled'
const NOTIFIED_KEY = 'reminders:notified'

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
