import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils'

const VisitItemSchema = z.object({
  product_name: z.string().min(1),
  quantity:     z.number().int().positive().default(1),
  memo:         z.string().optional(),
})

const CreateVisitSchema = z.object({
  client_id:  z.string().uuid(),
  visit_type: z.enum(['sales', 'delivery', 'collection', 'other']).default('sales'),
  purpose:    z.string().optional(),
  result:     z.string().optional(),
  lat:        z.number().optional(),
  lng:        z.number().optional(),
  items:      z.array(VisitItemSchema).optional().default([]),
})

export async function POST(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const userId   = headersList.get('x-user-id')   ?? ''

  if (!tenantId || !userId) return err('UNAUTHORIZED', '인증이 필요합니다', 401)

  const body: unknown = await request.json().catch(() => null)
  const parsed = CreateVisitSchema.safeParse(body)
  if (!parsed.success) return err('VALIDATION', parsed.error.issues[0]?.message ?? '유효하지 않은 요청', 400)

  const { client_id, visit_type, purpose, result, lat, lng, items } = parsed.data
  const supabase = await createClient()

  // 거래처가 같은 테넌트인지 확인
  const { data: client } = await supabase
    .schema('lso')
    .from('clients')
    .select('id, tenant_id')
    .eq('id', client_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) return err('NOT_FOUND', '거래처를 찾을 수 없습니다', 404)

  const { data: visit, error: visitError } = await supabase
    .schema('lso')
    .from('visits')
    .insert({
      tenant_id:    tenantId,
      client_id,
      rep_user_id:  userId,
      status:       'checked_in',
      visit_type,
      purpose:      purpose ?? null,
      result:       result  ?? null,
      check_in_at:  new Date().toISOString(),
      lat:          lat ?? null,
      lng:          lng ?? null,
    })
    .select('id')
    .single()

  if (visitError || !visit) {
    console.error('[visits POST]', visitError)
    return err('DB_ERROR', '방문 기록 저장 실패', 500)
  }

  // 위치 upsert
  if (lat !== undefined && lng !== undefined) {
    await supabase.schema('lso').from('rep_locations').upsert({
      rep_user_id: userId,
      tenant_id:   tenantId,
      lat,
      lng,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'rep_user_id' })
  }

  // 방문 아이템 insert
  if (items.length > 0) {
    const itemRows = items.map(item => ({
      visit_id:     visit.id,
      product_name: item.product_name,
      quantity:     item.quantity,
      memo:         item.memo ?? null,
    }))
    await supabase.schema('lso').from('visit_items').insert(itemRows)
  }

  return ok({ id: visit.id })
}

export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const userId   = headersList.get('x-user-id')   ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (!tenantId) return err('UNAUTHORIZED', '인증이 필요합니다', 401)

  const url    = new URL(request.url)
  const status = url.searchParams.get('status')
  const limit  = parseInt(url.searchParams.get('limit') ?? '50')

  const supabase = await createClient()
  let query = supabase
    .schema('lso')
    .from('visits')
    .select('id, status, visit_type, purpose, result, check_in_at, check_out_at, lat, lng, client:clients(id, name), rep:users(id, name)')
    .eq('tenant_id', tenantId)
    .order('check_in_at', { ascending: false })
    .limit(limit)

  if (role === 'rep') query = query.eq('rep_user_id', userId)
  if (status)        query = query.eq('status', status)

  const { data, error } = await query
  if (error) return err('DB_ERROR', '조회 실패', 500)
  return ok(data)
}
