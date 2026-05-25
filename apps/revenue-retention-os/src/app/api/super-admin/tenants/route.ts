// GET  /api/super-admin/tenants  — 테넌트 목록
// POST /api/super-admin/tenants  — 테넌트 등록

import { ok, err } from '@/lib/utils'
import { withSuperAdmin, computeMrr } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'
import { parsePagination } from '@/lib/api'
import { sendInvite } from '@/lib/invite'

/** 테넌트 목록 조회.
 *  검색어(q), 상태(status), 페이지네이션(page/limit)을 받아 각 테넌트의 활성 구독·플랜·
 *  사용자/고객사 수·MRR을 매핑해 반환한다. 상태 필터는 클라이언트 측에서 적용한다. */
export const GET = withSuperAdmin(async (req) => {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const { page, limit, offset } = parsePagination(req.url)
  const q      = searchParams.get('q')
  const status = searchParams.get('status')

  let query = supabase
    .from('tenants')
    .select(`
      id, name, biz_no, is_active, created_at,
      subscriptions:tenant_subscriptions!tenant_id(
        id, status, billing_cycle, expires_at, next_billing_at, started_at,
        plan:plans!plan_id(name, code, monthly_price, yearly_price)
      ),
      user_count:users!tenant_id(count),
      company_count:companies!tenant_id(count)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) query = query.or(`name.ilike.%${q}%,biz_no.ilike.%${q}%`)

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  type SubRow = {
    id: string; status: string; billing_cycle: string; expires_at: string;
    next_billing_at: string | null; started_at: string;
    plan: { name: string; code: string; monthly_price: number; yearly_price: number } | null
  }
  type TenantRaw = {
    id: string; name: string; biz_no: string | null; is_active: boolean; created_at: string
    subscriptions: SubRow[]
    user_count: { count: number }[]
    company_count: { count: number }[]
  }

  const rows = ((data ?? []) as unknown as TenantRaw[]).map(t => {
    const subs = t.subscriptions ?? []
    const activeSub = subs.find(s => ['active', 'trialing', 'past_due'].includes(s.status))
      ?? subs.sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0]
      ?? null

    const userCount    = (t.user_count as { count: number }[])[0]?.count ?? 0
    const companyCount = (t.company_count as { count: number }[])[0]?.count ?? 0

    const mrr = activeSub?.plan
      ? computeMrr(activeSub.billing_cycle, activeSub.plan.monthly_price, activeSub.plan.yearly_price)
      : 0

    const row = {
      id:                  t.id,
      name:                t.name,
      biz_no:              t.biz_no ?? '',
      is_active:           t.is_active,
      created_at:          t.created_at,
      plan:                activeSub?.plan?.name ?? 'Free',
      plan_code:           activeSub?.plan?.code ?? 'free',
      subscription_status: (activeSub?.status ?? 'cancelled') as string,
      expires_at:          activeSub?.expires_at ?? '',
      user_count:          userCount,
      company_count:       companyCount,
      mrr,
      last_login_at:       null as string | null,
    }

    // 상태 필터 (서버 필터가 어려워 클라이언트 필터 후 처리)
    return row
  }).filter(row => !status || status === 'all' || row.subscription_status === status)

  return ok({ data: rows, count: count ?? 0, page, limit })
})

/** 신규 테넌트 등록.
 *  1) 사업자번호 중복 확인 → 2) tenants 레코드 생성 → 3) 선택 플랜의 30일 체험 구독 생성
 *  → 4) 관리자 이메일로 초대 토큰 발급 + 발송(sendInvite). 트랜잭션 없이 순차 실행되므로
 *  중간 실패 시 일부 레코드가 남을 수 있다(슈퍼관리자가 수동 정리). */
export const POST = withSuperAdmin(async (req) => {
  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { name, biz_no, admin_email, admin_name, plan: planCode } = body

  if (!name?.trim())        return err('VALIDATION', '회사명은 필수입니다')
  if (!admin_email?.trim()) return err('VALIDATION', '관리자 이메일은 필수입니다')
  if (!admin_name?.trim())  return err('VALIDATION', '관리자 이름은 필수입니다')

  // 이미 존재하는 사업자번호 확인
  if (biz_no?.trim()) {
    const { count } = await supabase
      .from('tenants').select('*', { count: 'exact', head: true }).eq('biz_no', biz_no.trim())
    if ((count ?? 0) > 0) return err('DUPLICATE', '이미 등록된 사업자번호입니다', 409)
  }

  // 테넌트 생성
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .insert({ name: name.trim(), biz_no: biz_no?.trim() || null, is_active: true })
    .select('id, name')
    .single()
  if (tenantErr) return err('DB_ERROR', tenantErr.message, 500)

  // 플랜 조회
  const { data: plan } = await supabase
    .from('plans').select('id, name').eq('code', planCode ?? 'free').single()

  if (plan) {
    const trialEnd = new Date(Date.now() + 30 * 86400000).toISOString()
    await supabase.from('tenant_subscriptions').insert({
      tenant_id:      (tenant as { id: string; name: string }).id,
      plan_id:        plan.id,
      billing_cycle:  'monthly',
      status:         'trialing',
      started_at:     new Date().toISOString(),
      expires_at:     trialEnd,
    })
  }

  // 초대 메일 발송 (서비스 롤로 직접 sendInvite 호출, invited_by는 null)
  try {
    await sendInvite(supabase, {
      email:       admin_email.trim(),
      name:        admin_name.trim(),
      role:        'admin',
      tenantId:    (tenant as { id: string; name: string }).id,
      userId:      null,
      tenantName:  (tenant as { id: string; name: string }).name,
      inviterName: 'Super Admin',
    })
  } catch (e) {
    console.error('[SuperAdmin] 초대 이메일 발송 실패:', e)
  }

  return ok({ tenant_id: (tenant as { id: string; name: string }).id, name: (tenant as { id: string; name: string }).name })
})
