// GET /api/export/contacts — CSV 내보내기

import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)
  const { data } = await supabase
    .from('contacts')
    .select('name, title, department, mobile, email, fax, notes, is_vip, last_contacted_at, created_at, company:companies!company_id(name, address, website, main_phone)')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })

  const rows = data ?? []
  const headers = ['이름', '직책', '부서', '휴대폰', '이메일', '팩스', '회사명', '회사주소', '홈페이지', '대표번호', 'VIP', '최근연락', '등록일', '메모']
  const csvRows = [
    headers.join(','),
    ...rows.map(r => {
      const co = Array.isArray(r.company)
        ? (r.company[0] as { name?: string; address?: string; website?: string; main_phone?: string } | undefined)
        : (r.company as { name?: string; address?: string; website?: string; main_phone?: string } | null)
      return [
        csvCell(r.name as string), csvCell(r.title as string | null), csvCell(r.department as string | null),
        csvCell(r.mobile as string | null), csvCell(r.email as string | null), csvCell(r.fax as string | null),
        csvCell(co?.name), csvCell(co?.address), csvCell(co?.website), csvCell(co?.main_phone),
        (r.is_vip as boolean) ? 'Y' : '',
        r.last_contacted_at ? (r.last_contacted_at as string).slice(0, 10) : '',
        (r.created_at as string).slice(0, 10),
        csvCell(r.notes as string | null),
      ].join(',')
    })
  ]

  const bom = '﻿'
  const csv = bom + csvRows.join('\r\n')
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contacts_${date}.csv"`,
    },
  })
})

function csvCell(val: string | null | undefined): string {
  if (!val) return ''
  const s = String(val).replace(/"/g, '""')
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
}
