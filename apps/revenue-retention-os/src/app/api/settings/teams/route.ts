// GET  /api/settings/teams — 자기 테넌트 팀 목록 (member_count, manager_name 포함)
// POST /api/settings/teams — 신규 팀 생성

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createServiceClient } from '@/lib/supabase/client'

/** 팀 목록 + 각 팀의 사용자 수와 첫 매니저 이름. */
export const GET = withAuth(async (_req, ctx) => {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, created_at, users!team_id(id, name, role)')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: true })
  if (error) return err('DB_ERROR', error.message, 500)

  type Row = { id: string; name: string; created_at: string; users: { id: string; name: string; role: string }[] }
  const rows = ((data ?? []) as unknown as Row[]).map(t => {
    const manager = t.users?.find(u => u.role === 'manager') ?? null
    return {
      id:           t.id,
      name:         t.name,
      created_at:   t.created_at,
      member_count: t.users?.length ?? 0,
      manager_name: manager?.name ?? null,
    }
  })
  return ok(rows)
}, { roles: ['admin', 'manager'] })

/** 신규 팀 생성. 이름만 필수. */
export const POST = withAuth(async (req, ctx) => {
  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body?.name?.trim()) return err('VALIDATION', '팀명은 필수입니다')

  const { data, error } = await supabase.from('teams')
    .insert({ tenant_id: ctx.tenantId, name: body.name.trim() })
    .select('id').single()
  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ id: (data as { id: string }).id })
}, { roles: ['admin'] })
