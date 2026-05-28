// GET /api/dashboard — 대시보드 통계

import { withAuth } from '@/lib/api'
import { ok } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { supabase } = createRouteHandlerClient(req)
  const tid = ctx.tenantId
  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * 86400_000).toISOString()
  const d60 = new Date(now.getTime() - 60 * 86400_000).toISOString()

  const [totalRes, vipRes, nc30Res, nc60Res, recentContactsRes, recentActivitiesRes] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('is_vip', true),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).or(`last_contacted_at.lt.${d30},last_contacted_at.is.null`),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).or(`last_contacted_at.lt.${d60},last_contacted_at.is.null`),
    supabase.from('contacts')
      .select('id, name, title, company:companies!company_id(name), created_at')
      .eq('tenant_id', tid).order('created_at', { ascending: false }).limit(5),
    supabase.from('activities')
      .select('id, type, content, contact:contacts!contact_id(name), created_at')
      .eq('tenant_id', tid).order('created_at', { ascending: false }).limit(5),
  ])

  return ok({
    total_contacts: totalRes.count ?? 0,
    vip_contacts:   vipRes.count  ?? 0,
    no_contact_30:  nc30Res.count ?? 0,
    no_contact_60:  nc60Res.count ?? 0,
    recent_contacts: (recentContactsRes.data ?? []).map(c => ({
      id: c.id as string,
      name: c.name as string,
      title: (c.title ?? null) as string | null,
      company_name: (Array.isArray(c.company) ? (c.company[0] as { name: string } | undefined)?.name : (c.company as { name: string } | null)?.name) ?? null,
      created_at: c.created_at as string,
    })),
    recent_activities: (recentActivitiesRes.data ?? []).map(a => ({
      id: a.id as string,
      type: a.type as string,
      content: (a.content ?? null) as string | null,
      contact_name: (Array.isArray(a.contact) ? (a.contact[0] as { name: string } | undefined)?.name : (a.contact as { name: string } | null)?.name) ?? '—',
      created_at: a.created_at as string,
    })),
  })
})
