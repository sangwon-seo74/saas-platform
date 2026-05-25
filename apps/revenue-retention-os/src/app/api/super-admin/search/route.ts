// GET /api/super-admin/search?q=...
// 글로벌 검색 — 테넌트(이름/사업자번호), 사용자(이름/이메일), 인보이스(번호)에서 상위 10건씩 매칭

import { ok, err } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'

/** Cmd+K 빠른 검색용. q가 짧으면(<2자) 빈 결과 반환. */
export const GET = withSuperAdmin(async (req) => {
  const supabase = createServiceClient()
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return ok({ tenants: [], users: [], invoices: [] })

  const [tenantsR, usersR, invoicesR] = await Promise.all([
    supabase.from('tenants').select('id, name, biz_no').or(`name.ilike.%${q}%,biz_no.ilike.%${q}%`).limit(10),
    supabase.from('users').select('id, name, email, tenant_id').or(`name.ilike.%${q}%,email.ilike.%${q}%`).limit(10),
    supabase.from('tenant_invoices').select('id, invoice_no, tenant_id').ilike('invoice_no', `%${q}%`).limit(10),
  ])

  if (tenantsR.error || usersR.error || invoicesR.error) {
    return err('DB_ERROR', tenantsR.error?.message ?? usersR.error?.message ?? invoicesR.error?.message ?? '검색 실패', 500)
  }

  return ok({
    tenants:  tenantsR.data  ?? [],
    users:    usersR.data    ?? [],
    invoices: invoicesR.data ?? [],
  })
})
