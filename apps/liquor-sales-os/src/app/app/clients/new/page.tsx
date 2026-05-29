import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CLIENT_TYPE_LABEL } from '@/lib/utils'

export const metadata: Metadata = { title: '거래처 등록' }

async function createClientAction(formData: FormData) {
  'use server'
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role = headersList.get('x-user-role') ?? 'rep'

  if (!tenantId || role === 'rep') redirect('/app/clients')

  const name = formData.get('name')?.toString().trim()
  if (!name) redirect('/app/clients/new?error=name')

  const supabase = await createClient()
  const { data, error } = await supabase
    .schema('lso')
    .from('clients')
    .insert({
      tenant_id:      tenantId,
      name,
      client_type:    formData.get('client_type')?.toString() ?? 'other',
      biz_no:         formData.get('biz_no')?.toString().trim()         || null,
      owner_name:     formData.get('owner_name')?.toString().trim()     || null,
      phone:          formData.get('phone')?.toString().trim()          || null,
      mobile:         formData.get('mobile')?.toString().trim()         || null,
      address:        formData.get('address')?.toString().trim()        || null,
      address_detail: formData.get('address_detail')?.toString().trim() || null,
      region:         formData.get('region')?.toString().trim()         || null,
      notes:          formData.get('notes')?.toString().trim()          || null,
    })
    .select('id')
    .single()

  if (error) redirect('/app/clients/new?error=db')
  redirect(`/app/clients/${data.id}`)
}

const INPUT = 'w-full px-3 py-2 bg-dk-surface2 border border-dk-border rounded-lg text-sm text-dk-text placeholder-dk-dim focus:outline-none focus:border-dk-border2'
const LABEL = 'block text-xs text-dk-muted mb-1.5'

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const { error } = await searchParams

  const errorMsg =
    error === 'name' ? '업체명은 필수입니다.' :
    error === 'db'   ? 'DB 오류가 발생했습니다. 다시 시도해주세요.' :
    null

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/clients" className="p-1.5 rounded-lg text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-bold text-dk-text">거래처 등록</h1>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 bg-tint-red border border-tint-red-border rounded-lg text-dk-red text-sm">
          {errorMsg}
        </div>
      )}

      <form action={createClientAction} className="space-y-4">
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-dk-text">기본 정보</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>업체명 <span className="text-dk-red">*</span></label>
              <input name="name" required placeholder="예) 홍길동 식당" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>업체 유형 <span className="text-dk-red">*</span></label>
              <select name="client_type" className={INPUT}>
                {Object.entries(CLIENT_TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>대표자명</label>
              <input name="owner_name" placeholder="홍길동" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>사업자등록번호</label>
              <input name="biz_no" placeholder="000-00-00000" className={INPUT} />
            </div>
          </div>
        </div>

        <div className="bg-dk-surface border border-dk-border rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-dk-text">연락처</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>대표 전화</label>
              <input name="phone" type="tel" placeholder="02-000-0000" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>담당자 연락처</label>
              <input name="mobile" type="tel" placeholder="010-0000-0000" className={INPUT} />
            </div>
          </div>
        </div>

        <div className="bg-dk-surface border border-dk-border rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-dk-text">위치</h2>
          <div>
            <label className={LABEL}>주소</label>
            <input name="address" placeholder="서울시 강남구 테헤란로 123" className={INPUT} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>상세 주소</label>
              <input name="address_detail" placeholder="2층 201호" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>지역</label>
              <input name="region" placeholder="강남구" className={INPUT} />
            </div>
          </div>
        </div>

        <div className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <label className={LABEL}>메모</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="특이사항, 요청사항 등"
            className={`${INPUT} resize-none`}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Link
            href="/app/clients"
            className="flex-1 py-2.5 text-center text-sm font-medium text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-dk-accent hover:bg-dk-accentHover rounded-lg transition-colors"
          >
            등록
          </button>
        </div>
      </form>
    </div>
  )
}
