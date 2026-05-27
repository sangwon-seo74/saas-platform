// POST /api/cron/renewal-notifications
// Vercel Cron이 매일 호출 — 만료 D-30/D-14/D-7 갱신에 자동 알림 발송
// Auth: Authorization: Bearer ${CRON_SECRET}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'
import { sendSms, sendKakao, sendEmail } from '@saas/core-client'
import { createHmac } from 'crypto'

const MILESTONE_DAYS = [30, 14, 7] as const

function mintCronJwt(secret: string, tenantId: string): string {
  const now     = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sub: 'cron-renewal-notif',
    aud: 'authenticated',
    iat: now,
    exp: now + 300,
    role: 'authenticated',
    app_metadata: { tenant_id: tenantId, role: 'admin' },
  })).toString('base64url')
  const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

function addDays(base: Date, days: number): string {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

type ContactRow = { id: string; name: string; mobile: string | null; email: string | null; is_primary: boolean }
type CompanyRow = { id: string; name: string; contacts: ContactRow[] }
type RenewalRow = { id: string; company_id: string; company: CompanyRow | null }
type TemplateRow = { id: string; channel: string; content: string; subject: string | null; kakao_template_code: string | null }
type ConfigRow   = { tenant_id: string; days_before: number; template_id: string; template: TemplateRow | null }

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const jwtSecret  = process.env.SUPABASE_JWT_SECRET

  const authHeader = req.headers.get('authorization') ?? ''
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!jwtSecret) {
    return NextResponse.json({ error: 'SUPABASE_JWT_SECRET not configured' }, { status: 503 })
  }

  const supabase = createServiceClient()
  const now      = new Date()
  const todayStart = now.toISOString().slice(0, 10) + 'T00:00:00.000Z'

  const stats = { sent: 0, skipped: 0, failed: 0 }
  const errors: string[] = []

  for (const milestone of MILESTONE_DAYS) {
    const targetDate = addDays(now, milestone)

    // 이 마일스톤의 모든 테넌트 활성 설정 + 템플릿 조회
    const { data: configs, error: cfgErr } = await supabase
      .from('renewal_notification_configs')
      .select('tenant_id, days_before, template_id, template:message_templates!template_id(id, channel, content, subject, kakao_template_code)')
      .eq('days_before', milestone)
      .eq('is_active', true)
      .not('template_id', 'is', null)

    if (cfgErr || !configs?.length) continue

    for (const cfg of configs as unknown as ConfigRow[]) {
      const template = cfg.template
      if (!template) continue

      // 해당 테넌트에서 target_date에 만료되는 갱신 조회
      const { data: renewals } = await supabase
        .from('renewals')
        .select('id, company_id, company:companies!company_id(id, name, contacts(id, name, mobile, email, is_primary))')
        .eq('tenant_id', cfg.tenant_id)
        .eq('end_date', targetDate)
        .neq('status', 'won')
        .neq('status', 'lost')
        .neq('status', 'expired')

      if (!renewals?.length) continue

      const authToken = mintCronJwt(jwtSecret, cfg.tenant_id)

      for (const renewal of renewals as unknown as RenewalRow[]) {
        const company = renewal.company
        if (!company) continue

        const contacts = company.contacts ?? []
        const primary  = contacts.find(c => c.is_primary) ?? contacts[0]
        const to       = template.channel === 'email' ? primary?.email : primary?.mobile
        if (!to) { stats.skipped++; continue }

        // 오늘 이미 동일 템플릿으로 발송했으면 건너뜀 (멱등성)
        const { data: dup } = await supabase
          .from('messages')
          .select('id')
          .eq('tenant_id', cfg.tenant_id)
          .eq('company_id', company.id)
          .eq('template_id', template.id)
          .eq('status', 'sent')
          .gte('sent_at', todayStart)
          .limit(1)
          .maybeSingle()

        if (dup) { stats.skipped++; continue }

        // 메시지 행 생성
        const { data: msgRow } = await supabase
          .from('messages')
          .insert({
            tenant_id:   cfg.tenant_id,
            user_id:     null,
            channel:     template.channel,
            recipient:   template.channel === 'email' ? to : to.replace(/-/g, ''),
            content:     template.content,
            status:      'sending',
            company_id:  company.id,
            contact_id:  primary?.id ?? null,
            template_id: template.id,
          })
          .select('id')
          .single()

        if (!msgRow) { stats.failed++; continue }

        // 발송
        let result: { ok: boolean; error?: { message?: string } | null }
        try {
          if (template.channel === 'kakao') {
            if (!template.kakao_template_code) {
              errors.push(`[D-${milestone}] ${company.name}: 알림톡 템플릿 코드 없음`)
              result = { ok: false }
            } else {
              result = await sendKakao(
                { to_number: to, template_code: template.kakao_template_code, text: template.content },
                authToken,
              )
            }
          } else if (template.channel === 'email') {
            if (!template.subject) {
              errors.push(`[D-${milestone}] ${company.name}: 이메일 제목 없음`)
              result = { ok: false }
            } else {
              result = await sendEmail(
                { to, subject: template.subject, text: template.content },
                authToken,
              )
            }
          } else {
            result = await sendSms({ to_number: to, text: template.content }, authToken)
          }
        } catch (e) {
          errors.push(`[D-${milestone}] ${company.name}: ${String(e)}`)
          result = { ok: false }
        }

        const finalStatus = result.ok ? 'sent' : 'failed'
        await supabase
          .from('messages')
          .update({ status: finalStatus, sent_at: new Date().toISOString() })
          .eq('id', msgRow.id)

        if (result.ok) { stats.sent++ } else { stats.failed++ }
      }
    }
  }

  return NextResponse.json({ ok: true, ...stats, errors: errors.slice(0, 20) })
}
