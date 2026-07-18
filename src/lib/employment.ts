import type { EmploymentType, WorkMode } from '../types/application'

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  freelance: 'Freelance',
}

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  on_site: 'On-site',
  remote: 'Remote',
  hybrid: 'Hybrid',
}
