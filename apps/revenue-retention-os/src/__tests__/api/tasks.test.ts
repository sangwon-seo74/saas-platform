import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeAuthRequest, makeMockSupabase, makeQueryChain, routeCtx } from '../setup'

vi.mock('@/lib/supabase/client', () => ({
  createRouteHandlerClient: vi.fn(),
  createServiceClient:      vi.fn(() => ({ from: vi.fn() })),
  createBrowserClient:      vi.fn(),
}))

import * as supabaseModule from '@/lib/supabase/client'
import { GET, POST } from '@/app/api/tasks/route'

const mockCreate = vi.mocked(supabaseModule.createRouteHandlerClient)

const TASKS = [
  { id: 't1', title: '계약서 검토', type: 'manual', status: 'todo', priority: 'high', due_at: '2026-06-01', renewal_id: 'r1', company: { id: 'c1', name: 'ACME' }, assigned_user: { id: 'u1', name: '홍길동' } },
  { id: 't2', title: '갱신 미팅',   type: 'renewal', status: 'in_progress', priority: 'medium', due_at: '2026-06-10', renewal_id: 'r1', company: { id: 'c1', name: 'ACME' }, assigned_user: null },
]


describe('GET /api/tasks', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('전체 업무 목록 반환', async () => {
    const chain = makeQueryChain(TASKS, TASKS.length)
    const mock = makeMockSupabase(TASKS, TASKS.length)
    mock.supabase.from.mockReturnValue({ select: vi.fn(() => chain) })
    mockCreate.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const res = await GET(makeAuthRequest('/api/tasks') as Parameters<typeof GET>[0], routeCtx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data?.data).toBeDefined()
    expect(json.data?.count).toBeGreaterThanOrEqual(0)
  })

  it('renewal_id 파라미터로 갱신별 업무 필터', async () => {
    const filtered = TASKS.filter(t => t.renewal_id === 'r1')
    const chain = makeQueryChain(filtered)
    const mock = makeMockSupabase(filtered)
    mock.supabase.from.mockReturnValue({ select: vi.fn(() => chain) })
    mockCreate.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const res = await GET(makeAuthRequest('/api/tasks?renewal_id=r1') as Parameters<typeof GET>[0], routeCtx)
    expect(res.status).toBe(200)
  })

  it('mine=true 시 본인 담당 업무만', async () => {
    const mine = [TASKS[0]]
    const chain = makeQueryChain(mine)
    const mock = makeMockSupabase(mine)
    mock.supabase.from.mockReturnValue({ select: vi.fn(() => chain) })
    mockCreate.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const res = await GET(makeAuthRequest('/api/tasks?mine=true') as Parameters<typeof GET>[0], routeCtx)
    expect(res.status).toBe(200)
  })

  it('overdue=true 필터 적용', async () => {
    const overdue = [{ ...TASKS[0], due_at: '2024-01-01' }]
    const chain = makeQueryChain(overdue)
    const mock = makeMockSupabase(overdue)
    mock.supabase.from.mockReturnValue({ select: vi.fn(() => chain) })
    mockCreate.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const res = await GET(makeAuthRequest('/api/tasks?overdue=true') as Parameters<typeof GET>[0], routeCtx)
    expect(res.status).toBe(200)
  })
})

describe('POST /api/tasks', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('title 누락 시 400 반환', async () => {
    const mock = makeMockSupabase([])
    mockCreate.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'high' }),
    })
    const res = await POST(req as Parameters<typeof POST>[0], routeCtx)
    expect(res.status).toBe(400)
  })

  it('유효한 업무 생성', async () => {
    const created = { id: 't-new', title: '신규 업무', status: 'todo', priority: 'medium' }
    const mock = makeMockSupabase([created])
    mock.supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: created, error: null }),
        }),
      }),
    })
    mockCreate.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '신규 업무', priority: 'medium', renewal_id: 'r1' }),
    })
    const res = await POST(req as Parameters<typeof POST>[0], routeCtx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data?.title).toBe('신규 업무')
  })

  it('DB 오류 시 500 반환', async () => {
    const mock = makeMockSupabase([])
    mock.supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
        }),
      }),
    })
    mockCreate.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '오류 업무' }),
    })
    const res = await POST(req as Parameters<typeof POST>[0], routeCtx)
    expect(res.status).toBe(500)
  })
})
