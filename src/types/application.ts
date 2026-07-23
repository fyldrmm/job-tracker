export type ApplicationStage = 'eyes_on' | 'applied' | 'interview' | 'offer'

export type ArchiveReason = 'rejected' | 'withdrawn' | 'no_response' | 'accepted'

export type EmploymentType = 'full_time' | 'part_time' | 'freelance' | 'internship'

export type WorkMode = 'on_site' | 'remote' | 'hybrid'

export interface Tracker {
  id: string
  user_id: string | null
  name: string
  created_at: string
  updated_at: string
  // Manual tab order set by dragging in TrackerTabs. Optional: rows created
  // before this field existed (or not yet reordered) have no value here and
  // fall back to created_at ordering -- see byTrackerOrder in lib/sort.ts.
  sort_order?: number
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
  is_priority: boolean
  is_archived: boolean
  archive_reason: ArchiveReason | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

// One scheduled interview round on an application. A row exists only once
// the user has actually given a date -- "skip for now" means no row at all,
// which is what keeps unscheduled interviews out of the calendar export by
// construction. See supabase/migrations/0013_interviews.sql.
export interface Interview {
  id: string
  application_id: string
  round: number
  // UTC ISO string, built from the user's local date + time inputs.
  scheduled_at: string
  duration_minutes: number
  is_remote: boolean
  // Meeting link when remote, address when on-site -- both map onto the
  // single LOCATION field in an .ics.
  location: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StageHistoryEntry {
  id: string
  application_id: string
  stage: ApplicationStage
  entered_at: string
}
