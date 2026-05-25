// GET /api/super-admin/system/logs — 접속 로그 목록 (테넌트/사용자/액션/결과 조인)

import { ok, err } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'
import { parsePagination } from '@/lib/api'

/** audit_logs 목록 조회.
 *  검색어(q) — email/IP에 부분 일치, 액션(action)/결과(result) 필터, 페이지네이션 지원.
 *  tenant·user 조인을 통해 표시용 이름을 함께 반환한다. */
export const GET = withSuperAdmin(async (req) => {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const { page, limit, offset } = parsePagination(req.url)
  const q       = searchParams.get('q')
  const action  = searchParams.get('action')
  const result  = searchParams.get('result')

  let query = supabase
    .from('audit_logs')
    .select(`
      id, action, ip, user_agent, result, created_at, email,
      tenant:tenants!tenant_id(id, name),
      user:users!user_id(id, name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q)      query = query.or(`email.ilike.%${q}%,ip.ilike.%${q}%`)
  if (action && action !== 'all') query = query.eq('action', action)
  if (result && result !== 'all') query = query.eq('result', result)

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  type Row = {
    id: string; action: string; ip: string | null; user_agent: string | null
    result: string; created_at: string; email: string | null
    tenant: { id: string; name: string } | null
    user:   { id: string; name: string } | null
  }
  const rows = ((data ?? []) as unknown as Row[]).map(r => ({
    id:          r.id,
    tenant_name: r.tenant?.name ?? '—',
    user_name:   r.user?.name ?? '—',
    email:       r.email ?? '',
    action:      r.action,
    ip:          r.ip ?? '',
    ua:          r.user_agent ?? '',
    at:          r.created_at,
    result:      r.result,
  }))

  return ok({ data: rows, count: count ?? 0, page, limit })
})
