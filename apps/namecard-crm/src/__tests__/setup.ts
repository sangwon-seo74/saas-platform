import { vi } from 'vitest'

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

export function makeAuthRequest(
  url: string,
  options: RequestInit = {},
  ctx: { tenantId?: string; userId?: string; role?: string } = {},
): Request {
  const headers = new Headers(options.headers)
  headers.set('x-tenant-id', ctx.tenantId ?? 'test-tenant')
  headers.set('x-user-id',   ctx.userId   ?? 'test-user')
  headers.set('x-user-role', ctx.role     ?? 'owner')
  return new Request(`http://localhost:3001${url}`, { ...options, headers })
}

export const routeCtx = { params: Promise.resolve({}) }

export function makeMockSupabase(rows: unknown[] = [], error: unknown = null) {
  const chain = {
    eq:          () => chain,
    neq:         () => chain,
    ilike:       () => chain,
    in:          () => chain,
    is:          () => chain,
    order:       () => chain,
    limit:       () => chain,
    range:       () => chain,
    select:      () => chain,
    upsert:      () => chain,
    delete:      () => chain,
    update:      () => chain,
    insert:      () => chain,
    single:      () => Promise.resolve({ data: rows[0] ?? null, error }),
    maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error }),
    then:        (fn: (v: { data: unknown[]; error: unknown; count: number }) => void) =>
                   Promise.resolve({ data: rows, error, count: rows.length }).then(fn),
  }

  const authClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'test@example.com' } }, error: null }),
    },
  }

  return {
    supabase: {
      from: vi.fn(),
    },
    authClient,
    chain,
  }
}
