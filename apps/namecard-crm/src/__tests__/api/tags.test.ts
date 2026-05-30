import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeAuthRequest, makeMockSupabase, routeCtx } from '../setup'

vi.mock('@/lib/supabase/client', () => ({
  createRouteHandlerClient: vi.fn(),
  createServiceClient:      vi.fn(() => ({ from: vi.fn(() => ({ insert: vi.fn(() => Promise.resolve({ error: null })) })) })),
}))

import * as supabaseModule from '@/lib/supabase/client'
import { GET, POST } from '@/app/api/tags/route'

const mockClient = vi.mocked(supabaseModule.createRouteHandlerClient)

describe('GET /api/tags', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('태그 목록 반환', async () => {
    const tags = [
      { id: 't1', name: 'VIP', color: '#EF4444', tenant_id: 'test-tenant' },
      { id: 't2', name: '파트너', color: '#3B82F6', tenant_id: 'test-tenant' },
    ]
    const mock = makeMockSupabase(tags)
    mock.supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: tags, error: null }),
        }),
      }),
    })
    mockClient.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/tags')
    const res = await GET(req as Parameters<typeof GET>[0], routeCtx)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(2)
    expect(json.data[0].name).toBe('VIP')
  })

  it('DB 오류 → 400', async () => {
    const mock = makeMockSupabase([], { message: 'db error' })
    mock.supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
        }),
      }),
    })
    mockClient.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/tags')
    const res = await GET(req as Parameters<typeof GET>[0], routeCtx)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/tags', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('태그 생성 성공', async () => {
    const newTag = { id: 't3', name: '잠재고객', color: '#22C55E' }
    const mock = makeMockSupabase([newTag])
    mock.supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newTag, error: null }),
        }),
      }),
    })
    mockClient.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '잠재고객', color: '#22C55E' }),
    })
    const res = await POST(req as Parameters<typeof POST>[0], routeCtx)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.name).toBe('잠재고객')
  })

  it('name 누락 → 400', async () => {
    const mock = makeMockSupabase([])
    mockClient.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: '#22C55E' }),
    })
    const res = await POST(req as Parameters<typeof POST>[0], routeCtx)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION')
  })

  it('중복 태그 → DUPLICATE 에러', async () => {
    const mock = makeMockSupabase([])
    mock.supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } }),
        }),
      }),
    })
    mockClient.mockReturnValue(mock as unknown as ReturnType<typeof supabaseModule.createRouteHandlerClient>)

    const req = makeAuthRequest('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'VIP' }),
    })
    const res = await POST(req as Parameters<typeof POST>[0], routeCtx)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('DUPLICATE')
  })
})
