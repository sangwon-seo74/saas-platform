import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils'

const VisitItemSchema = z.object({
  product_name: z.string().min(1),
  quantity:     z.number().int().positive().default(1),
  memo:         z.string().optional(),
})

const UpdateVisitSchema = z.object({
  status:       z.enum(['planned', 'checked_in', 'completed', 'cancelled']).optional(),
  result:       z.string().optional(),
  check_in_at:  z.string().optional(),
  check_out_at: z.string().optional(),
  lat:          z.number().optional(),
  lng:          z.number().optional(),
  items:        z.array(VisitItemSchema).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const userId   = headersList.get('x-user-id')   ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (!tenantId) return err('UNAUTHORIZED', '인증이 필요합니다', 401)

  const body: unknown = await request.json().catch(() => null)
  const parsed = UpdateVisitSchema.safeParse(body)
  if (!parsed.success) return err('VALIDATION', parsed.error.issues[0]?.message ?? '유효하지 않은 요청', 400)

  const supabase = await createClient()

  const { data: existing } = await supabase
    .schema('lso')
    .from('visits')
    .select('id, rep_user_id, tenant_id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) return err('NOT_FOUND', '방문 기록을 찾을 수 없습니다', 404)
  if (role === 'rep' && existing.rep_user_id !== userId) {
    return err('FORBIDDEN', '본인의 방문 기록만 수정할 수 있습니다', 403)
  }

  const { items, ...visitFields } = parsed.data

  const { data, error } = await supabase
    .schema('lso')
    .from('visits')
    .update({ ...visitFields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status')
    .single()

  if (error) return err('DB_ERROR', '업데이트 실패', 500)

  // planned → checked_in 전환 시 위치 upsert
  if (visitFields.lat !== undefined && visitFields.lng !== undefined) {
    await supabase.schema('lso').from('rep_locations').upsert({
      rep_user_id: existing.rep_user_id,
      tenant_id:   tenantId,
      lat:         visitFields.lat,
      lng:         visitFields.lng,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'rep_user_id' })
  }

  // visit_items 추가 (체크인 시 함께 저장)
  if (items && items.length > 0) {
    const itemRows = items.map(item => ({
      visit_id:     id,
      product_name: item.product_name,
      quantity:     item.quantity,
      memo:         item.memo ?? null,
    }))
    await supabase.schema('lso').from('visit_items').insert(itemRows)
  }

  return ok(data)
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const userId   = headersList.get('x-user-id')   ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (!tenantId) return err('UNAUTHORIZED', '인증이 필요합니다', 401)

  const supabase = await createClient()
  const { data, error } = await supabase
    .schema('lso')
    .from('visits')
    .select('*, client:clients(*), rep:users(id, name, role)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) return err('NOT_FOUND', '방문 기록을 찾을 수 없습니다', 404)
  if (role === 'rep' && (data as { rep_user_id: string }).rep_user_id !== userId) {
    return err('FORBIDDEN', '접근 권한이 없습니다', 403)
  }
  return ok(data)
}
