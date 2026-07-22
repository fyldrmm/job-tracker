import type { Application } from '../types/application'

export const STALE_THRESHOLD_DAYS = 14

export function daysSinceUpdate(application: Application): number {
  return (Date.now() - new Date(application.updated_at).getTime()) / (1000 * 60 * 60 * 24)
}

export function isStale(application: Application): boolean {
  return daysSinceUpdate(application) > STALE_THRESHOLD_DAYS
}
