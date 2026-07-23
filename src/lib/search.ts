import type { Application } from '../types/application'

export function matchesCompanyOrRoleSearch(application: Application, query: string): boolean {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return true
  return application.company.toLowerCase().includes(trimmed) || application.role_title.toLowerCase().includes(trimmed)
}
