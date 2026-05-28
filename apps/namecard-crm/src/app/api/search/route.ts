// GET /api/search?q=
// 이름·회사명·전화번호·이메일·메모 키워드 부분 일치 검색

import { withAuth } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  if (!q.trim()) return ok({ contacts: [] })

  const { supabase } = createRouteHandlerClient(req)
  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, title, mobile, email, is_vip, last_contacted_at, company:companies!company_id(id, name)')
    .eq('tenant_id', ctx.tenantId)
    .or(`name.ilike.%${q}%,mobile.ilike.%${q}%,email.ilike.%${q}%,notes.ilike.%${q}%`)
    .order('last_contacted_at', { ascending: false })
    .limit(30)

  if (error) return err('DB_ERROR', error.message)
  return ok({ contacts: data ?? [] })
})
