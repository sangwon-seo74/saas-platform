// GET /api/me — 현재 사용자 정보

import { withAuth } from '@/lib/api'
import { ok } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)
  const { data: user } = await supabase
    .schema('core')
    .from('users')
    .select('id, name, email, role')
    .eq('id', ctx.userId)
    .single()

  return ok(user ?? { id: ctx.userId, name: '?', role: ctx.role })
})
