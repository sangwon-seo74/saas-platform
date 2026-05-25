// GET  /api/activities  — 활동 목록
// POST /api/activities  — 활동 기록 생성

import { ok, err } from '@/lib/utils'
import { withAuth, parsePagination } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import type { ActivityType } from '@/types/domain'

export const GET = withAuth(async (req, ctx) => {
  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const { supabase } = createRouteHandlerClient(req)

  const type       = searchParams.get('type') as ActivityType | null
  const company_id = searchParams.get('company_id')
  const user_id    = searchParams.get('user_id')
  const date_from  = searchParams.get('date_from')
  const date_to    = searchParams.get('date_to')

  let query = supabase
    .from('activities')
    .select(`
      id, type, activity_at, call_result, call_duration,
      visit_purpose, summary, next_action, next_action_at, contact_value, created_at,
      company:companies!company_id(id, name),
      contact:contacts!contact_id(id, name, title),
      user:users!user_id(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('activity_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (ctx.role === 'sales') query = query.eq('user_id', ctx.userId)
  if (type)       query = query.eq('type', type)
  if (company_id) query = query.eq('company_id', company_id)
  if (user_id)    query = query.eq('user_id', user_id)
  if (date_from)  query = query.gte('activity_at', date_from)
  if (date_to)    query = query.lte('activity_at', date_to)

  const { data, count, error } = await query
  if (error) return err('DB_ERROR', error.message, 500)

  return ok({ data: data ?? [], count: count ?? 0, page, limit })
})

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')
  const { supabase } = createRouteHandlerClient(req)

  const { company_id, contact_id, contact_value, type, activity_at,
          call_result, call_duration, visit_purpose, companions,
          summary, next_action, next_action_at,
          contract_id, renewal_id } = body

  if (!company_id) return err('VALIDATION', 'company_id는 필수입니다')
  if (!type)       return err('VALIDATION', 'type은 필수입니다')
  if (type === 'call' && !call_result) return err('VALIDATION', '통화 결과는 필수입니다')

  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      tenant_id:      ctx.tenantId,
      user_id:        ctx.userId,
      company_id,
      contact_id:     contact_id     ?? null,
      contact_value:  contact_value  ?? null,
      contract_id:    contract_id    ?? null,
      renewal_id:     renewal_id     ?? null,
      type,
      activity_at:    activity_at    ?? new Date().toISOString(),
      call_result:    call_result    ?? null,
      call_duration:  call_duration  ?? null,
      visit_purpose:  visit_purpose  ?? null,
      companions:     companions     ?? null,
      summary:        summary        ?? null,
      next_action:    next_action    ?? null,
      next_action_at: next_action_at ?? null,
    })
    .select()
    .single()

  if (error) return err('DB_ERROR', error.message, 500)

  // next_action_at 있으면 Task 자동 생성
  if (next_action && next_action_at && activity) {
    await supabase.from('tasks').insert({
      tenant_id:        ctx.tenantId,
      assigned_user_id: ctx.userId,
      company_id,
      contract_id:  contract_id ?? null,
      renewal_id:   renewal_id  ?? null,
      activity_id:  activity.id,
      title:        next_action,
      type:         type === 'call' ? 'call' : type === 'visit' ? 'visit' : 'manual',
      priority:     'medium',
      status:       'todo',
      due_at:       next_action_at,
      is_auto:      true,
    })
  }

  return ok(activity)
})
