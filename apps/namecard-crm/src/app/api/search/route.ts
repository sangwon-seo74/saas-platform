// GET /api/search?q=
// 이름·회사명·전화번호·이메일·메모·태그 키워드 부분 일치 검색

import { withAuth } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  if (!q.trim()) return ok({ contacts: [] })

  const { supabase } = createRouteHandlerClient(req)

  // 회사명 검색: 먼저 company_id 목록 조회
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .ilike('name', `%${q}%`)
    .limit(50)

  const companyIds = (companies ?? []).map(c => c.id as string)

  // 연락처 검색: 이름·전화·이메일·메모 OR 매칭된 회사
  let query = supabase
    .from('contacts')
    .select('id, name, title, mobile, email, is_vip, last_contacted_at, company:companies!company_id(id, name)')
    .eq('tenant_id', ctx.tenantId)

  const conditions = [`name.ilike.%${q}%`, `mobile.ilike.%${q}%`, `email.ilike.%${q}%`, `notes.ilike.%${q}%`]
  if (companyIds.length > 0) {
    conditions.push(`company_id.in.(${companyIds.join(',')})`)
  }
  query = query.or(conditions.join(','))

  const { data, error } = await query
    .order('last_contacted_at', { ascending: false })
    .limit(30)

  if (error) return err('DB_ERROR', error.message)
  return ok({ contacts: data ?? [] })
})
