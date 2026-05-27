// GET  /api/settings/renewal-notifications  — 갱신 자동 알림 설정 조회
// PATCH /api/settings/renewal-notifications — 갱신 자동 알림 설정 저장

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

const MILESTONE_DAYS = [30, 14, 7] as const

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)

  const { data, error } = await supabase
    .from('renewal_notification_configs')
    .select('id, days_before, template_id, is_active, template:message_templates!template_id(id, name, channel, kakao_template_code)')
    .eq('tenant_id', ctx.tenantId)
    .in('days_before', MILESTONE_DAYS)

  if (error) return err('DB_ERROR', error.message, 500)

  // days_before 기준으로 정규화 (없으면 null로)
  const result = MILESTONE_DAYS.map(days => {
    const row = (data ?? []).find(r => r.days_before === days)
    return {
      days_before: days,
      id:          row?.id ?? null,
      template_id: row?.template_id ?? null,
      is_active:   row?.is_active ?? false,
      template:    row?.template ?? null,
    }
  })

  return ok(result)
}, { roles: ['admin'] })

export const PATCH = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.configs)) {
    return err('INVALID_BODY', 'configs 배열이 필요합니다')
  }

  const { supabase } = createRouteHandlerClient(req)

  const rows = (body.configs as { days_before: number; template_id: string | null; is_active: boolean }[])
    .filter(c => MILESTONE_DAYS.includes(c.days_before as typeof MILESTONE_DAYS[number]))
    .map(c => ({
      tenant_id:   ctx.tenantId,
      days_before: c.days_before,
      template_id: c.template_id || null,
      is_active:   !!c.is_active,
      updated_at:  new Date().toISOString(),
    }))

  const { error } = await supabase
    .from('renewal_notification_configs')
    .upsert(rows, { onConflict: 'tenant_id,days_before' })

  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ ok: true })
}, { roles: ['admin'] })
