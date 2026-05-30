// GET /api/settings/usage — 테넌트 사용량 통계

import { withAuth } from '@/lib/api'
import { ok } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)
  const tid = ctx.tenantId

  const [contactsRes, companiesRes, cardsRes, activitiesRes] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
    supabase.from('business_cards').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
    supabase.from('activities').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
  ])

  return ok({
    contacts:      contactsRes.count   ?? 0,
    companies:     companiesRes.count  ?? 0,
    business_cards: cardsRes.count     ?? 0,
    activities:    activitiesRes.count ?? 0,
  })
})
