// POST  /api/visits/[id]/items  { product_name, quantity, memo? } — 항목 추가
// DELETE /api/visits/[id]/items  { item_id }                       — 항목 삭제

import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils'

const AddItemSchema = z.object({
  product_name: z.string().min(1).max(100),
  quantity:     z.number().int().positive().default(1),
  unit_price:   z.number().nonnegative().optional(),
  memo:         z.string().max(200).optional(),
})

const DeleteItemSchema = z.object({
  item_id: z.string().uuid(),
})

async function getVisitAndAuth(visitId: string, tenantId: string, userId: string, role: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .schema('lso')
    .from('visits')
    .select('id, rep_user_id, status')
    .eq('id', visitId)
    .eq('tenant_id', tenantId)
    .single()

  if (!data) return { visit: null, supabase }
  if (role === 'rep' && data.rep_user_id !== userId) return { visit: null, supabase }
  if (data.status === 'completed' || data.status === 'cancelled') return { visit: null, supabase }

  return { visit: data, supabase }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const userId   = headersList.get('x-user-id')   ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (!tenantId) return err('UNAUTHORIZED', '인증이 필요합니다', 401)

  const body: unknown = await request.json().catch(() => null)
  const parsed = AddItemSchema.safeParse(body)
  if (!parsed.success) return err('VALIDATION', parsed.error.issues[0]?.message ?? '유효하지 않은 요청', 400)

  const { visit, supabase } = await getVisitAndAuth(id, tenantId, userId, role)
  if (!visit) return err('NOT_FOUND', '방문 기록을 찾을 수 없거나 수정 권한이 없습니다', 404)

  const { data, error } = await supabase
    .schema('lso')
    .from('visit_items')
    .insert({
      visit_id:     id,
      product_name: parsed.data.product_name,
      quantity:     parsed.data.quantity,
      unit_price:   parsed.data.unit_price ?? null,
      memo:         parsed.data.memo ?? null,
    })
    .select('id, product_name, quantity, unit_price, memo')
    .single()

  if (error) return err('DB_ERROR', '항목 추가 실패', 500)
  return ok(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const userId   = headersList.get('x-user-id')   ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (!tenantId) return err('UNAUTHORIZED', '인증이 필요합니다', 401)

  const body: unknown = await request.json().catch(() => null)
  const parsed = DeleteItemSchema.safeParse(body)
  if (!parsed.success) return err('VALIDATION', '유효하지 않은 item_id', 400)

  const { visit, supabase } = await getVisitAndAuth(id, tenantId, userId, role)
  if (!visit) return err('NOT_FOUND', '방문 기록을 찾을 수 없거나 수정 권한이 없습니다', 404)

  const { error } = await supabase
    .schema('lso')
    .from('visit_items')
    .delete()
    .eq('id', parsed.data.item_id)
    .eq('visit_id', id)

  if (error) return err('DB_ERROR', '항목 삭제 실패', 500)
  return ok({ deleted: true })
}
