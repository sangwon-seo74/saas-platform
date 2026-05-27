// GET /api/messages  — 발송 메시지 이력 목록
// POST /api/messages — 메시지 발송 (SMS/카카오 알림톡, Solapi via core-api)

import { ok, err } from '@/lib/utils'
import { withAuth, parsePagination } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import { sendSms, sendKakao, sendEmail } from '@saas/core-client'

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

// POST /api/messages — SMS 또는 카카오 알림톡 발송 (Solapi via core-api adapter)
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const {
    to,
    text,
    channel = 'sms',
    company_id,
    contact_id,
    template_id,
    kakao_template_code,
    email_subject,
    email_html,
  } = body as {
    to: string
    text: string
    channel?: 'sms' | 'kakao' | 'email'
    company_id?: string
    contact_id?: string
    template_id?: string
    kakao_template_code?: string
    email_subject?: string
    email_html?: string
  }

  if (!to?.trim()) return err('INVALID_INPUT', '수신처(to)가 필요합니다', 400)
  if (!text?.trim()) return err('INVALID_INPUT', '메시지 내용(text)이 필요합니다', 400)
  if (channel === 'kakao' && !kakao_template_code?.trim()) {
    return err('INVALID_INPUT', '알림톡 템플릿 코드(kakao_template_code)가 필요합니다', 400)
  }
  if (channel === 'email' && !email_subject?.trim()) {
    return err('INVALID_INPUT', '이메일 제목(email_subject)이 필요합니다', 400)
  }

  const { supabase, authClient } = createRouteHandlerClient(req)

  // 채널별 연동 설정 조회
  let api_key = '', api_secret = '', sender_phone = '', sender_key = ''
  let email_from_name: string | undefined, email_from_email: string | undefined

  if (channel === 'sms' || channel === 'kakao') {
    // SMS와 알림톡 모두 Solapi api_key/secret 공유
    const { data: smsInt, error: smsIntErr } = await supabase
      .from('api_integrations')
      .select('config, is_active')
      .eq('tenant_id', ctx.tenantId)
      .eq('provider', 'sms')
      .single()

    if (smsIntErr || !smsInt) return err('NOT_CONFIGURED', 'SMS(Solapi) 연동이 설정되지 않았습니다', 422)
    if (!smsInt.is_active)    return err('NOT_CONFIGURED', 'SMS(Solapi) 연동이 비활성화 상태입니다', 422)

    const smsCfg = smsInt.config as Record<string, string>
    api_key      = smsCfg.api_key
    api_secret   = smsCfg.api_secret
    sender_phone = smsCfg.sender_phone

    if (!api_key || !api_secret) {
      return err('NOT_CONFIGURED', 'Solapi 연동 설정이 불완전합니다 (api_key/api_secret 확인)', 422)
    }
    if (channel === 'sms' && !sender_phone) {
      return err('NOT_CONFIGURED', 'SMS 발신번호(sender_phone)가 설정되지 않았습니다', 422)
    }
  }

  if (channel === 'kakao') {
    const { data: kakaoInt, error: kakaoIntErr } = await supabase
      .from('api_integrations')
      .select('config, is_active')
      .eq('tenant_id', ctx.tenantId)
      .eq('provider', 'kakao')
      .single()

    if (kakaoIntErr || !kakaoInt) return err('NOT_CONFIGURED', '카카오 알림톡 연동이 설정되지 않았습니다', 422)
    if (!kakaoInt.is_active)      return err('NOT_CONFIGURED', '카카오 알림톡 연동이 비활성화 상태입니다', 422)

    const kakaoCfg = kakaoInt.config as Record<string, string>
    sender_key = kakaoCfg.sender_key
    if (!sender_key) return err('NOT_CONFIGURED', '카카오 발신프로필 키(sender_key)가 설정되지 않았습니다', 422)
  }

  if (channel === 'email') {
    const { data: emailInt, error: emailIntErr } = await supabase
      .from('api_integrations')
      .select('config, is_active')
      .eq('tenant_id', ctx.tenantId)
      .eq('provider', 'email')
      .single()

    if (emailIntErr || !emailInt) return err('NOT_CONFIGURED', '이메일 연동이 설정되지 않았습니다', 422)
    if (!emailInt.is_active)      return err('NOT_CONFIGURED', '이메일 연동이 비활성화 상태입니다', 422)

    const emailCfg     = emailInt.config as Record<string, string>
    email_from_name    = emailCfg.from_name  || undefined
    email_from_email   = emailCfg.from_email || undefined
  }

  // messages 행 삽입 (status=sending)
  const { data: msgRow, error: insertErr } = await supabase
    .from('messages')
    .insert({
      tenant_id:   ctx.tenantId,
      user_id:     ctx.userId,
      channel,
      recipient:   channel === 'email' ? to : to.replace(/-/g, ''),
      content:     email_html ?? text,
      status:      'sending',
      company_id:  company_id ?? null,
      contact_id:  contact_id ?? null,
      template_id: template_id ?? null,
    })
    .select('id')
    .single()

  if (insertErr || !msgRow) return err('DB_ERROR', insertErr?.message ?? '메시지 저장 실패', 500)

  const { data: { session } } = await authClient.auth.getSession()
  const authToken = session?.access_token ?? ''

  let result: { ok: boolean; error?: { message?: string } | null }

  if (channel === 'kakao') {
    result = await sendKakao(
      { api_key, api_secret, sender_key, template_code: kakao_template_code!, to_number: to, text },
      authToken,
    )
  } else if (channel === 'email') {
    result = await sendEmail(
      { to, subject: email_subject!, html: email_html, text, from_name: email_from_name, from_email: email_from_email },
      authToken,
    )
  } else {
    result = await sendSms(
      { api_key, api_secret, from_number: sender_phone, to_number: to, text },
      authToken,
    )
  }

  const finalStatus = result.ok ? 'sent' : 'failed'
  await supabase
    .from('messages')
    .update({ status: finalStatus, sent_at: new Date().toISOString() })
    .eq('id', msgRow.id)

  if (!result.ok) {
    const label = channel === 'kakao' ? '알림톡' : channel === 'email' ? '이메일' : 'SMS'
    return err('SEND_FAILED', result.error?.message ?? `${label} 발송 실패`, 502)
  }

  return ok({ id: msgRow.id, status: finalStatus })
})
