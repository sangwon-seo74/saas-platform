import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/types/domain'

export const metadata: Metadata = { title: '제품 수정' }

async function updateProductAction(formData: FormData) {
  'use server'
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (!tenantId || role !== 'admin') redirect('/app/products')

  const id   = formData.get('id')?.toString()
  const name = formData.get('name')?.toString().trim()
  if (!id || !name) redirect(`/app/products/${id ?? ''}?error=name`)

  const priceRaw  = formData.get('price')?.toString().trim()
  const price     = priceRaw ? parseInt(priceRaw, 10) : null
  const is_active = formData.get('is_active') === 'true'

  const supabase = await createClient()
  const { error } = await supabase
    .schema('lso')
    .from('products')
    .update({
      name,
      category:   formData.get('category')?.toString().trim()  || null,
      unit:       formData.get('unit')?.toString().trim()       || '개',
      price:      Number.isFinite(price) ? price : null,
      is_active,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) redirect(`/app/products/${id}?error=db`)
  redirect('/app/products')
}

async function deleteProductAction(formData: FormData) {
  'use server'
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (!tenantId || role !== 'admin') redirect('/app/products')

  const id = formData.get('id')?.toString()
  if (!id) redirect('/app/products')

  const supabase = await createClient()
  await supabase
    .schema('lso')
    .from('products')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  redirect('/app/products')
}

const INPUT = 'w-full px-3 py-2 bg-dk-surface2 border border-dk-border rounded-lg text-sm text-dk-text placeholder-dk-dim focus:outline-none focus:border-dk-border2'
const LABEL = 'block text-xs text-dk-muted mb-1.5'

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { id } = await params
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (role !== 'admin') redirect('/app/products')

  const supabase = await createClient()
  const { data } = await supabase
    .schema('lso')
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!data) notFound()
  const product = data as unknown as Product

  const { error: errParam } = await searchParams
  const errorMsg =
    errParam === 'name' ? '제품명은 필수입니다.' :
    errParam === 'db'   ? 'DB 오류가 발생했습니다. 다시 시도해주세요.' :
    null

  return (
    <div className="p-4 lg:p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/products" className="p-1.5 rounded-lg text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-bold text-dk-text">제품 수정</h1>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 bg-tint-red border border-tint-red-border rounded-lg text-dk-red text-sm">
          {errorMsg}
        </div>
      )}

      <form action={updateProductAction} className="space-y-4">
        <input type="hidden" name="id" value={product.id} />

        <div className="bg-dk-surface border border-dk-border rounded-xl p-4 space-y-4">
          <div>
            <label className={LABEL}>제품명 <span className="text-dk-red">*</span></label>
            <input name="name" required defaultValue={product.name} className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>카테고리</label>
              <input name="category" defaultValue={product.category ?? ''} placeholder="예) 소주, 맥주, 와인" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>단위</label>
              <input name="unit" defaultValue={product.unit} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>단가 (원)</label>
            <input name="price" type="number" min={0} step={100} defaultValue={product.price ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>활성 상태</label>
            <select name="is_active" defaultValue={product.is_active ? 'true' : 'false'} className={INPUT}>
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
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
            저장
          </button>
        </div>
      </form>

      <form action={deleteProductAction} className="mt-4">
        <input type="hidden" name="id" value={product.id} />
        <button
          type="submit"
          className="w-full py-2.5 text-sm font-medium text-dk-red border border-tint-red-border rounded-lg hover:bg-tint-red transition-colors"
        >
          비활성화 처리
        </button>
      </form>
    </div>
  )
}
