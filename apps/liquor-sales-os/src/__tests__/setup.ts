import { vi } from 'vitest'

// next/headers mock — Returns configurable header values via setHeaders()
const _headers: Record<string, string> = {
  'x-tenant-id': 'test-tenant',
  'x-user-id':   'test-user',
  'x-user-role': 'admin',
}

export function setRequestHeaders(overrides: Record<string, string>) {
  Object.assign(_headers, overrides)
}

vi.mock('next/headers', () => ({
  headers: () => ({ get: (key: string) => _headers[key] ?? null }),
}))

// supabase/server mock
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

export function makeSupabaseClient(rows: unknown[] = [], error: unknown = null) {
  const chain: Record<string, unknown> = {}
  const chainFns = ['eq', 'neq', 'is', 'lt', 'lte', 'gte', 'ilike', 'in', 'order', 'limit', 'range', 'select']
  for (const fn of chainFns) chain[fn] = vi.fn(() => chain)
  chain.single      = vi.fn(() => Promise.resolve({ data: rows[0] ?? null, error }))
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: rows[0] ?? null, error }))
  chain.then        = (fn: (v: { data: unknown[]; error: unknown }) => void) =>
                        Promise.resolve({ data: rows, error }).then(fn)

  return {
    schema: vi.fn().mockReturnThis(),
    from: vi.fn(),
    chain,
  }
}
