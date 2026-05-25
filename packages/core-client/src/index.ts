const CORE_API_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CORE_API_URL) ||
  'http://127.0.0.1:8001'

type ApiResult<T = Record<string, unknown>> = {
  ok: boolean
  data: T | null
  error: { code: string; message: string } | null
}

async function call<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${CORE_API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, data: json.data ?? null, error: json.error ?? null }
}

// ─── 인증 불필요 ────────────────────────────────────────────

export function logAccess(params: {
  email: string
  action?: string
  result?: string
}): void {
  call('POST', '/v1/auth/log-access', params).catch(() => {})
}

export async function verifyInvite(token: string): Promise<
  ApiResult<{ email: string; role: string; tenant_name: string; expires_at: string }>
> {
  const res = await fetch(
    `${CORE_API_URL}/v1/accept-invite?token=${encodeURIComponent(token)}`,
  )
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, data: json.data ?? null, error: json.error ?? null }
}

export async function acceptInvite(params: {
  token: string
  name: string
  password: string
}): Promise<ApiResult<{ message: string; user: { id: string; email: string; name: string } }>> {
  return call('POST', '/v1/accept-invite', params)
}

// ─── 슈퍼어드민 전용 (authToken 필수) ───────────────────────

export async function resendInvite(
  tenantId: string,
  authToken: string,
  body?: { email?: string; name?: string },
): Promise<ApiResult<{ email: string; message: string }>> {
  return call('POST', `/v1/admin/tenants/${tenantId}/resend-invite`, body ?? {}, authToken)
}

export async function resetTenantPassword(
  tenantId: string,
  authToken: string,
): Promise<ApiResult<{ user: { id: string; name: string; email: string }; temp_password: string; message: string }>> {
  return call('POST', `/v1/admin/tenants/${tenantId}/reset-password`, undefined, authToken)
}

export async function impersonate(
  userId: string,
  authToken: string,
): Promise<ApiResult<{ email: string; impersonation_link: string; expires_in_seconds: number; warning: string }>> {
  return call('POST', '/v1/admin/impersonate', { user_id: userId }, authToken)
}
