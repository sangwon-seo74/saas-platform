// GET /api/business-cards?contact_id=... — 특정 담당자의 명함 조회

import { withAuth } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)
  const contactId = new URL(req.url).searchParams.get('contact_id')
  if (!contactId) return err('VALIDATION', 'contact_id가 필요합니다', 400)

  const { data, error } = await supabase
    .from('business_cards')
    .select('id, front_image_url, back_image_url, thumbnail_url, recognized_data, recognition_status, created_at')
    .eq('contact_id', contactId)
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') return err('DB_ERROR', error.message, 500)
  return ok(data ?? null)
})
