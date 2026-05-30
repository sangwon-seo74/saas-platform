import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabaseClient, setRequestHeaders } from '../setup'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import * as serverModule from '@/lib/supabase/server'
import { GET } from '@/app/api/visits/route'

const mockCreateClient = vi.mocked(serverModule.createClient)

describe('GET /api/visits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setRequestHeaders({ 'x-tenant-id': 'test-tenant', 'x-user-id': 'user-1', 'x-user-role': 'admin' })
  })

  it('방문 목록 반환', async () => {
    const visits = [
      {
        id: 'v1', status: 'planned', visit_type: 'sales',
        client: { id: 'c1', name: '거래처A', address: '서울', client_type: 'restaurant' },
        rep: { id: 'user-1', name: '홍길동', role: 'rep' },
      },
    ]
    const supabase = makeSupabaseClient(visits)
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: visits, error: null }),
          }),
        }),
      }),
    })
    mockCreateClient.mockResolvedValue(supabase as unknown as Awaited<ReturnType<typeof serverModule.createClient>>)

    const req = new Request('http://localhost/api/visits')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toBeDefined()
  })

  it('인증 헤더 없으면 401', async () => {
    setRequestHeaders({ 'x-tenant-id': '', 'x-user-id': '', 'x-user-role': '' })
    const req = new Request('http://localhost/api/visits')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('status 필터 쿼리 파라미터', async () => {
    const supabase = makeSupabaseClient([])
    const chain: Record<string, unknown> = {}
    const fns = ['eq', 'order', 'limit']
    for (const fn of fns) chain[fn] = vi.fn(() => chain)
    chain.then = (fn: (v: { data: unknown[]; error: unknown }) => void) =>
                   Promise.resolve({ data: [], error: null }).then(fn)
    supabase.from.mockReturnValue({ select: vi.fn(() => chain) })
    mockCreateClient.mockResolvedValue(supabase as unknown as Awaited<ReturnType<typeof serverModule.createClient>>)

    setRequestHeaders({ 'x-tenant-id': 'test-tenant', 'x-user-id': 'user-1', 'x-user-role': 'admin' })
    const req = new Request('http://localhost/api/visits?status=planned')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })
})
