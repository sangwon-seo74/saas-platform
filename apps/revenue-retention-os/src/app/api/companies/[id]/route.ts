// GET    /api/companies/[id]  — 고객사 상세 + 연관 데이터
// PATCH  /api/companies/[id]  — 고객사 수정
// DELETE /api/companies/[id]  — 고객사 삭제 (admin 전용)

import { ok, err } from '@/lib/utils'
import { withAuth, requireId } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)
  const { searchParams } = new URL(req.url)
  const include = searchParams.get('include') ?? 'all' // all | basic

  // 기본 고객사 정보
  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      *,
      assigned_user:users!assigned_user_id(id, name, phone, email),
      team:teams!team_id(id, name)
    `)
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (error) return err('NOT_FOUND', '고객사를 찾을 수 없습니다', 404)

  if (include === 'basic') return ok({ company })

  // 연관 데이터 병렬 조회
  const [
    { data: contacts },
    { data: contracts },
    { data: activities },
    { data: tasks },
    { data: messages },
  ] = await Promise.all([
    supabase
      .from('contacts')
      .select('*')
      .eq('company_id', params!.id)
      .order('is_primary', { ascending: false }),

    supabase
      .from('contracts')
      .select('id, contract_no, started_at, expires_at, final_amount, status, is_paid, product:products!product_id(id, name)')
      .eq('company_id', params!.id)
      .eq('tenant_id', ctx.tenantId)
      .order('expires_at', { ascending: false }),

    supabase
      .from('activities')
      .select('id, type, activity_at, call_result, summary, next_action, next_action_at, contact_value, contact:contacts!contact_id(id, name, title), user:users!user_id(id, name)')
      .eq('company_id', params!.id)
      .order('activity_at', { ascending: false })
      .limit(20),

    supabase
      .from('tasks')
      .select('id, title, type, priority, status, due_at, is_auto, created_at')
      .eq('company_id', params!.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('messages')
      .select('id, channel, content, status, sent_at, read_at')
      .eq('company_id', params!.id)
      .order('sent_at', { ascending: false })
      .limit(10),
  ])

  return ok({
    company,
    contacts:   contacts   ?? [],
    contracts:  contracts  ?? [],
    activities: activities ?? [],
    tasks:      tasks      ?? [],
    messages:   messages   ?? [],
  })
})

export const PATCH = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const ALLOWED = [
    'name', 'biz_no', 'industry', 'website', 'company_size', 'employee_count',
    'revenue_amount', 'address_road', 'address_detail', 'address_city',
    'address_district', 'address_zip', 'lat', 'lng',
    'status', 'grade', 'renewal_risk', 'memo',
    'assigned_user_id', 'team_id',
  ] as const

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return err('VALIDATION', '변경할 필드가 없습니다')
  }

  // 사업자번호 중복 체크 (변경 시)
  if (updates.biz_no) {
    const { count } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)
      .eq('biz_no', updates.biz_no as string)
      .neq('id', params!.id)
    if ((count ?? 0) > 0) return err('DUPLICATE', '이미 등록된 사업자번호입니다', 409)
  }

  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data)
})

export const DELETE = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  // 활성 계약 존재 여부 확인
  const { count: activeContracts } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'active')

  if ((activeContracts ?? 0) > 0) {
    return err('CONFLICT', '활성 계약이 있는 고객사는 삭제할 수 없습니다', 409)
  }

  // 소프트 딜리트 (churned 상태 변경)
  const { error } = await supabase
    .from('companies')
    .update({ status: 'churned' })
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .select('id')
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ deleted: true, id: params!.id })
}, { roles: ['admin'] })
