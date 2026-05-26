// GET  /api/settings/integrations — 테넌트 연동 설정 목록
// PATCH /api/settings/integrations — provider 설정 upsert

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createServiceClient } from '@/lib/supabase/client'

const SECRET_PATTERNS = ['key', 'secret', 'password', 'token']

function isSecret(fieldKey: string): boolean {
  return SECRET_PATTERNS.some(p => fieldKey.toLowerCase().includes(p))
}

function maskConfig(config: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(config).map(([k, v]) => [k, v && isSecret(k) ? '__set__' : (v ?? '')])
  )
}

export const GET = withAuth(async (_req, ctx) => {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('api_integrations')
    .select('id, provider, config, is_active, tested_at, updated_at')
    .eq('tenant_id', ctx.tenantId)

  if (error) return err('DB_ERROR', error.message, 500)

  const rows = (data ?? []).map(row => ({
    ...row,
    config: maskConfig((row.config ?? {}) as Record<string, string>),
  }))
  return ok(rows)
}, { roles: ['admin'] })

export const PATCH = withAuth(async (req, ctx) => {
  const supabase = createServiceClient()
  const body = await req.json().catch(() => null)
  if (!body?.provider) return err('VALIDATION', 'provider는 필수입니다')

  const { provider, config, is_active } = body as {
    provider: string
    config: Record<string, string>
    is_active: boolean
  }

  // 기존 레코드 조회 (마스킹 값 복원용)
  const { data: existing } = await supabase
    .from('api_integrations')
    .select('config')
    .eq('tenant_id', ctx.tenantId)
    .eq('provider', provider)
    .single()

  const existingConfig = ((existing?.config ?? {}) as Record<string, string>)

  // '__set__' 값은 기존 값 유지
  const mergedConfig = Object.fromEntries(
    Object.entries(config).map(([k, v]) =>
      v === '__set__' ? [k, existingConfig[k] ?? ''] : [k, v]
    )
  )

  const { error } = await supabase
    .from('api_integrations')
    .upsert(
      {
        tenant_id:  ctx.tenantId,
        provider,
        config:     mergedConfig,
        is_active:  is_active ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,provider' }
    )

  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ success: true })
}, { roles: ['admin'] })
