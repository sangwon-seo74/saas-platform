// DELETE /api/super-admin/notes/[id] — 운영 메모 삭제

import { ok, err } from '@/lib/utils'
import { withSuperAdmin } from '@/lib/super-admin'
import { createServiceClient } from '@/lib/supabase/client'
import { requireId } from '@/lib/api'

export const DELETE = withSuperAdmin(async (_req, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const supabase = createServiceClient()
  const { error } = await supabase.from('tenant_notes').delete().eq('id', params.id)
  if (error) return err('DB_ERROR', error.message, 500)
  return ok({ id: params.id })
})
