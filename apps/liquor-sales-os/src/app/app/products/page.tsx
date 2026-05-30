import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Package, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/domain'

export const metadata: Metadata = { title: '제품 관리' }

export default async function ProductsPage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64 text-dk-muted text-sm">
        관리자만 접근 가능합니다.
      </div>
    )
  }

  const supabase = await createClient()
  const { data } = await supabase
    .schema('lso')
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('category')
    .order('name')

  const products = (data ?? []) as unknown as Product[]

  const byCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category ?? '기타'
    acc[cat] = acc[cat] ?? []
    acc[cat].push(p)
    return acc
  }, {})

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-dk-text">제품 관리</h1>
          <p className="text-xs text-dk-muted mt-0.5">총 {products.length}개</p>
        </div>
        <Link
          href="/app/products/new"
          className="px-3 py-1.5 bg-dk-accent text-white text-sm font-semibold rounded-lg hover:bg-dk-accentHover transition-colors"
        >
          + 제품 등록
        </Link>
      </div>

      {Object.keys(byCategory).length === 0 ? (
        <div className="py-16 text-center text-dk-dim text-sm flex flex-col items-center gap-2">
          <Package className="w-6 h-6" />제품이 없습니다
        </div>
      ) : (
        Object.entries(byCategory).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h2 className="text-xs font-semibold text-dk-muted uppercase tracking-wide mb-2">{category}</h2>
            <div className="space-y-1">
              {items.map(product => (
                <div
                  key={product.id}
                  className={cn(
                    'flex items-center gap-3 p-3 bg-dk-surface border border-dk-border rounded-lg',
                    !product.is_active && 'opacity-50'
                  )}
                >
                  <Package className="w-4 h-4 text-dk-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dk-text">{product.name}</p>
                    <p className="text-xs text-dk-dim">{product.unit}</p>
                  </div>
                  {product.price !== null && (
                    <p className="text-sm font-tabular text-dk-text shrink-0">
                      {product.price.toLocaleString()}원
                    </p>
                  )}
                  {!product.is_active && <span className="text-[10px] text-dk-dim shrink-0">비활성</span>}
                  <Link href={`/app/products/${product.id}`} className="p-1.5 text-dk-dim hover:text-dk-muted hover:bg-dk-surface2 rounded transition-colors shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
