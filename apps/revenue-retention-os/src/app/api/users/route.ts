// GET /api/users — 담당자 필터용 경량 사용자 목록 (id, name)
// 모든 역할 접근 가능 (sales도 조회 가능, 민감 정보 미포함)

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)

  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('tenant_id', ctx.tenantId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data ?? [])
})
