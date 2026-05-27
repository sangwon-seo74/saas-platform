// GET /api/export/companies — 고객사 전체 CSV 다운로드 (admin/manager)

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

  const { data, error } = await supabase
    .from('companies')
    .select(`
      name, biz_no, industry, company_size, status, grade, renewal_risk,
      website, address_road, address_detail, memo, created_at,
      assigned_user:users!assigned_user_id(name),
      team:teams!team_id(name)
    `)
    .eq('tenant_id', ctx.tenantId)
    .order('name', { ascending: true })

  if (error) return err('DB_ERROR', error.message, 500)

  const STATUS_KO: Record<string, string> = {
    prospect: '발굴', active: '계약', dormant: '미접촉', churned: '해지',
  }
  const RISK_KO: Record<string, string> = { high: '위험', medium: '주의', low: '안전' }

  const header = row(['고객사명', '사업자번호', '업종', '규모', '상태', '등급', '갱신위험', '웹사이트', '주소', '주소(상세)', '담당자', '팀', '메모', '등록일'])
  const lines  = (data ?? []).map(c => row([
    c.name,
    c.biz_no,
    c.industry,
    c.company_size,
    STATUS_KO[c.status] ?? c.status,
    c.grade,
    c.renewal_risk ? RISK_KO[c.renewal_risk] ?? c.renewal_risk : '',
    c.website,
    c.address_road,
    c.address_detail,
    (c.assigned_user as unknown as { name: string } | null)?.name ?? '',
    (c.team         as unknown as { name: string } | null)?.name ?? '',
    c.memo,
    c.created_at ? c.created_at.slice(0, 10) : '',
  ]))

  const csv = [header, ...lines].join('\r\n')
  const bom = '﻿'   // UTF-8 BOM — Excel이 한글을 정상 인식

  return new Response(bom + csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="companies_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}, { roles: ['admin', 'manager'] })
