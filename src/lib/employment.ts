import type { EmploymentType, WorkMode } from '../types/application'

export const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'freelance', label: 'Freelance' },
]

export const WORK_MODES: { value: WorkMode; label: string }[] = [
  { value: 'on_site', label: 'On-site' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
]

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
