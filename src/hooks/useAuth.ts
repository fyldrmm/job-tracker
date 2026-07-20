import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { markPendingSignup } from '../lib/migration'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Fires when the user lands back here via a password-reset email link
      // -- Supabase has already established a temporary "recovery" session
      // by this point (newSession is set), but the app should show the
      // set-new-password screen instead of the normal signed-in board.
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
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
    markPendingSignup()
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

  // Sends a password-reset email; the link redirects back to the app with a
  // recovery session, which the listener above picks up as PASSWORD_RECOVERY.
  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }

  // Completes the recovery flow: sets the new password on the temporary
  // recovery session, then clears the flag so the app returns to normal.
  async function updatePasswordAfterRecovery(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    setPasswordRecovery(false)
  }

  const user = session?.user ?? null
  const displayName = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : ''

  return {
    session,
    user,
    displayName,
    loading,
    passwordRecovery,
    signUp,
    signIn,
    signOut,
    updateName,
    resetPassword,
    updatePasswordAfterRecovery,
  }
}
