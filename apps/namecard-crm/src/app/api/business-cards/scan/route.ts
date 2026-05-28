// POST /api/business-cards/scan
// 명함 이미지(Base64)를 core-api로 전달해 연락처 필드를 추출하고,
// 중복 담당자(이메일·휴대폰 일치) 후보를 함께 반환한다.

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'
import { scanBusinessCard } from '@saas/core-client'

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body) return err('INVALID_BODY', '요청 본문이 올바르지 않습니다')

  const { image_base64, media_type = 'image/jpeg' } = body as {
    image_base64?: string
    media_type?: string
  }
  if (!image_base64?.trim()) return err('VALIDATION', 'image_base64가 필요합니다')

  const { authClient } = createRouteHandlerClient(req)
  const { data: { session } } = await authClient.auth.getSession()
  const authToken = session?.access_token ?? ''

  // core-api OCR 호출
  const scanResult = await scanBusinessCard({ image_base64, media_type }, authToken)
  if (!scanResult.ok || !scanResult.data) {
    return err('SCAN_FAILED', scanResult.error?.message ?? 'OCR 처리에 실패했습니다', 502)
  }

  const extracted = scanResult.data

  // 중복 담당자 검색 (이메일 또는 휴대폰 일치)
  const { supabase } = createRouteHandlerClient(req)
  const orConditions: string[] = []
  if (extracted.email)  orConditions.push(`email.eq.${extracted.email}`)
  if (extracted.mobile) orConditions.push(`mobile.eq.${extracted.mobile}`)

  let duplicateContacts: unknown[] = []
  if (orConditions.length > 0) {
    const { data: dupes } = await supabase
      .from('contacts')
      .select('id, name, title, email, mobile, company:companies!company_id(id, name)')
      .eq('tenant_id', ctx.tenantId)
      .or(orConditions.join(','))
    duplicateContacts = dupes ?? []
  }

  return ok({ extracted, duplicate_contacts: duplicateContacts })
})
