// GET  /api/super-admin/announcements — 공지/점검 목록
// POST /api/super-admin/announcements — 공지/점검 생성

import { ok, err } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'

const VALID_TYPES = ['notice', 'maintenance', 'update']

/** 공지/점검 목록 조회.
 *  active=true 쿼리 파라미터를 주면 현재 시점 기준 게시 중인 항목만 반환한다.
 *  정렬은 starts_at 내림차순(최근 게시 우선). */
export const GET = withSuperAdmin(async (req) => {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const onlyActive = searchParams.get('active') === 'true'

  let query = supabase
    .from('announcements')
    .select('*')
    .order('starts_at', { ascending: false })
    .limit(100)

  if (onlyActive) {
    const now = new Date().toISOString()
    query = query
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
  }

  const { data, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data ?? [])
})

/** 공지/점검 신규 등록.
 *  type/title/content/starts_at은 필수. ends_at은 선택(무기한이면 null). */
export const POST = withSuperAdmin(async (req) => {
  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { type, title, content, starts_at, ends_at, is_active } = body

  if (!VALID_TYPES.includes(type)) return err('VALIDATION', `type은 ${VALID_TYPES.join(', ')} 중 하나여야 합니다`)
  if (!title?.trim())              return err('VALIDATION', '제목은 필수입니다')
  if (!content?.trim())            return err('VALIDATION', '내용은 필수입니다')
  if (!starts_at)                  return err('VALIDATION', '게시 시작일시는 필수입니다')

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      type, title: title.trim(), content: content.trim(),
      starts_at, ends_at: ends_at || null,
      is_active: is_active !== false,
    })
    .select('id')
    .single()
  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ id: (data as { id: string }).id })
})
