// GET   /api/settings/tenant — 일반 admin의 자기 테넌트 정보 + 간단 통계
// PATCH /api/settings/tenant — 자기 테넌트 정보 편집(이름/대표/주소 등)

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createServiceClient } from '@/lib/supabase/client'

/** 자기 테넌트의 기본 정보 + 통계(고객사/사용자/메시지). */
export const GET = withAuth(async (_req, ctx) => {
  const supabase = createServiceClient()

  const monthStart = new Date()
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

  // 마이그레이션 미적용 환경 graceful 처리
  const tryExtra = await supabase
    .from('tenants')
    .select('id, name, biz_no, ceo_name, email, phone, address, is_active, created_at')
    .eq('id', ctx.tenantId).single()
  const res = tryExtra.error
    ? await supabase.from('tenants').select('id, name, biz_no, is_active, created_at').eq('id', ctx.tenantId).single()
    : tryExtra

  if (res.error || !res.data) return err('NOT_FOUND', '테넌트를 찾을 수 없습니다', 404)
  const tenant = { ceo_name: null, email: null, phone: null, address: null, ...(res.data as Record<string, unknown>) }

  const [
    { count: companyCount },
    { count: userCount },
    { count: messageCount },
    { count: activeContractCount },
  ] = await Promise.all([
    supabase.from('companies') .select('*', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId),
    supabase.from('users')     .select('*', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId).eq('is_active', true),
    supabase.from('messages')  .select('*', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId).gte('sent_at', monthStart.toISOString()),
    supabase.from('contracts') .select('*', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId).eq('status', 'active'),
  ])

  return ok({
    ...tenant,
    stats: {
      total_companies:     companyCount        ?? 0,
      total_users:         userCount           ?? 0,
      messages_this_month: messageCount        ?? 0,
      active_contracts:    activeContractCount ?? 0,
    },
  })
}, { roles: ['admin'] })

/** 일반 admin이 편집 가능한 필드는 제한적: name, ceo_name, email, phone, address.
 *  is_active, biz_no 등 민감 필드는 슈퍼어드민 전용. */
export const PATCH = withAuth(async (req, ctx) => {
  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { name, ceo_name, email, phone, address } = body
  const updateData: Record<string, unknown> = {}
  if (name     !== undefined) updateData.name     = name
  if (ceo_name !== undefined) updateData.ceo_name = ceo_name
  if (email    !== undefined) updateData.email    = email
  if (phone    !== undefined) updateData.phone    = phone
  if (address  !== undefined) updateData.address  = address

  if (Object.keys(updateData).length === 0) return err('VALIDATION', '수정할 필드가 없습니다')

  let { error } = await supabase.from('tenants').update(updateData).eq('id', ctx.tenantId)
  // 추가 컬럼 마이그레이션 미적용 환경 fallback
  if (error && /column .* does not exist/i.test(error.message)) {
    const safe: Record<string, unknown> = {}
    if (updateData.name !== undefined) safe.name = updateData.name
    if (Object.keys(safe).length > 0) {
      const r = await supabase.from('tenants').update(safe).eq('id', ctx.tenantId)
      error = r.error
    } else error = null
  }
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ id: ctx.tenantId })
}, { roles: ['admin'] })
