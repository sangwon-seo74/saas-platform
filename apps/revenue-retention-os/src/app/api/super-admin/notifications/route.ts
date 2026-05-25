// GET /api/super-admin/notifications — 슈퍼어드민 알림 모음
// 미납 인보이스, 만료 임박 구독, 결제 실패, 최근 로그인 실패 등 즉각 조치가 필요한 항목 집계

import { ok } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'

/** 운영자 즉각 조치가 필요한 알림 5종을 한 번에 반환.
 *  - 미납/실패 인보이스, 7일 내 만료, 최근 24시간 로그인 실패 다수, 비활성 직전 테넌트 */
export const GET = withSuperAdmin(async () => {
  const supabase   = createServiceClient()
  const now        = new Date()
  const sevenDays  = new Date(now.getTime() + 7 * 86400000).toISOString()
  const yesterday  = new Date(now.getTime() - 86400000).toISOString()

  const [
    { count: unpaidCount },
    { count: failedCount },
    { count: expiringCount },
    { count: recentFailedLogins },
  ] = await Promise.all([
    supabase.from('tenant_invoices').select('*', { count: 'exact', head: true })
      .in('status', ['pending']),
    supabase.from('tenant_invoices').select('*', { count: 'exact', head: true })
      .eq('status', 'failed'),
    supabase.from('tenant_subscriptions').select('*', { count: 'exact', head: true })
      .eq('status', 'active').gte('expires_at', now.toISOString()).lte('expires_at', sevenDays),
    supabase.from('audit_logs').select('*', { count: 'exact', head: true })
      .eq('action', 'login').eq('result', 'fail').gte('created_at', yesterday),
  ])

  const items = [
    { type: 'failed_invoice',    count: failedCount        ?? 0, label: '결제 실패 인보이스', href: '/super-admin/invoices?status=failed',         severity: 'critical' },
    { type: 'pending_invoice',   count: unpaidCount        ?? 0, label: '결제 대기 인보이스', href: '/super-admin/invoices?status=pending',        severity: 'warning'  },
    { type: 'expiring_sub',      count: expiringCount      ?? 0, label: '7일 내 만료 구독',   href: '/super-admin/subscriptions',                   severity: 'warning'  },
    { type: 'failed_logins_24h', count: recentFailedLogins ?? 0, label: '24h 로그인 실패',   href: '/super-admin/system/logs?action=login&result=fail', severity: 'info' },
  ].filter(i => i.count > 0)

  return ok(items)
})
