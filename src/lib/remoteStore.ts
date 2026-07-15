import { supabase } from './supabase'
import type { Application, StageHistoryEntry } from '../types/application'

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
