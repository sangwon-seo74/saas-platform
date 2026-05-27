// GET /api/export/renewals — 갱신 파이프라인 전체 CSV 다운로드 (admin/manager)

import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import { err } from '@/lib/utils'

function escCsv(v: unknown): string {
  const s = v == null ? '' : String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function row(cols: unknown[]): string {
  return cols.map(escCsv).join(',')
}

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')   // 필터 (optional)

  let query = supabase
    .from('renewals')
    .select(`
      status, risk_level, risk_score, contract_expires_at, target_renewal_at, result, memo,
      company:companies!company_id(name, industry),
      contract:contracts!contract_id(contract_no, final_amount, product:products!product_id(name)),
      assigned_user:users!assigned_user_id(name)
    `)
    .eq('tenant_id', ctx.tenantId)
    .order('contract_expires_at', { ascending: true })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  const STATUS_KO: Record<string, string> = {
    pending: '대기', contacted: '접촉', negotiating: '협의중', won: '완료', lost: '이탈',
  }
  const RISK_KO: Record<string, string>   = { high: '위험', medium: '주의', low: '안전' }
  const RESULT_KO: Record<string, string> = {
    renewed: '재계약', upsell: '업셀', downgrade: '다운셀', churned: '이탈',
  }

  const header = row(['고객사명', '업종', '상태', '위험도', '위험점수', '계약번호', '제품', '계약금액', '만료일', '갱신목표일', '결과', '담당자', '메모'])
  const lines  = (data ?? []).map(r => {
    const company  = r.company  as unknown as { name: string; industry: string | null } | null
    const contract = r.contract as unknown as { contract_no: string | null; final_amount: number; product: { name: string } | null } | null
    const user     = r.assigned_user as unknown as { name: string } | null
    return row([
      company?.name       ?? '',
      company?.industry   ?? '',
      STATUS_KO[r.status] ?? r.status,
      r.risk_level ? RISK_KO[r.risk_level] ?? r.risk_level : '',
      r.risk_score ?? '',
      contract?.contract_no ?? '',
      contract?.product?.name ?? '',
      contract?.final_amount ?? '',
      r.contract_expires_at ? r.contract_expires_at.slice(0, 10) : '',
      r.target_renewal_at   ? r.target_renewal_at.slice(0, 10)   : '',
      r.result ? RESULT_KO[r.result] ?? r.result : '',
      user?.name ?? '',
      r.memo ?? '',
    ])
  })

  const csv = ['﻿', [header, ...lines].join('\r\n')].join('')

  return new Response(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="renewals_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}, { roles: ['admin', 'manager'] })
