// GET  /api/settings/users  — 테넌트 사용자 목록 (플랜 한도 포함)
// POST /api/settings/users  — 사용자 초대

import { ok, err } from '@/lib/utils'
import { withAuth, parsePagination } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import { sendInvite } from '@/lib/invite'
import type { UserRole } from '@/types/domain'

export const GET = withAuth(async (req, ctx) => {
  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const { supabase } = createRouteHandlerClient(req)

  const q       = searchParams.get('q')
  const role    = searchParams.get('role') as UserRole | null
  const team_id = searchParams.get('team_id')
  const active  = searchParams.get('active')

  let query = supabase
    .from('users')
    .select(`
      id, name, email, phone, role, is_active, last_login_at, created_at,
      team:teams!team_id(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (q)       query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
  if (role)    query = query.eq('role', role)
  if (team_id) query = query.eq('team_id', team_id)
  if (active)  query = query.eq('is_active', active === 'true')

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  // 플랜 한도 조회
  const { data: sub } = await supabase
    .from('tenant_subscriptions')
    .select('plan:plans!plan_id(max_users)')
    .eq('tenant_id', ctx.tenantId)
    .in('status', ['active', 'trialing'])
    .single()

  const maxUsers = (sub?.plan as unknown as { max_users: number | null } | null)?.max_users ?? null

  return ok({
    data: data ?? [],
    count: count ?? 0,
    page,
    limit,
    plan_limit: { max_users: maxUsers, current_users: count ?? 0 },
  })
}, { roles: ['admin', 'manager'] })

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const { email, name, role, team_id } = body

  if (!email?.trim()) return err('VALIDATION', '이메일은 필수입니다')
  if (!name?.trim())  return err('VALIDATION', '이름은 필수입니다')

  const VALID_ROLES: UserRole[] = ['admin', 'manager', 'sales']
  if (!VALID_ROLES.includes(role)) {
    return err('VALIDATION', `role은 ${VALID_ROLES.join(', ')} 중 하나여야 합니다`)
  }
  if (role === 'admin' && ctx.role !== 'admin') {
    return err('FORBIDDEN', '관리자 계정은 관리자만 초대할 수 있습니다', 403)
  }

  // 플랜 한도 초과 확인
  const { data: sub } = await supabase
    .from('tenant_subscriptions')
    .select('plan:plans!plan_id(max_users)')
    .eq('tenant_id', ctx.tenantId)
    .in('status', ['active', 'trialing'])
    .single()

  const maxUsers = (sub?.plan as unknown as { max_users: number | null } | null)?.max_users
  if (maxUsers) {
    const { count: current } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true)
    if ((current ?? 0) >= maxUsers) {
      return err('PLAN_LIMIT', `현재 플랜의 사용자 한도(${maxUsers}명)에 도달했습니다`, 403)
    }
  }

  // 이미 가입된 이메일 확인
  const { count: existing } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .eq('tenant_id', ctx.tenantId)
  if ((existing ?? 0) > 0) return err('DUPLICATE', '이미 등록된 이메일입니다', 409)

  // 테넌트명 및 초대자명 조회
  const [{ data: tenant }, { data: inviter }] = await Promise.all([
    supabase.from('tenants').select('name').eq('id', ctx.tenantId).single(),
    supabase.from('users').select('name').eq('id', ctx.userId).single(),
  ])
  const tenantName  = (tenant  as { name: string } | null)?.name ?? ''
  const inviterName = (inviter as { name: string } | null)?.name ?? ''

  // 초대 토큰 생성 + 이메일 발송 (HTTP 라운드트립 없이 직접 호출)
  await sendInvite(supabase, {
    email,
    name,
    role,
    tenantId:    ctx.tenantId,
    userId:      ctx.userId,
    tenantName,
    inviterName,
  })

  return ok({ message: `${email}로 초대 이메일을 발송했습니다`, email, role })
}, { roles: ['admin', 'manager'] })
