// GET /api/announcements/active — 현재 게시 중인 공지 (공개, 인증 불필요)
// 일반 사용자의 앱 상단 배너에 노출하기 위한 readonly 엔드포인트

import { ok, err } from '@/lib/utils'
import { createServiceClient } from '@/lib/supabase/client'

/** 현재 시점 기준 게시 중인 공지/점검만 반환.
 *  is_active=true AND starts_at <= now AND (ends_at IS NULL OR ends_at >= now). */
export async function GET() {
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('announcements')
    .select('id, type, title, content, starts_at, ends_at')
    .eq('is_active', true)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('starts_at', { ascending: false })
    .limit(5)
  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data ?? [])
}
