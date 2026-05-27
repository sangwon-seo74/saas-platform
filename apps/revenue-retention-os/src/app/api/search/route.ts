// GET /api/search?q=<query>&limit=<n>
// 고객사·갱신·계약·담당자를 통합 검색한다. 최소 2글자 이상.

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

type SearchHit = {
  type: 'company' | 'renewal' | 'contract' | 'contact'
  id: string
  title: string
  sub: string | null
  href: string
}

export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url)
  const q     = (searchParams.get('q') ?? '').trim()
  const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit') ?? 5)))

  if (q.length < 2) return ok([])

  const { supabase } = createRouteHandlerClient(req)
  const pattern      = `%${q}%`
  const hits: SearchHit[] = []

  // ── 고객사 ──────────────────────────────────────────────
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, industry, biz_no')
    .eq('tenant_id', ctx.tenantId)
    .or(`name.ilike.${pattern},biz_no.ilike.${pattern}`)
    .limit(limit)

  for (const c of companies ?? []) {
    hits.push({
      type:  'company',
      id:    c.id,
      title: c.name,
      sub:   [c.industry, c.biz_no].filter(Boolean).join(' · ') || null,
      href:  `/app/companies/${c.id}`,
    })
  }

  // ── 담당자 ──────────────────────────────────────────────
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, title, mobile, email, company:companies!company_id(id, name)')
    .eq('tenant_id', ctx.tenantId)
    .or(`name.ilike.${pattern},email.ilike.${pattern},mobile.ilike.${pattern}`)
    .limit(limit)

  for (const ct of (contacts ?? []) as unknown as {
    id: string; name: string; title: string | null
    mobile: string | null; email: string | null
    company: { id: string; name: string } | null
  }[]) {
    hits.push({
      type:  'contact',
      id:    ct.id,
      title: ct.name,
      sub:   [ct.title, ct.company?.name].filter(Boolean).join(' · ') || null,
      href:  ct.company ? `/app/companies/${ct.company.id}` : '#',
    })
  }

  // ── 계약 ──────────────────────────────────────────────
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, contract_no, company:companies!company_id(id, name), product:products!product_id(id, name)')
    .eq('tenant_id', ctx.tenantId)
    .or(`contract_no.ilike.${pattern}`)
    .limit(limit)

  // contract_no가 없으면 company name으로도 검색
  const { data: contractsByCompany } = await supabase
    .from('contracts')
    .select('id, contract_no, company:companies!company_id(id, name), product:products!product_id(id, name)')
    .eq('tenant_id', ctx.tenantId)
    .limit(limit)

  const allContracts = [
    ...(contracts ?? []),
    ...(contractsByCompany ?? []),
  ]
  const seenContractIds = new Set<string>()

  for (const c of allContracts as unknown as {
    id: string; contract_no: string | null
    company: { id: string; name: string } | null
    product: { id: string; name: string } | null
  }[]) {
    if (seenContractIds.has(c.id)) continue
    const companyName = c.company?.name ?? ''
    if (
      (c.contract_no && c.contract_no.toLowerCase().includes(q.toLowerCase())) ||
      companyName.toLowerCase().includes(q.toLowerCase())
    ) {
      seenContractIds.add(c.id)
      hits.push({
        type:  'contract',
        id:    c.id,
        title: c.contract_no ?? `계약 (${companyName})`,
        sub:   [companyName, c.product?.name].filter(Boolean).join(' · ') || null,
        href:  `/app/contracts/${c.id}`,
      })
    }
  }

  // ── 갱신 ──────────────────────────────────────────────
  const { data: renewals } = await supabase
    .from('renewals')
    .select('id, status, contract_expires_at, company:companies!company_id(id, name)')
    .eq('tenant_id', ctx.tenantId)
    .limit(limit * 3)

  for (const r of (renewals ?? []) as unknown as {
    id: string; status: string; contract_expires_at: string
    company: { id: string; name: string } | null
  }[]) {
    const companyName = r.company?.name ?? ''
    if (companyName.toLowerCase().includes(q.toLowerCase())) {
      hits.push({
        type:  'renewal',
        id:    r.id,
        title: companyName,
        sub:   `갱신 · 만료 ${r.contract_expires_at?.slice(0, 10) ?? ''}`,
        href:  `/app/renewals/${r.id}`,
      })
    }
  }

  // 중복 제거 (같은 href), 타입별로 정렬
  const seen = new Set<string>()
  const TYPE_ORDER: SearchHit['type'][] = ['company', 'contact', 'contract', 'renewal']
  const deduplicated = hits
    .filter(h => { if (seen.has(h.href)) return false; seen.add(h.href); return true })
    .sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type))
    .slice(0, 20)

  return ok(deduplicated)
})
