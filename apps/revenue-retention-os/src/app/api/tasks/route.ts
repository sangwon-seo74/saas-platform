// GET  /api/tasks  — 업무 목록
// POST /api/tasks  — 업무 생성

import { ok, err } from '@/lib/utils'
import { withAuth, parsePagination } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import type { TaskStatus, TaskPriority } from '@/types/domain'

export const GET = withAuth(async (req, ctx) => {
  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const { supabase } = createRouteHandlerClient(req)

  const mine       = searchParams.get('mine') === 'true'
  const status     = searchParams.get('status') as TaskStatus | null
  const priority   = searchParams.get('priority') as TaskPriority | null
  const overdue    = searchParams.get('overdue') === 'true'
  const user_id    = searchParams.get('user_id')
  const company_id = searchParams.get('company_id')
  const from       = searchParams.get('from')      // created_at 범위 시작 (YYYY-MM-DD)
  const to         = searchParams.get('to')        // created_at 범위 종료 (YYYY-MM-DD)
  const done_from  = searchParams.get('done_from') // done_at 범위 시작 (YYYY-MM-DD)
  const done_to    = searchParams.get('done_to')   // done_at 범위 종료 (YYYY-MM-DD)

  let query = supabase
    .from('tasks')
    .select(`
      id, title, type, priority, status, due_at, done_at, is_auto, created_at,
      company:companies!company_id(id, name),
      assigned_user:users!assigned_user_id(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (mine || ctx.role === 'sales') query = query.eq('assigned_user_id', ctx.userId)
  else if (user_id)                 query = query.eq('assigned_user_id', user_id)

  if (company_id) query = query.eq('company_id', company_id)
  if (status)     query = query.eq('status', status)
  if (priority)   query = query.eq('priority', priority)
  if (overdue)    query = query.lt('due_at', new Date().toISOString()).neq('status', 'done')
  if (from)       query = query.gte('created_at', from)
  if (to)         query = query.lte('created_at', to + 'T23:59:59')
  if (done_from)  query = query.gte('done_at', done_from)
  if (done_to)    query = query.lte('done_at', done_to + 'T23:59:59')

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ data: data ?? [], count: count ?? 0, page, limit })
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const { title, description, type, priority, due_at,
          assigned_user_id, company_id, contract_id, renewal_id } = body

  if (!title?.trim()) return err('VALIDATION', '업무 제목은 필수입니다')

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      tenant_id:        ctx.tenantId,
      assigned_user_id: assigned_user_id ?? ctx.userId,
      company_id:  company_id  ?? null,
      contract_id: contract_id ?? null,
      renewal_id:  renewal_id  ?? null,
      title:       title.trim(),
      description: description ?? null,
      type:        type        ?? null,
      priority:    priority    ?? 'medium',
      status:      'todo',
      due_at:      due_at      ?? null,
      is_auto:     false,
    })
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)
  return ok(data)
})
