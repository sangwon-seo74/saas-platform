// ============================================================
// Revenue Retention OS — Auth 클라이언트 헬퍼 (Edge/Browser 안전)
// 클라이언트 컴포넌트에서 동적 import 가능 (next/headers 미포함)
// ============================================================

import { createBrowserClient } from './client'

export async function signIn(email: string, password: string) {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { session: data.session, error }
}

export async function signOut() {
  const supabase = createBrowserClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function sendPasswordReset(email: string) {
  const supabase = createBrowserClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })
  return { error }
}

export async function updatePassword(newPassword: string) {
  const supabase = createBrowserClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error }
}
