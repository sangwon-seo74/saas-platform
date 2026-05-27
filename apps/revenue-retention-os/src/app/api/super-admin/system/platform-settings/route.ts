// GET  /api/super-admin/system/platform-settings — 플랫폼 설정 조회
// PATCH /api/super-admin/system/platform-settings — 플랫폼 설정 저장

import { ok, err } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import { getPlatformSettings, updatePlatformSettings } from '@saas/core-client'

export const GET = withSuperAdmin(async (req) => {
  const { authClient } = createRouteHandlerClient(req)
  const { data: { session } } = await authClient.auth.getSession()
  const authToken = session?.access_token ?? ''

  const result = await getPlatformSettings(authToken)
  if (!result.ok) return err('FETCH_FAILED', result.error?.message ?? '설정 조회 실패', 502)
  return ok(result.data)
})

export const PATCH = withSuperAdmin(async (req) => {
  const body = await req.json()
  const { settings } = body as { settings: Record<string, string> }
  if (!settings || typeof settings !== 'object') {
    return err('INVALID_INPUT', 'settings 객체가 필요합니다', 400)
  }

  const { authClient } = createRouteHandlerClient(req)
  const { data: { session } } = await authClient.auth.getSession()
  const authToken = session?.access_token ?? ''

  const result = await updatePlatformSettings(settings, authToken)
  if (!result.ok) return err('UPDATE_FAILED', result.error?.message ?? '설정 저장 실패', 502)
  return ok({ ok: true })
})
