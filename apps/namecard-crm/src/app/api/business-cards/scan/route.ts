// POST /api/business-cards/scan
// 명함 이미지(Base64)를 core-api로 전달해 연락처 필드를 추출하고,
// Hard(이메일·휴대폰 일치) + Soft(같은 회사 + 이름 유사) 중복 후보를 반환한다.

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
  const { supabase } = createRouteHandlerClient(req)

  // Hard 중복: 이메일 또는 휴대폰 일치
  const hardConditions: string[] = []
  if (extracted.email)  hardConditions.push(`email.eq.${extracted.email}`)
  if (extracted.mobile) hardConditions.push(`mobile.eq.${extracted.mobile}`)

  const hardSet = new Set<string>()
  let duplicateContacts: unknown[] = []

  if (hardConditions.length > 0) {
    const { data: hardDupes } = await supabase
      .from('contacts')
      .select('id, name, title, email, mobile, company:companies!company_id(id, name)')
      .eq('tenant_id', ctx.tenantId)
      .or(hardConditions.join(','))
    for (const d of hardDupes ?? []) {
      hardSet.add((d as { id: string }).id)
      duplicateContacts.push({ ...(d as object), match_type: 'hard' })
    }
  }

  // Soft 중복: 같은 회사명 + 이름 첫 글자 일치 (이름 2자 이상일 때)
  if (extracted.company_name?.trim() && extracted.contact_name?.trim()) {
    const namePrefix = extracted.contact_name.trim().slice(0, 2)

    // 같은 회사 ID 조회
    const { data: companyRows } = await supabase
      .from('companies')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .ilike('name', extracted.company_name.trim())

    const companyIds = (companyRows ?? []).map(c => (c as { id: string }).id)

    if (companyIds.length > 0) {
      const { data: softDupes } = await supabase
        .from('contacts')
        .select('id, name, title, email, mobile, company:companies!company_id(id, name)')
        .eq('tenant_id', ctx.tenantId)
        .in('company_id', companyIds)
        .ilike('name', `${namePrefix}%`)

      for (const d of softDupes ?? []) {
        if (!hardSet.has((d as { id: string }).id)) {
          duplicateContacts.push({ ...(d as object), match_type: 'soft' })
        }
      }
    }
  }

  return ok({ extracted, duplicate_contacts: duplicateContacts })
})
