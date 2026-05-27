// GET /api/me — 현재 로그인 사용자의 프로필 (사이드바·헤더용)

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, team:teams!team_id(id, name)')
    .eq('id', ctx.userId)
    .single()

  if (error || !data) return err('NOT_FOUND', '사용자 정보를 찾을 수 없습니다', 404)

  return ok({
    id:    data.id,
    name:  data.name,
    email: data.email,
    role:  data.role,
    team:  (data.team as unknown as { id: string; name: string } | null) ?? null,
  })
})
