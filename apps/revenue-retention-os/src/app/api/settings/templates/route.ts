// GET  /api/settings/templates  — 템플릿 목록
// POST /api/settings/templates  — 템플릿 생성

import { ok, err } from '@/lib/utils'
import { withAuth, parsePagination } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import type { MessageChannel } from '@/types/domain'

const ALLOWED_VARS = [
  'company_name', 'contact_name', 'expires_at', 'contract_no',
  'product_name', 'final_amount', 'assigned_user_name',
  'days_left', 'tenant_name',
]

function extractVars(content: string): string[] {
  return [...content.matchAll(/\{(\w+)\}/g)]
    .map(m => m[1])
    .filter(v => ALLOWED_VARS.includes(v))
}

export const GET = withAuth(async (req, ctx) => {
  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const { supabase } = createRouteHandlerClient(req)

  const channel  = searchParams.get('channel') as MessageChannel | null
  const category = searchParams.get('category')
  const active   = searchParams.get('active')

  let query = supabase
    .from('message_templates')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (channel)  query = query.eq('channel', channel)
  if (category) query = query.eq('category', category)
  if (active)   query = query.eq('is_active', active === 'true')

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ data: data ?? [], count: count ?? 0, page, limit })
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const { name, channel, category, subject, content } = body

  if (!name?.trim())    return err('VALIDATION', '템플릿명은 필수입니다')
  if (!content?.trim()) return err('VALIDATION', '내용은 필수입니다')

  const VALID_CHANNELS: MessageChannel[] = ['email', 'sms', 'kakao']
  if (!VALID_CHANNELS.includes(channel)) {
    return err('VALIDATION', `channel은 ${VALID_CHANNELS.join(', ')} 중 하나여야 합니다`)
  }
  if (channel === 'email' && !subject?.trim()) {
    return err('VALIDATION', '이메일 템플릿은 제목이 필요합니다')
  }

  const { data, error } = await supabase
    .from('message_templates')
    .insert({
      tenant_id: ctx.tenantId,
      name:      name.trim(),
      channel,
      category:  category  ?? null,
      subject:   subject?.trim() ?? null,
      content:   content.trim(),
      variables: extractVars(content),
      is_active: true,
    })
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data)
}, { roles: ['admin'] })
