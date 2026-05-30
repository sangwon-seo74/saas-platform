import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: '제품 등록' }

async function createProductAction(formData: FormData) {
  'use server'
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (!tenantId || role !== 'admin') redirect('/app/products')

  const name = formData.get('name')?.toString().trim()
  if (!name) redirect('/app/products/new?error=name')

  const priceRaw = formData.get('price')?.toString().trim()
  const price    = priceRaw ? parseInt(priceRaw, 10) : null

  const supabase = await createClient()
  const { error } = await supabase
    .schema('lso')
    .from('products')
    .insert({
      tenant_id: tenantId,
      name,
      category:  formData.get('category')?.toString().trim()  || null,
      unit:      formData.get('unit')?.toString().trim()       || '개',
      price:     Number.isFinite(price) ? price : null,
      is_active: true,
    })

  if (error) redirect('/app/products/new?error=db')
  redirect('/app/products')
}

const INPUT = 'w-full px-3 py-2 bg-dk-surface2 border border-dk-border rounded-lg text-sm text-dk-text placeholder-dk-dim focus:outline-none focus:border-dk-border2'
const LABEL = 'block text-xs text-dk-muted mb-1.5'

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const headersList = await headers()
  const role = headersList.get('x-user-role') ?? 'rep'
  if (role !== 'admin') redirect('/app/products')

  const { error } = await searchParams
  const errorMsg =
    error === 'name' ? '제품명은 필수입니다.' :
    error === 'db'   ? 'DB 오류가 발생했습니다. 다시 시도해주세요.' :
    null

  return (
    <div className="p-4 lg:p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/products" className="p-1.5 rounded-lg text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-bold text-dk-text">제품 등록</h1>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 bg-tint-red border border-tint-red-border rounded-lg text-dk-red text-sm">
          {errorMsg}
        </div>
      )}

      <form action={createProductAction} className="space-y-4">
        <div className="bg-dk-surface border border-dk-border rounded-xl p-4 space-y-4">
          <div>
            <label className={LABEL}>제품명 <span className="text-dk-red">*</span></label>
            <input name="name" required placeholder="예) 참이슬 후레쉬" className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>카테고리</label>
              <input name="category" placeholder="예) 소주, 맥주, 와인" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>단위</label>
              <input name="unit" placeholder="예) 박스, 병, 캔" defaultValue="개" className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>단가 (원)</label>
            <input name="price" type="number" min={0} step={100} placeholder="0" className={INPUT} />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Link
            href="/app/products"
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
