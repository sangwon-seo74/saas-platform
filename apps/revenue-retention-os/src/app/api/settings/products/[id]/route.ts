// PATCH  /api/settings/products/[id]
// DELETE /api/settings/products/[id]

import { ok, err } from '@/lib/utils'
import { withAuth, requireId } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (error) return err('NOT_FOUND', '제품을 찾을 수 없습니다', 404)
  return ok(data)
})

export const PATCH = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const ALLOWED = [
    'name', 'category', 'unit_price', 'billing_cycle', 'description', 'is_active'
  ] as const
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return err('VALIDATION', '변경할 필드가 없습니다')
  }

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data)
}, { roles: ['admin'] })

export const DELETE = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.id)
  if (idErr) return idErr
  const { supabase } = createRouteHandlerClient(req)

  // 활성 계약 연결 여부 확인 → 있으면 소프트 딜리트
  const { count: activeContracts } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', params!.id)
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'active')

  if ((activeContracts ?? 0) > 0) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', params!.id)
      .eq('tenant_id', ctx.tenantId)
    if (error) return err('DB_ERROR', error.message, 500)
    return ok({ deleted: false, deactivated: true, id: params!.id })
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', params!.id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ deleted: true, id: params!.id })
}, { roles: ['admin'] })
