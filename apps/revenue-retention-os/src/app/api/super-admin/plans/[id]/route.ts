// PATCH /api/super-admin/plans/[id] — 플랜 가격/제한 수정

import { ok, err } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'
import { requireId } from '@/lib/api'

/** 플랜 가격/제한 수정.
 *  monthly_price/yearly_price는 Number로 변환, max_users/companies/messages는 빈 값일 때 null(무제한)로 저장.
 *  변경된 가격은 신규 구독자부터 적용되며 기존 구독자에게는 영향을 주지 않는다. */
export const PATCH = withSuperAdmin(async (req, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { monthly_price, yearly_price, max_users, max_companies, max_messages, is_active } = body
  const updateData: Record<string, unknown> = {}

  if (monthly_price  !== undefined) updateData.monthly_price  = Number(monthly_price)
  if (yearly_price   !== undefined) updateData.yearly_price   = Number(yearly_price)
  if (max_users      !== undefined) updateData.max_users      = max_users !== null && max_users !== '' ? Number(max_users) : null
  if (max_companies  !== undefined) updateData.max_companies  = max_companies !== null && max_companies !== '' ? Number(max_companies) : null
  if (max_messages   !== undefined) updateData.max_messages   = max_messages !== null && max_messages !== '' ? Number(max_messages) : null
  if (is_active      !== undefined) updateData.is_active      = Boolean(is_active)

  if (Object.keys(updateData).length === 0) return err('VALIDATION', '수정할 필드가 없습니다')

  const { error } = await supabase.from('plans').update(updateData).eq('id', params.id)
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ id: params.id })
})
