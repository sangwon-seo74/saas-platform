'use client'

import { createBrowserClient } from './client'

export async function signIn(email: string, password: string) {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { session: data.session, error }
}

export async function signOut() {
  const supabase = createBrowserClient()
  await supabase.auth.signOut()
}
