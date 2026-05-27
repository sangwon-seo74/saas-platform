// POST /api/business-cards/[contactId]/image
// 명함 이미지를 Supabase Storage에 업로드하고 contact.business_card_url을 갱신한다.
// 버킷: rros-business-cards (private)
// 경로: {tenant_id}/{contact_id}.{ext}

import { ok, err } from '@/lib/utils'
import { withAuth, requireId } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

const BUCKET = 'rros-business-cards'

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

export const POST = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.contactId)
  if (idErr) return idErr

  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { image_base64, media_type = 'image/jpeg' } = body as {
    image_base64?: string
    media_type?: string
  }

  if (!image_base64?.trim()) return err('VALIDATION', 'image_base64가 필요합니다')

  const ext = EXT_MAP[media_type]
  if (!ext) return err('VALIDATION', `지원하지 않는 이미지 형식입니다: ${media_type}`)

  const { supabase } = createRouteHandlerClient(req)

  // 담당자가 이 테넌트에 속하는지 확인
  const { data: contact, error: contactErr } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', params!.contactId)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (contactErr || !contact) return err('NOT_FOUND', '담당자를 찾을 수 없습니다', 404)

  // Base64 → Uint8Array 변환
  const binaryStr = atob(image_base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

  const storagePath = `${ctx.tenantId}/${params!.contactId}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: media_type,
      upsert: true,
    })

  if (uploadErr) return err('STORAGE_ERROR', `이미지 업로드 실패: ${uploadErr.message}`, 500)

  // contact.business_card_url 갱신
  const { error: updateErr } = await supabase
    .from('contacts')
    .update({ business_card_url: storagePath })
    .eq('id', params!.contactId)
    .eq('tenant_id', ctx.tenantId)

  if (updateErr) return err('DB_ERROR', updateErr.message, 500)

  return ok({ business_card_url: storagePath })
})

// GET /api/business-cards/[contactId]/image
// Supabase Storage signed URL을 생성해 반환한다 (유효시간 1시간).
export const GET = withAuth(async (req, ctx, params) => {
  const idErr = requireId(params?.contactId)
  if (idErr) return idErr

  const { supabase } = createRouteHandlerClient(req)

  const { data: contact, error: contactErr } = await supabase
    .from('contacts')
    .select('id, business_card_url')
    .eq('id', params!.contactId)
    .eq('tenant_id', ctx.tenantId)
    .single()

  if (contactErr || !contact) return err('NOT_FOUND', '담당자를 찾을 수 없습니다', 404)
  if (!contact.business_card_url) return err('NOT_FOUND', '등록된 명함 이미지가 없습니다', 404)

  const { data: signedData, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(contact.business_card_url, 3600)

  if (signErr || !signedData) return err('STORAGE_ERROR', '서명 URL 생성 실패', 500)

  return ok({ signed_url: signedData.signedUrl, expires_in: 3600 })
})
