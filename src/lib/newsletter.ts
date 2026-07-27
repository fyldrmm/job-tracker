import { supabase } from './supabase'

export async function subscribeToNewsletter(email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('newsletter-subscribe', { body: { email } })
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
}
