import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils'

const CreateClientSchema = z.object({
  name:           z.string().min(1),
  client_type:    z.enum(['restaurant', 'bar', 'wholesale', 'retail', 'other']).default('other'),
  biz_no:         z.string().optional(),
  owner_name:     z.string().optional(),
  phone:          z.string().optional(),
  mobile:         z.string().optional(),
  address:        z.string().optional(),
  address_detail: z.string().optional(),
  lat:            z.number().optional(),
  lng:            z.number().optional(),
  region:         z.string().optional(),
  notes:          z.string().optional(),
})

export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  if (!tenantId) return err('UNAUTHORIZED', '인증이 필요합니다', 401)

  const url = new URL(request.url)
  const q   = url.searchParams.get('q')
  const type = url.searchParams.get('type')

  const supabase = await createClient()
  let query = supabase
    .schema('lso')
    .from('clients')
    .select('id, name, client_type, phone, address, region, status, last_visited_at, lat, lng')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('name')
    .limit(100)

  if (q)    query = query.ilike('name', `%${q}%`)
  if (type) query = query.eq('client_type', type)

  const { data, error } = await query
  if (error) return err('DB_ERROR', '조회 실패', 500)
  return ok(data)
}

export async function POST(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (!tenantId) return err('UNAUTHORIZED', '인증이 필요합니다', 401)
  if (role === 'rep') return err('FORBIDDEN', '관리자만 거래처를 등록할 수 있습니다', 403)

  const body: unknown = await request.json().catch(() => null)
  const parsed = CreateClientSchema.safeParse(body)
  if (!parsed.success) return err('VALIDATION', parsed.error.issues[0]?.message ?? '유효하지 않은 요청', 400)

  const supabase = await createClient()
  const { data, error } = await supabase
    .schema('lso')
    .from('clients')
    .insert({ ...parsed.data, tenant_id: tenantId })
    .select('id, name')
    .single()

  if (error) return err('DB_ERROR', '등록 실패', 500)
  return ok(data)
}
