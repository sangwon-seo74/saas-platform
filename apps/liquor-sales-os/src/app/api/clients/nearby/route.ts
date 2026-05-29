import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils'

export async function GET(request: Request) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const userId   = headersList.get('x-user-id')   ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (!tenantId) return err('UNAUTHORIZED', '인증이 필요합니다', 401)

  const url = new URL(request.url)
  const lat = parseFloat(url.searchParams.get('lat') ?? '')
  const lng = parseFloat(url.searchParams.get('lng') ?? '')

  if (isNaN(lat) || isNaN(lng)) return err('VALIDATION', 'lat, lng 파라미터가 필요합니다', 400)

  const supabase = await createClient()

  // rep는 자기 배정 거래처만, admin/manager는 전체
  if (role === 'rep') {
    const { data: assignments } = await supabase
      .schema('lso')
      .from('sales_assignments')
      .select('client_id')
      .eq('tenant_id', tenantId)
      .eq('rep_user_id', userId)
      .eq('is_active', true)

    const clientIds = (assignments ?? []).map((a: { client_id: string }) => a.client_id)
    if (clientIds.length === 0) return ok([])

    const { data } = await supabase
      .schema('lso')
      .from('clients')
      .select('id, name, client_type, address, lat, lng, last_visited_at')
      .in('id', clientIds)
      .eq('status', 'active')

    return ok(data ?? [])
  }

  // 관리자: 반경 ~10km 내 거래처 (위도 ±0.09° ≈ 10km)
  const { data } = await supabase
    .schema('lso')
    .from('clients')
    .select('id, name, client_type, address, lat, lng, last_visited_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .gte('lat', lat - 0.09)
    .lte('lat', lat + 0.09)
    .gte('lng', lng - 0.11)
    .lte('lng', lng + 0.11)
    .limit(50)

  return ok(data ?? [])
}
