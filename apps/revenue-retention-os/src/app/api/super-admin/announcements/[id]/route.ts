// PATCH  /api/super-admin/announcements/[id] — 수정 / 활성 토글
// DELETE /api/super-admin/announcements/[id] — 삭제

import { ok, err } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'
import { requireId } from '@/lib/api'

const VALID_TYPES = ['notice', 'maintenance', 'update']

/** 공지/점검 수정.
 *  전달된 필드만 부분 업데이트(type/title/content/starts_at/ends_at/is_active).
 *  is_active 단독 호출로 게시중↔종료 토글에도 사용된다. */
export const PATCH = withSuperAdmin(async (req, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { type, title, content, starts_at, ends_at, is_active } = body
  const updateData: Record<string, unknown> = {}

  if (type !== undefined) {
    if (!VALID_TYPES.includes(type)) return err('VALIDATION', `type은 ${VALID_TYPES.join(', ')} 중 하나여야 합니다`)
    updateData.type = type
  }
  if (title     !== undefined) updateData.title     = title
  if (content   !== undefined) updateData.content   = content
  if (starts_at !== undefined) updateData.starts_at = starts_at
  if (ends_at   !== undefined) updateData.ends_at   = ends_at || null
  if (is_active !== undefined) updateData.is_active = Boolean(is_active)

  if (Object.keys(updateData).length === 0) return err('VALIDATION', '수정할 필드가 없습니다')

  const { error } = await supabase.from('announcements').update(updateData).eq('id', params.id)
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ id: params.id })
})

/** 공지/점검 삭제. */
export const DELETE = withSuperAdmin(async (_req, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  const { error } = await supabase.from('announcements').delete().eq('id', params.id)
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ id: params.id })
})
