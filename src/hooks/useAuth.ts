import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, name: string) {
    // Name lives in Supabase Auth's built-in user_metadata -- no separate
    // profiles table needed for a single, compulsory field. Read back via
    // user.user_metadata.name (see displayName below).
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim() } },
    })
    if (error) throw error
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function updateName(name: string) {
    const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } })
    if (error) throw error
  }

  const user = session?.user ?? null
  const displayName = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : ''

  return { session, user, displayName, loading, signUp, signIn, signOut, updateName }
}
