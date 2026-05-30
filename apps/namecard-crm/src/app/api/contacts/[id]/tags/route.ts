// POST   /api/contacts/[id]/tags   { tag_id }  — 태그 추가
// DELETE /api/contacts/[id]/tags   { tag_id }  — 태그 제거

import { withAuth, requireId } from '@/lib/api'
import { ok, err } from '@/lib/utils'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const POST = withAuth(async (req, ctx, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const body = await req.json().catch(() => null)
  if (!body?.tag_id) return err('VALIDATION', 'tag_id가 필요합니다')

  const { supabase } = createRouteHandlerClient(req)
  const { error } = await supabase
    .from('contact_tags')
    .upsert({ contact_id: params.id, tag_id: body.tag_id }, { onConflict: 'contact_id,tag_id' })

  if (error) return err('DB_ERROR', error.message)
  return ok({ added: true })
})

export const DELETE = withAuth(async (req, ctx, params) => {
  const invalid = requireId(params.id)
  if (invalid) return invalid

  const body = await req.json().catch(() => null)
  if (!body?.tag_id) return err('VALIDATION', 'tag_id가 필요합니다')

  const { supabase } = createRouteHandlerClient(req)
  const { error } = await supabase
    .from('contact_tags')
    .delete()
    .eq('contact_id', params.id)
    .eq('tag_id', body.tag_id)

  if (error) return err('DB_ERROR', error.message)
  return ok({ removed: true })
})
