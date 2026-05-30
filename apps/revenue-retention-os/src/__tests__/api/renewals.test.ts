import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeAuthRequest, makeMockSupabase, makeQueryChain, routeCtx } from '../setup'

vi.mock('@/lib/supabase/client', () => ({
  createRouteHandlerClient: vi.fn(),
  createServiceClient:      vi.fn(() => ({ from: vi.fn() })),
  createBrowserClient:      vi.fn(),
}))

import * as supabaseModule from '@/lib/supabase/client'
import { GET, POST } from '@/app/api/renewals/route'

const mockCreate = vi.mocked(supabaseModule.createRouteHandlerClient)

describe('GET /api/renewals', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('파이프라인 목록 반환', async () => {
    const rows = [
      {
        id: 'r1', status: 'pending', risk_level: 'high', risk_score: 80,
        contract_expires_at: '2026-06-01', result: null,
        company: { id: 'c1', name: 'ACME' }, assigned_user: { id: 'u1', name: '홍길동' },
      },
    ]
    const mock = makeMockSupabase(rows, 1)
    const chain = makeQueryChain(rows, 1)
    mock.supabase.from.mockReturnValue({ select: vi.fn(() => chain) })
    mockCreate.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const res = await GET(makeAuthRequest('/api/renewals') as Parameters<typeof GET>[0], routeCtx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.data?.data)).toBe(true)
  })

  it('include_closed=true 시 필터 없이 조회', async () => {
    const rows = [{ id: 'r2', status: 'won', risk_level: 'low', contract_expires_at: '2025-12-01' }]
    const mock = makeMockSupabase(rows, 1)
    const chain = makeQueryChain(rows, 1)
    mock.supabase.from.mockReturnValue({ select: vi.fn(() => chain) })
    mockCreate.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const res = await GET(makeAuthRequest('/api/renewals?include_closed=true') as Parameters<typeof GET>[0], routeCtx)
    expect(res.status).toBe(200)
  })

  it('DB 오류 시 500 반환', async () => {
    const mock = makeMockSupabase([])
    const chain = makeQueryChain(null, 0, { message: 'db error' })
    mock.supabase.from.mockReturnValue({ select: vi.fn(() => chain) })
    mockCreate.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const res = await GET(makeAuthRequest('/api/renewals') as Parameters<typeof GET>[0], routeCtx)
    expect(res.status).toBe(500)
  })
})

describe('POST /api/renewals', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('contract_id 누락 시 400 반환', async () => {
    const mock = makeMockSupabase([])
    mockCreate.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/renewals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo: '테스트' }),
    })
    const res = await POST(req as Parameters<typeof POST>[0], routeCtx)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('contract를 찾을 수 없으면 404 반환', async () => {
    const mock = makeMockSupabase([])
    mock.supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })
    mockCreate.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/renewals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_id: 'non-existent' }),
    })
    const res = await POST(req as Parameters<typeof POST>[0], routeCtx)
    expect(res.status).toBe(404)
  })
})
