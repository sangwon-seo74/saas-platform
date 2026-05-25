// GET  /api/super-admin/tenants/[id]/notes — 메모 목록
// POST /api/super-admin/tenants/[id]/notes — 메모 추가

import { ok, err } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createServiceClient, createRouteHandlerClient } from '@/lib/supabase/client'
import { requireId } from '@/lib/api'

/** 테넌트의 운영 메모 목록을 최신순으로 반환. */
export const GET = withSuperAdmin(async (_req, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('tenant_notes')
    .select('*')
    .eq('tenant_id', params.id)
    .order('created_at', { ascending: false })
  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data ?? [])
})

/** 새 운영 메모 추가. 작성자 이메일은 현재 로그인한 슈퍼어드민의 세션에서 추출. */
export const POST = withSuperAdmin(async (req, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { content } = body
  if (!content?.trim()) return err('VALIDATION', '내용은 필수입니다')

  const { authClient } = createRouteHandlerClient(req)
  const { data: { user } } = await authClient.auth.getUser()

  const { data, error } = await supabase.from('tenant_notes').insert({
    tenant_id:        params.id,
    content:          content.trim(),
    created_by_email: user?.email ?? null,
  }).select('id').single()
  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ id: (data as { id: string }).id })
})
