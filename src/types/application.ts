export type ApplicationStage = 'eyes_on' | 'applied' | 'interview' | 'offer'

export type ArchiveReason = 'rejected' | 'withdrawn' | 'no_response' | 'accepted'

export type EmploymentType = 'full_time' | 'part_time' | 'freelance'

export type WorkMode = 'on_site' | 'remote' | 'hybrid'

export interface Tracker {
  id: string
  user_id: string | null
  name: string
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  user_id: string | null
  tracker_id: string
  company: string
  role_title: string
  job_link: string | null
  date_applied: string
  current_stage: ApplicationStage
  salary_range: string | null
  location: string | null
  employment_type: EmploymentType | null
  work_mode: WorkMode | null
  notes: string | null
  is_archived: boolean
  archive_reason: ArchiveReason | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface StageHistoryEntry {
  id: string
  application_id: string
  stage: ApplicationStage
  entered_at: string
}
