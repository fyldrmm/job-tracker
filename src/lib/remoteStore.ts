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

// Calls the delete_own_account() Postgres function (see
// supabase/migrations/0002_delete_account.sql) -- deletes the caller's
// auth.users row, cascading through applications and stage_history.
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account')
  if (error) throw error
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
