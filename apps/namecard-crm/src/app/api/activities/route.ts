// GET  /api/activities?contact_id=
// POST /api/activities

import { withAuth, parsePagination, isValidUUID } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

const VALID_TYPES = ['memo', 'call', 'visit', 'consultation'] as const

export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contact_id') ?? ''
  const { limit, offset } = parsePagination(req.url)

  if (contactId && !isValidUUID(contactId)) return err('INVALID_ID', '유효하지 않은 contact_id입니다')

  const { supabase } = createRouteHandlerClient(req)
  let query = supabase
    .from('activities')
    .select('*, creator:users!created_by(name)', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (contactId) query = query.eq('contact_id', contactId)

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message)
  return ok({ data: data ?? [], total: count ?? 0 })
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { contact_id, type, content } = body as { contact_id?: string; type?: string; content?: string }

  if (!contact_id || !isValidUUID(contact_id)) return err('VALIDATION', 'contact_id가 필요합니다')
  if (!type || !VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    return err('VALIDATION', `type은 ${VALID_TYPES.join('|')} 중 하나여야 합니다`)
  }

  const { supabase } = createRouteHandlerClient(req)
  const { data, error } = await supabase
    .from('activities')
    .insert({
      tenant_id:  ctx.tenantId,
      contact_id,
      type,
      content:    content ?? null,
      created_by: ctx.userId,
    })
    .select('id')
    .single()

  if (error) return err('DB_ERROR', error.message)
  return ok(data)
})
