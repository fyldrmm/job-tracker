import { supabase } from './supabase'

export async function submitFeedback(rating: number, comment: string, userId: string | null) {
  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    rating,
    comment: comment.trim() || null,
  })
  if (error) throw error
}
