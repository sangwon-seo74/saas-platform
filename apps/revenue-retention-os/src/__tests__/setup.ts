import { vi } from 'vitest'

// Self-referential query chain that is also thenable.
// Every filter method returns the chain itself so filters applied after .range()
// (e.g., mine=true adds .eq(), overdue=true adds .lt().neq()) work correctly.
export function makeQueryChain(data: unknown[] | null = [], count?: number, error: unknown = null) {
  const resolved = {
    data: data as unknown,
    error,
    count: count ?? (Array.isArray(data) ? data.length : 0),
  }
  const chain: Record<string, unknown> = {}
  const fns = ['eq', 'neq', 'lt', 'lte', 'gte', 'not', 'ilike', 'in', 'order', 'range', 'select']
  for (const fn of fns) chain[fn] = vi.fn(() => chain)
  chain.then = (
    onFulfilled: (v: typeof resolved) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) => Promise.resolve(resolved).then(onFulfilled, onRejected)
  return chain
}

// Next.js 서버 환경 shimming
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    NextResponse: {
      next: () => ({ headers: new Headers(), cookies: { set: vi.fn(), get: vi.fn() } }),
      json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      }),
    },
  }
})

// Supabase 클라이언트 모킹 헬퍼
export function makeMockSupabase(rows: unknown[] = [], count = 0, error: unknown = null) {
  const chain = {
    eq:        () => chain,
    neq:       () => chain,
    lt:        () => chain,
    lte:       () => chain,
    gte:       () => chain,
    order:     () => chain,
    range:     () => chain,
    limit:     () => chain,
    single:    () => Promise.resolve({ data: rows[0] ?? null, error }),
    maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error }),
    then:      (fn: (v: { data: unknown[]; error: unknown; count: number }) => void) =>
                 Promise.resolve({ data: rows, error, count }).then(fn),
  }
  const insertChain = { select: () => chain, ...chain }

  return {
    supabase: {
      from: vi.fn(),
    },
    authClient: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    },
  }
}

// 인증 헤더를 포함한 테스트 Request 생성
export function makeAuthRequest(
  url: string,
  options: RequestInit = {},
  ctx: { tenantId?: string; userId?: string; role?: string } = {},
): Request {
  const headers = new Headers(options.headers)
  headers.set('x-tenant-id', ctx.tenantId ?? 'test-tenant')
  headers.set('x-user-id',   ctx.userId   ?? 'test-user')
  headers.set('x-user-role', ctx.role     ?? 'admin')
  return new Request(`http://localhost:3000${url}`, { ...options, headers })
}

// withAuth가 요구하는 Next.js route context (params는 비어있는 Promise)
export const routeCtx = { params: Promise.resolve({}) }
