import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api'
import { ok } from '@/lib/utils'
import { getDashboardSummary, getRenewals, getTasks, getActivities } from '@/lib/supabase/queries'

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const [summary, renewals, tasks, activities] = await Promise.all([
    getDashboardSummary({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role }),
    getRenewals({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role, daysFrom: 0, daysTo: 30, limit: 5 }),
    getTasks({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role, mine: true, limit: 5 }),
    getActivities({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role, limit: 5 }),
  ])

  return ok({
    summary,
    urgentRenewals: renewals.data,
    todayTasks: tasks.data,
    recentActivities: activities.data,
  })
})
