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

// Calls the delete-account Edge Function (see
// supabase/functions/delete-account/index.ts) rather than the
// delete_own_account() RPC directly -- the function verifies the password
// and sends a confirmation email BEFORE deleting (both server-side, so
// neither can be bypassed by a direct API call with just a stolen session
// token). It still calls that same RPC under the hood, so the actual
// deletion semantics (cascades through applications -> stage_history) are
// unchanged.
export async function deleteOwnAccount(password: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', { body: { password } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
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
