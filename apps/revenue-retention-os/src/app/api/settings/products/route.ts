// GET  /api/settings/products  — 제품 목록 (활성 계약 수 포함)
// POST /api/settings/products  — 제품 생성

import { ok, err } from '@/lib/utils'
import { withAuth, parsePagination } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import type { BillingCycle } from '@/types/domain'

export const GET = withAuth(async (req, ctx) => {
  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const { supabase } = createRouteHandlerClient(req)

  const active = searchParams.get('active')

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (active) query = query.eq('is_active', active === 'true')

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  // 제품별 활성 계약 수 집계
  if (data && data.length > 0) {
    const productIds = data.map(p => p.id)
    const { data: contractCounts } = await supabase
      .from('contracts')
      .select('product_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'active')
      .in('product_id', productIds)

    const countMap: Record<string, number> = {}
    contractCounts?.forEach(c => {
      if (c.product_id) countMap[c.product_id] = (countMap[c.product_id] ?? 0) + 1
    })

    const enriched = data.map(p => ({
      ...p,
      active_contract_count: countMap[p.id] ?? 0,
    }))

    return ok({ data: enriched, count: count ?? 0, page, limit })
  }

  return ok({ data: data ?? [], count: count ?? 0, page, limit })
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const { name, category, unit_price, billing_cycle, description } = body

  if (!name?.trim()) return err('VALIDATION', '제품명은 필수입니다')

  const VALID_CYCLES: BillingCycle[] = ['monthly', 'yearly']
  if (billing_cycle && !VALID_CYCLES.includes(billing_cycle)) {
    return err('VALIDATION', 'billing_cycle은 monthly 또는 yearly여야 합니다')
  }
  if (unit_price !== undefined && Number(unit_price) < 0) {
    return err('VALIDATION', '단가는 0 이상이어야 합니다')
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      tenant_id:     ctx.tenantId,
      name:          name.trim(),
      category:      category    ?? null,
      unit_price:    unit_price  ?? null,
      billing_cycle: billing_cycle ?? 'yearly',
      description:   description ?? null,
      is_active:     true,
    })
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data)
}, { roles: ['admin'] })
