// ============================================================
// Revenue Retention OS — Auth 서버 헬퍼 (Server Component 전용)
// next/headers 사용으로 Edge/클라이언트 컴포넌트에서 import 금지.
// 클라이언트 Auth 헬퍼(signIn, signOut 등)는 auth-client.ts 사용.
// ============================================================

import { createServerComponentClient } from './server'
import type { UserRole } from '@/types/domain'

export async function getServerUser() {
  const supabase = await createServerComponentClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id, role, name, team_id, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) return null

  return {
    id: profile.id,
    email: user.email!,
    name: profile.name,
    tenantId: profile.tenant_id,
    role: profile.role as UserRole,
    teamId: profile.team_id,
  }
}
