import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ok, err } from '@/lib/utils'

export async function GET() {
  const headersList = await headers()
  const userId   = headersList.get('x-user-id')   ?? ''
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? ''

  if (!userId) return err('UNAUTHORIZED', '인증이 필요합니다', 401)

  const supabase = await createClient()
  const { data, error } = await supabase
    .schema('public')
    .from('users')
    .select('id, name, email, role, tenant_id, is_active')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) return err('NOT_FOUND', '사용자를 찾을 수 없습니다', 404)

  return ok({ ...data, role: role || data.role })
}
