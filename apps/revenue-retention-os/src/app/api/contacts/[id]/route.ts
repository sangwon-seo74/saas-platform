// PATCH /api/contacts/[id] — 담당자 수정
// DELETE /api/contacts/[id] — 담당자 삭제

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const PATCH = withAuth(async (req, ctx, params) => {
  const { id } = params
  if (!id) return err('VALIDATION', 'ID가 필요합니다')

  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const { name, title, department, phone, mobile, email, is_primary, is_decision_maker } = body

  if (!name?.trim()) return err('VALIDATION', '이름은 필수입니다')

  const { data, error } = await supabase
    .from('contacts')
    .update({
      name:              name.trim(),
      title:             title?.trim()      || null,
      department:        department?.trim() || null,
      phone:             phone?.trim()      || null,
      mobile:            mobile?.trim()     || null,
      email:             email?.trim()      || null,
      is_primary:        is_primary        ?? false,
      is_decision_maker: is_decision_maker ?? false,
    })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data)
})

export const DELETE = withAuth(async (req, ctx, params) => {
  const { id } = params
  if (!id) return err('VALIDATION', 'ID가 필요합니다')
  const { supabase } = createRouteHandlerClient(req)

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)

  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ id })
})
