// GET /api/reports/years — 데이터 기반 사용 가능한 연도 목록

import { ok } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)

  // 완료된 갱신(won/lost) 기준으로만 연도 산출
  const [{ data: minData }, { data: maxData }] = await Promise.all([
    supabase.from('renewals').select('contract_expires_at')
      .eq('tenant_id', ctx.tenantId)
      .in('status', ['won', 'lost'])
      .order('contract_expires_at', { ascending: true }).limit(1),
    supabase.from('renewals').select('contract_expires_at')
      .eq('tenant_id', ctx.tenantId)
      .in('status', ['won', 'lost'])
      .order('contract_expires_at', { ascending: false }).limit(1),
  ])

  const currentYear = new Date().getFullYear()

  const years: number[] = []
  if (!minData?.[0]) {
    // 데이터 없으면 현재 연도 하나만 반환
    years.push(currentYear)
  } else {
    const minYear = new Date(minData[0].contract_expires_at as string).getFullYear()
    const maxYear = maxData?.[0]
      ? new Date(maxData[0].contract_expires_at as string).getFullYear()
      : minYear
    for (let y = minYear; y <= maxYear; y++) years.push(y)
  }

  return ok({ years })
}, { roles: ['admin', 'manager'] })
