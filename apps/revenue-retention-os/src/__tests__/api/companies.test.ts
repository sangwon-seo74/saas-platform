import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeAuthRequest, makeMockSupabase, makeQueryChain, routeCtx } from '../setup'

// Supabase 모듈 통째로 모킹
vi.mock('@/lib/supabase/client', () => ({
  createRouteHandlerClient: vi.fn(),
  createServiceClient:      vi.fn(() => ({ from: vi.fn() })),
  createBrowserClient:      vi.fn(),
}))

import * as supabaseModule from '@/lib/supabase/client'
import { GET, POST } from '@/app/api/companies/route'

const mockCreateRouteHandlerClient = vi.mocked(supabaseModule.createRouteHandlerClient)

describe('GET /api/companies', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('목록 반환 — 정상 케이스', async () => {
    const rows = [
      { id: 'c1', name: 'ACME Corp', status: 'active', renewal_risk: 'low', assigned_user: null },
    ]
    const mock = makeMockSupabase(rows, 1)
    // 두 번 from()이 호출됨: companies + contracts batch
    mock.supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq:    vi.fn().mockReturnValue({
          eq:    vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: rows, error: null, count: 1 }),
            }),
          }),
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: rows, error: null, count: 1 }),
          }),
        }),
        in:   vi.fn().mockReturnValue({
          eq:   vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    })
    mockCreateRouteHandlerClient.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/companies')
    const res = await GET(req as Parameters<typeof GET>[0], routeCtx)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toBeDefined()
  })

  it('DB 오류 시 500 반환', async () => {
    const mock = makeMockSupabase([], 0, { message: 'connection refused' })
    mock.supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq:    vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: null, error: { message: 'connection refused' }, count: 0 }),
          }),
        }),
      }),
    })
    mockCreateRouteHandlerClient.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/companies')
    const res = await GET(req as Parameters<typeof GET>[0], routeCtx)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('q 파라미터로 이름 검색', async () => {
    const rows = [{ id: 'c2', name: '삼성전자', status: 'active', renewal_risk: 'low', assigned_user: null }]
    const mock = makeMockSupabase(rows, 1)
    const chain = makeQueryChain(rows, 1)
    mock.supabase.from
      .mockReturnValueOnce({ select: vi.fn(() => chain) })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      })
    mockCreateRouteHandlerClient.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/companies?q=삼성')
    const res = await GET(req as Parameters<typeof GET>[0], routeCtx)
    expect(res.status).toBe(200)
  })
})

describe('POST /api/companies', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('유효한 데이터로 고객사 생성', async () => {
    const newCompany = { id: 'c-new', name: '새 고객사', tenant_id: 'test-tenant' }
    const mock = makeMockSupabase([newCompany])
    mock.supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newCompany, error: null }),
        }),
      }),
    })
    mockCreateRouteHandlerClient.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '새 고객사', status: 'active' }),
    })
    const res = await POST(req as Parameters<typeof POST>[0], routeCtx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data?.name).toBe('새 고객사')
  })

  it('name 누락 시 400 반환', async () => {
    const mock = makeMockSupabase([])
    mockCreateRouteHandlerClient.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    const res = await POST(req as Parameters<typeof POST>[0], routeCtx)
    expect(res.status).toBe(400)
  })
})
