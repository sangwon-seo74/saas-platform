// ============================================================
// Revenue Retention OS — DB 쿼리 헬퍼
// Supabase SDK 기반 공통 쿼리 모음
// ============================================================

import { createServerComponentClient } from './server'
import type {
  RiskLevel, RenewalStatus,
} from '@/types/domain'

// ─── 공통 타입 ───────────────────────────────────────────
export interface QueryOptions {
  tenantId: string
  userId?: string
  role?: string
}

// ─── Companies ───────────────────────────────────────────
export async function getCompanies(opts: QueryOptions & {
  status?: string
  risk?: RiskLevel
  q?: string
  page?: number
  limit?: number
}) {
  const supabase = await createServerComponentClient()
  const { tenantId, userId, role, status, risk, q, page = 1, limit = 20 } = opts

  let query = supabase
    .from('companies')
    .select(`
      *,
      assigned_user:users!assigned_user_id(id, name),
      team:teams!team_id(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  // sales: 본인 담당만 (RLS가 처리하지만 명시적 필터 추가)
  if (role === 'sales' && userId) {
    query = query.eq('assigned_user_id', userId)
  }

  if (status)  query = query.eq('status', status)
  if (risk)    query = query.eq('renewal_risk', risk)
  if (q)       query = query.ilike('name', `%${q}%`)

  const { data, count, error } = await query
  if (error) throw error

  return { data: data ?? [], count: count ?? 0, page, limit }
}

export async function getCompany(id: string, tenantId: string) {
  const supabase = await createServerComponentClient()

  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      assigned_user:users!assigned_user_id(id, name),
      team:teams!team_id(id, name),
      contacts(*),
      contracts(
        *,
        product:products!product_id(id, name)
      )
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) throw error
  return data
}

// ─── Renewals ────────────────────────────────────────────
export async function getRenewals(opts: QueryOptions & {
  status?: RenewalStatus
  risk?: RiskLevel
  daysFrom?: number
  daysTo?: number
  page?: number
  limit?: number
}) {
  const supabase = await createServerComponentClient()
  const { tenantId, userId, role, status, risk, daysFrom = 0, daysTo = 90, page = 1, limit = 50 } = opts

  const today    = new Date()
  const dateFrom = new Date(today); dateFrom.setDate(today.getDate() + daysFrom)
  const dateTo   = new Date(today); dateTo.setDate(today.getDate() + daysTo)

  let query = supabase
    .from('renewals')
    .select(`
      *,
      contract:contracts!contract_id(
        id, contract_no, expires_at, final_amount, amount,
        product:products!product_id(id, name)
      ),
      company:companies!company_id(id, name),
      assigned_user:users!assigned_user_id(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .gte('contract_expires_at', dateFrom.toISOString().split('T')[0])
    .lte('contract_expires_at', dateTo.toISOString().split('T')[0])
    .order('contract_expires_at', { ascending: true })
    .range((page - 1) * limit, page * limit - 1)

  if (role === 'sales' && userId) {
    query = query.eq('assigned_user_id', userId)
  }
  if (status) query = query.eq('status', status)
  if (risk)   query = query.eq('risk_level', risk)

  const { data, count, error } = await query
  if (error) throw error

  return { data: data ?? [], count: count ?? 0, page, limit }
}

// ─── Activities ──────────────────────────────────────────
export async function getActivities(opts: QueryOptions & {
  companyId?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}) {
  const supabase = await createServerComponentClient()
  const { tenantId, userId, role, companyId, type, dateFrom, dateTo, page = 1, limit = 20 } = opts

  let query = supabase
    .from('activities')
    .select(`
      *,
      company:companies!company_id(id, name),
      contact:contacts!contact_id(id, name, title),
      user:users!user_id(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('activity_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (role === 'sales' && userId) query = query.eq('user_id', userId)
  if (companyId)  query = query.eq('company_id', companyId)
  if (type)       query = query.eq('type', type)
  if (dateFrom)   query = query.gte('activity_at', dateFrom)
  if (dateTo)     query = query.lte('activity_at', dateTo)

  const { data, count, error } = await query
  if (error) throw error

  return { data: data ?? [], count: count ?? 0, page, limit }
}

// ─── Tasks ───────────────────────────────────────────────
export async function getTasks(opts: QueryOptions & {
  mine?: boolean
  status?: string
  priority?: string
  overdue?: boolean
  page?: number
  limit?: number
}) {
  const supabase = await createServerComponentClient()
  const { tenantId, userId, mine, status, priority, overdue, page = 1, limit = 50 } = opts

  let query = supabase
    .from('tasks')
    .select(`
      *,
      company:companies!company_id(id, name),
      assigned_user:users!assigned_user_id(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .range((page - 1) * limit, page * limit - 1)

  if (mine && userId)  query = query.eq('assigned_user_id', userId)
  if (status)          query = query.eq('status', status)
  if (priority)        query = query.eq('priority', priority)
  if (overdue)         query = query.lt('due_at', new Date().toISOString()).neq('status', 'done')

  const { data, count, error } = await query
  if (error) throw error

  return { data: data ?? [], count: count ?? 0, page, limit }
}

// ─── Dashboard 요약 ──────────────────────────────────────
export async function getDashboardSummary(opts: QueryOptions) {
  const supabase = await createServerComponentClient()
  const { tenantId, userId, role } = opts
  const today = new Date().toISOString().split('T')[0]
  const plus7  = new Date(Date.now() + 7  * 86400000).toISOString().split('T')[0]
  const plus30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const isSales = role === 'sales' && !!userId

  // 오늘 통화 수
  let callsTodayQ = supabase
    .from('activities')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('type', 'call')
    .gte('activity_at', `${today}T00:00:00`)
    .lte('activity_at', `${today}T23:59:59`)
  if (isSales) callsTodayQ = callsTodayQ.eq('user_id', userId!)
  const { count: callsToday } = await callsTodayQ

  // 기한 초과 태스크
  let overdueTasksQ = supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .neq('status', 'done')
    .lt('due_at', new Date().toISOString())
  if (isSales) overdueTasksQ = overdueTasksQ.eq('assigned_user_id', userId!)
  const { count: overdueTasks } = await overdueTasksQ

  // D-7 갱신 건수
  let renewalsD7Q = supabase
    .from('renewals')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .not('status', 'in', '(won,lost)')
    .lte('contract_expires_at', plus7)
    .gte('contract_expires_at', today)
  if (isSales) renewalsD7Q = renewalsD7Q.eq('assigned_user_id', userId!)
  const { count: renewalsD7 } = await renewalsD7Q

  // D-30 갱신 건수
  let renewalsD30Q = supabase
    .from('renewals')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .not('status', 'in', '(won,lost)')
    .lte('contract_expires_at', plus30)
    .gte('contract_expires_at', today)
  if (isSales) renewalsD30Q = renewalsD30Q.eq('assigned_user_id', userId!)
  const { count: renewalsD30 } = await renewalsD30Q

  return {
    calls_today:   callsToday   ?? 0,
    overdue_tasks: overdueTasks ?? 0,
    renewals_d7:   renewalsD7   ?? 0,
    renewals_d30:  renewalsD30  ?? 0,
  }
}
