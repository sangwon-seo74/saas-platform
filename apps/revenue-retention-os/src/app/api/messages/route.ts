// GET /api/messages  — 발송 메시지 이력 목록
// POST /api/messages — SMS 발송 (Solapi via core-api)

import { ok, err } from '@/lib/utils'
import { withAuth, parsePagination } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import { sendSms } from '@saas/core-client'

export const GET = withAuth(async (req, ctx) => {
  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const { supabase } = createRouteHandlerClient(req)

  const channel    = searchParams.get('channel')
  const status     = searchParams.get('status')
  const company_id = searchParams.get('company_id')
  const date_from  = searchParams.get('date_from')
  const date_to    = searchParams.get('date_to')

  let query = supabase
    .from('messages')
    .select(`
      id, channel, recipient, content, status, sent_at, read_at, template_id,
      company:companies!company_id(id, name),
      contact:contacts!contact_id(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (ctx.role === 'sales') query = query.eq('user_id', ctx.userId)
  if (channel)    query = query.eq('channel', channel)
  if (status)     query = query.eq('status', status)
  if (company_id) query = query.eq('company_id', company_id)
  if (date_from)  query = query.gte('sent_at', date_from)
  if (date_to)    query = query.lte('sent_at', date_to + 'T23:59:59')

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ data: data ?? [], count: count ?? 0, page, limit })
})

// POST /api/messages — SMS 발송 (Solapi via core-api adapter)
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const { to, text, company_id, contact_id, template_id } = body as {
    to: string
    text: string
    company_id?: string
    contact_id?: string
    template_id?: string
  }

  if (!to?.trim()) return err('INVALID_INPUT', '수신번호(to)가 필요합니다', 400)
  if (!text?.trim()) return err('INVALID_INPUT', '메시지 내용(text)이 필요합니다', 400)

  const { supabase, authClient } = createRouteHandlerClient(req)

  // Solapi 연동 설정 조회 (테넌트별)
  const { data: integration, error: intErr } = await supabase
    .from('api_integrations')
    .select('config, is_active')
    .eq('tenant_id', ctx.tenantId)
    .eq('provider', 'sms')
    .single()

  if (intErr || !integration) return err('NOT_CONFIGURED', 'SMS 연동이 설정되지 않았습니다', 422)
  if (!integration.is_active) return err('NOT_CONFIGURED', 'SMS 연동이 비활성화 상태입니다', 422)

  const cfg = integration.config as Record<string, string>
  const api_key      = cfg.api_key
  const api_secret   = cfg.api_secret
  const sender_phone = cfg.sender_phone

  if (!api_key || !api_secret || !sender_phone) {
    return err('NOT_CONFIGURED', 'SMS 연동 설정이 불완전합니다 (api_key/api_secret/sender_phone 확인)', 422)
  }

  // messages 행 삽입 (status=sending)
  const { data: msgRow, error: insertErr } = await supabase
    .from('messages')
    .insert({
      tenant_id:   ctx.tenantId,
      user_id:     ctx.userId,
      channel:     'sms',
      recipient:   to.replace(/-/g, ''),
      content:     text,
      status:      'sending',
      company_id:  company_id ?? null,
      contact_id:  contact_id ?? null,
      template_id: template_id ?? null,
    })
    .select('id')
    .single()

  if (insertErr || !msgRow) return err('DB_ERROR', insertErr?.message ?? '메시지 저장 실패', 500)

  // core-api 통해 Solapi 발송 (자격증명을 body로 전달 — 어댑터 패턴)
  const { data: { session } } = await authClient.auth.getSession()
  const authToken = session?.access_token ?? ''

  const smsResult = await sendSms(
    { api_key, api_secret, from_number: sender_phone, to_number: to, text },
    authToken,
  )

  const finalStatus = smsResult.ok ? 'sent' : 'failed'
  await supabase
    .from('messages')
    .update({ status: finalStatus, sent_at: new Date().toISOString() })
    .eq('id', msgRow.id)

  if (!smsResult.ok) {
    return err('SEND_FAILED', smsResult.error?.message ?? 'SMS 발송 실패', 502)
  }

  return ok({ id: msgRow.id, status: finalStatus })
})
