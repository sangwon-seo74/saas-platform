// GET  /api/contacts — 고객 목록
// POST /api/contacts — 명함 인식 결과로 고객 생성

import { withAuth, parsePagination } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import type { RecognizedCardData } from '@/types/domain'

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)
  const { searchParams } = new URL(req.url)
  const { limit, offset } = parsePagination(req.url)

  const q      = searchParams.get('q') ?? ''
  const isVip  = searchParams.get('is_vip') === '1'
  const sort   = searchParams.get('sort') ?? 'created_at'
  const order  = searchParams.get('order') === 'asc'
  const filter = searchParams.get('filter') ?? ''

  let query = supabase
    .from('contacts')
    .select('id, name, department, title, mobile, email, is_vip, last_contacted_at, created_at, company:companies!company_id(id, name)', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)

  if (isVip) query = query.eq('is_vip', true)

  if (q) {
    query = query.or(`name.ilike.%${q}%,mobile.ilike.%${q}%,email.ilike.%${q}%`)
  }

  if (filter === 'no_contact_30') {
    const d30 = new Date(Date.now() - 30 * 86400_000).toISOString()
    query = query.or(`last_contacted_at.lt.${d30},last_contacted_at.is.null`)
  }

  query = query.order(sort, { ascending: order }).range(offset, offset + limit - 1)
  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message)
  return ok({ data: data ?? [], total: count ?? 0 })
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { supabase } = createRouteHandlerClient(req)
  const recognized: RecognizedCardData = body.recognized ?? {}

  // 1. 회사 upsert
  let companyId: string | null = null
  if (recognized.company_name?.trim()) {
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .ilike('name', recognized.company_name.trim())
      .maybeSingle()

    if (existing) {
      companyId = existing.id
    } else {
      const { data: newCo } = await supabase
        .from('companies')
        .insert({
          tenant_id:  ctx.tenantId,
          name:       recognized.company_name.trim(),
          address:    recognized.address ?? null,
          website:    recognized.website ?? null,
          main_phone: recognized.phone ?? null,
          created_by: ctx.userId,
        })
        .select('id')
        .single()
      companyId = newCo?.id ?? null
    }
  }

  // 2. 담당자 생성
  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      tenant_id:  ctx.tenantId,
      company_id: companyId,
      name:       recognized.contact_name?.trim() || '이름 없음',
      department: recognized.department ?? null,
      title:      recognized.title ?? null,
      mobile:     recognized.mobile ?? null,
      fax:        recognized.fax ?? null,
      email:      recognized.email ?? null,
      notes:      body.notes ?? null,
      created_by: ctx.userId,
    })
    .select('id')
    .single()

  if (error) return err('DB_ERROR', error.message)
  if (!contact) return err('CREATE_FAILED', '고객 생성 실패')

  // 3. 명함 이미지 저장 (image_base64가 있을 때)
  if (body.image_base64) {
    await supabase.from('business_cards').insert({
      tenant_id:          ctx.tenantId,
      contact_id:         contact.id,
      recognized_data:    recognized,
      recognition_status: 'completed',
    })
  }

  return ok({ id: contact.id })
})
