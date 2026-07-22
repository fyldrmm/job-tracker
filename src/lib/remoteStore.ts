import { supabase } from './supabase'
import { startOfCurrentMonthUtc } from './extraction'
import type { Application, EmploymentType, StageHistoryEntry, Tracker, WorkMode } from '../types/application'

export async function getAllRemoteApplications(userId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Application[]
}

export async function putRemoteApplication(application: Application): Promise<void> {
  const { error } = await supabase.from('applications').upsert(application)
  if (error) throw error
}

// Cascades to stage_history via the FK in 0001_init.sql.
export async function deleteRemoteApplication(id: string): Promise<void> {
  const { error } = await supabase.from('applications').delete().eq('id', id)
  if (error) throw error
}

export async function addRemoteStageHistoryEntry(entry: StageHistoryEntry): Promise<void> {
  const { error } = await supabase.from('stage_history').insert(entry)
  if (error) throw error
}

// No .eq(user_id) needed -- RLS already scopes stage_history to rows whose
// parent application belongs to the caller.
export async function getAllRemoteStageHistory(): Promise<StageHistoryEntry[]> {
  const { data, error } = await supabase
    .from('stage_history')
    .select('*')
    .order('entered_at', { ascending: true })
  if (error) throw error
  return data as StageHistoryEntry[]
}

// Shared by every Edge Function call below. supabase-js's own error.message
// is a generic "Edge Function returned a non-2xx status code" -- it doesn't
// surface the actual reason. The real message is in the response body,
// reachable via error.context (the raw Response) for a FunctionsHttpError.
// Falls back to the generic message if that body isn't readable/JSON for
// some reason.
async function invokeEdgeFunction<T = void>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    const context = (error as { context?: Response }).context
    let message = error.message
    if (context && typeof context.json === 'function') {
      try {
        const parsed = await context.json()
        if (parsed?.error) message = parsed.error
      } catch {
        // context body wasn't JSON (or already consumed) -- keep the generic message
      }
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data as T
}

// Both of these go through the one account-action Edge Function (see
// supabase/functions/account-action/index.ts), which verifies the password
// server-side before running the requested action -- so neither can be
// bypassed by a direct API call with just a stolen session token. Any
// future password-gated action is another `action` value there, not a new
// function.
async function callAccountAction(body: Record<string, unknown>): Promise<void> {
  await invokeEdgeFunction('account-action', body)
}

// Deletes the caller's account (cascades through applications ->
// stage_history via the delete_own_account() RPC the function calls) after
// emailing a confirmation first.
export async function deleteOwnAccount(password: string): Promise<void> {
  await callAccountAction({ action: 'delete', password })
}

// Changes the caller's password after verifying the current one server-side.
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await callAccountAction({ action: 'change-password', password: currentPassword, newPassword })
}

export async function getAllRemoteTrackers(userId: string): Promise<Tracker[]> {
  const { data, error } = await supabase
    .from('trackers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Tracker[]
}

export async function putRemoteTracker(tracker: Tracker): Promise<void> {
  const { error } = await supabase.from('trackers').upsert(tracker)
  if (error) throw error
}

// Cascades to applications -> stage_history via the FKs in
// 0003_trackers.sql / 0001_init.sql.
export async function deleteRemoteTracker(id: string): Promise<void> {
  const { error } = await supabase.from('trackers').delete().eq('id', id)
  if (error) throw error
}

export interface ExtractedJobFields {
  company: string | null
  role_title: string | null
  salary_range: string | null
  location: string | null
  job_link: string | null
  employment_type: EmploymentType | null
  work_mode: WorkMode | null
}

// Calls the extract-job-details Edge Function (Claude Haiku 4.5 vision +
// structured output). Quota and image-size limits are enforced server-side
// (supabase/functions/extract-job-details/index.ts); a 429/400 from there
// surfaces here as a thrown Error with the real message via
// invokeEdgeFunction's error.context extraction.
export async function extractJobDetails(imageBase64: string, mediaType: string): Promise<ExtractedJobFields> {
  const { fields } = await invokeEdgeFunction<{ fields: ExtractedJobFields }>('extract-job-details', {
    imageBase64,
    mediaType,
  })
  return fields
}

// Text-mode sibling of extractJobDetails, for the browser-extension handoff
// (milestone B1) -- same Edge Function, same quota/schema, just scraped page
// text instead of a screenshot. See supabase/functions/extract-job-details/index.ts.
export async function extractJobDetailsFromText(text: string): Promise<ExtractedJobFields> {
  const { fields } = await invokeEdgeFunction<{ fields: ExtractedJobFields }>('extract-job-details', {
    text,
  })
  return fields
}

// How many extractions the caller has used this calendar month, for the
// "N of 20 left" display. Relies on the extraction_events_select_own RLS
// policy to scope the count to the caller; the actual quota enforcement
// still happens server-side in the Edge Function.
export async function getExtractionUsageThisMonth(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('extraction_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfCurrentMonthUtc())
  if (error) throw error
  return count ?? 0
}
