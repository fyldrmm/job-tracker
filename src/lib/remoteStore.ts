import { supabase } from './supabase'
import type { Application, StageHistoryEntry, Tracker } from '../types/application'

export async function getAllRemoteApplications(userId: string): Promise<Application[]> {
  const { data, error } = await supabase.from('applications').select('*').eq('user_id', userId)
  if (error) throw error
  return data as Application[]
}

export async function putRemoteApplication(application: Application): Promise<void> {
  const { error } = await supabase.from('applications').upsert(application)
  if (error) throw error
}

export async function addRemoteStageHistoryEntry(entry: StageHistoryEntry): Promise<void> {
  const { error } = await supabase.from('stage_history').insert(entry)
  if (error) throw error
}

// No .eq(user_id) needed -- RLS already scopes stage_history to rows whose
// parent application belongs to the caller.
export async function getAllRemoteStageHistory(): Promise<StageHistoryEntry[]> {
  const { data, error } = await supabase.from('stage_history').select('*')
  if (error) throw error
  return data as StageHistoryEntry[]
}

// Both of these go through the one account-action Edge Function (see
// supabase/functions/account-action/index.ts), which verifies the password
// server-side before running the requested action -- so neither can be
// bypassed by a direct API call with just a stolen session token. Any future
// password-gated action is another `action` value there, not a new function.
async function callAccountAction(body: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('account-action', { body })
  if (error) {
    // supabase-js's own error.message is a generic "Edge Function returned a
    // non-2xx status code" -- it doesn't surface the actual reason. The real
    // message is in the response body, reachable via error.context (the raw
    // Response) for a FunctionsHttpError. Fall back to the generic message
    // if that body isn't readable/JSON for some reason.
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
  const { data, error } = await supabase.from('trackers').select('*').eq('user_id', userId)
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
