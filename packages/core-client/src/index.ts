import { z } from 'zod'

const CORE_API_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CORE_API_URL) ||
  'http://127.0.0.1:8001'

export type ApiResult<T> = {
  ok: boolean
  data: T | null
  error: { code: string; message: string } | null
}

// core-api는 모든 응답을 { data, error } 봉투로 반환한다 (CLAUDE.md 규칙).
const errorSchema = z.object({ code: z.string(), message: z.string() })

function envelopeSchema<S extends z.ZodTypeAny>(dataSchema: S) {
  return z.object({
    data: dataSchema.nullable(),
    error: errorSchema.nullable(),
  })
}

// 외부(core-api) 응답은 zod로 파싱·검증한다.
async function call<S extends z.ZodTypeAny>(
  method: string,
  path: string,
  dataSchema: S,
  body?: unknown,
  token?: string,
): Promise<ApiResult<z.infer<S>>> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${CORE_API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    return { ok: false, data: null, error: { code: 'network_error', message: 'core-api에 연결할 수 없습니다' } }
  }

  const json = await res.json().catch(() => ({}))
  const parsed = envelopeSchema(dataSchema).safeParse(json)
  if (!parsed.success) {
    return { ok: false, data: null, error: { code: 'invalid_response', message: 'core-api 응답 형식이 올바르지 않습니다' } }
  }
  return { ok: res.ok, data: parsed.data.data, error: parsed.data.error }
}

// ─── 응답 스키마 ─────────────────────────────────────────────
const loggedSchema = z.object({ logged: z.boolean() })
const inviteInfoSchema = z.object({
  email: z.string(),
  role: z.string(),
  tenant_name: z.string(),
  expires_at: z.string(),
})
const acceptInviteSchema = z.object({
  message: z.string(),
  user: z.object({ id: z.string(), email: z.string(), name: z.string() }),
})
const sendInviteSchema = z.object({
  message: z.string(),
  email: z.string(),
  role: z.string().optional(),
  expires_at: z.string(),
  invite_url: z.string().optional(),
})
const resendInviteSchema = z.object({
  email: z.string(),
  invite_url: z.string(),
  expires_at: z.string(),
  message: z.string(),
})
const resetPasswordSchema = z.object({
  user: z.object({ id: z.string(), name: z.string().nullable(), email: z.string() }),
  temp_password: z.string(),
  message: z.string(),
})
const impersonateSchema = z.object({
  email: z.string(),
  impersonation_link: z.string(),
  expires_in_seconds: z.number(),
  warning: z.string(),
})
const sendSmsSchema = z.object({
  ok: z.boolean(),
  message_id: z.string().nullable().optional(),
  status_code: z.number(),
})
const sendKakaoSchema = z.object({
  ok: z.boolean(),
  message_id: z.string().nullable().optional(),
  status_code: z.number(),
})
const sendEmailSchema = z.object({
  ok: z.boolean(),
  message_id: z.string().nullable().optional(),
  status_code: z.number(),
})

// ─── 인증 불필요 ────────────────────────────────────────────

export function logAccess(params: {
  email: string
  action?: string
  result?: string
}): void {
  call('POST', '/v1/auth/log-access', loggedSchema, params).catch(() => {})
}

export async function verifyInvite(token: string) {
  return call('GET', `/v1/accept-invite?token=${encodeURIComponent(token)}`, inviteInfoSchema)
}

export async function acceptInvite(params: {
  token: string
  name: string
  password: string
}) {
  return call('POST', '/v1/accept-invite', acceptInviteSchema, params)
}

// ─── 인증 필요 (authToken) ──────────────────────────────────

// 팀 멤버 초대 — caller의 JWT에서 tenant를 도출 (서버 라우트에서 세션 토큰 전달)
export async function sendInvite(
  params: { email: string; name: string; role: string },
  authToken: string,
) {
  return call('POST', '/v1/invite', sendInviteSchema, params, authToken)
}

// ─── 슈퍼어드민 전용 (authToken 필수) ───────────────────────

export async function resendInvite(
  tenantId: string,
  authToken: string,
  body?: { email?: string; name?: string },
) {
  return call('POST', `/v1/admin/tenants/${tenantId}/resend-invite`, resendInviteSchema, body ?? {}, authToken)
}

export async function resetTenantPassword(tenantId: string, authToken: string) {
  return call('POST', `/v1/admin/tenants/${tenantId}/reset-password`, resetPasswordSchema, undefined, authToken)
}

export async function impersonate(userId: string, authToken: string) {
  return call('POST', '/v1/admin/impersonate', impersonateSchema, { user_id: userId }, authToken)
}

export async function sendSms(
  params: {
    api_key: string
    api_secret: string
    from_number: string
    to_number: string
    text: string
  },
  authToken: string,
) {
  return call('POST', '/v1/notify/sms', sendSmsSchema, params, authToken)
}

export async function sendKakao(
  params: {
    api_key: string
    api_secret: string
    sender_key: string
    template_code: string
    to_number: string
    text: string
  },
  authToken: string,
) {
  return call('POST', '/v1/notify/kakao', sendKakaoSchema, params, authToken)
}

export async function sendEmail(
  params: {
    to: string
    subject: string
    html?: string
    text?: string
    from_name?: string
    from_email?: string
  },
  authToken: string,
) {
  return call('POST', '/v1/notify/email', sendEmailSchema, params, authToken)
}
