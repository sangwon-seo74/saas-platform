'use client'

import { useState, useEffect } from 'react'
import {
  Package, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Loader2
} from 'lucide-react'
import { cn, formatAmount } from '@/lib/utils'
import type { Product, BillingCycle } from '@/types/domain'

const BILLING_LABEL: Record<BillingCycle, string> = { monthly: '월간', yearly: '연간' }
const BILLING_CLASS: Record<BillingCycle, string> = {
  monthly: 'bg-dk-blue/10 text-dk-blue border-dk-blue/30',
  yearly:  'bg-dk-purple/10 text-dk-purple border-dk-purple/30',
}
const CATEGORIES = ['CRM', '유지보수', '교육', '컨설팅', '기타']

function ProductModal({ product, onClose, onSaved }: {
  product?: Product | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name:          product?.name          ?? '',
    category:      product?.category      ?? '',
    unit_price:    product?.unit_price?.toString() ?? '',
    billing_cycle: (product?.billing_cycle ?? 'yearly') as BillingCycle,
    description:   product?.description   ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true); setError('')
    try {
      const payload = {
        name:          form.name.trim(),
        category:      form.category || null,
        unit_price:    form.unit_price ? Number(form.unit_price) : null,
        billing_cycle: form.billing_cycle,
        description:   form.description || null,
      }
      const url    = product ? `/api/settings/products/${product.id}` : '/api/settings/products'
      const method = product ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error?.message ?? '저장에 실패했습니다'); return }
      onSaved(); onClose()
    } catch {
      setError('요청 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dk-surface border border-dk-border rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-dk-text">
            {product ? '제품 편집' : '새 제품 추가'}
          </h2>
          <button onClick={onClose} className="text-dk-dim hover:text-dk-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">제품명 *</label>
            <input autoFocus value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="예: 고객관리 솔루션 Standard"
              className="w-full px-3 py-2 border border-dk-border rounded-lg text-sm bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">카테고리</label>
              <select value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-dk-border rounded-lg text-sm bg-dk-surface2 text-dk-text focus:outline-none focus:ring-2 focus:ring-dk-blue">
                <option value="">선택 안 함</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-dk-muted mb-1 block">결제 주기</label>
              <select value={form.billing_cycle}
                onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value as BillingCycle }))}
                className="w-full px-3 py-2 border border-dk-border rounded-lg text-sm bg-dk-surface2 text-dk-text focus:outline-none focus:ring-2 focus:ring-dk-blue">
                <option value="monthly">월간</option>
                <option value="yearly">연간</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">단가 (원)</label>
            <input type="number" value={form.unit_price}
              onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
              placeholder="150000"
              className="w-full px-3 py-2 border border-dk-border rounded-lg text-sm bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue" />
          </div>
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">설명</label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="제품에 대한 간략한 설명을 입력하세요"
              className="w-full px-3 py-2 border border-dk-border rounded-lg text-sm bg-dk-surface2 text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue resize-none" />
          </div>
        </div>

        {error && <p className="text-xs text-dk-red mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2">
            취소
          </button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            className="flex-1 py-2 text-sm text-white bg-dk-blue rounded-lg hover:bg-dk-blue/80 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {product ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}

type ProductWithCount = Product & { active_contract_count?: number }

function ProductRow({ product, onEdit, onDelete, onToggle }: {
  product: ProductWithCount
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <div className={cn(
      'flex items-center gap-4 px-5 py-4 border-b border-dk-border hover:bg-dk-surface2/40 transition-colors last:border-0',
      !product.is_active && 'opacity-60'
    )}>
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        product.is_active ? 'bg-dk-blue/10' : 'bg-dk-surface2'
      )}>
        <Package className={cn('w-4 h-4', product.is_active ? 'text-dk-blue' : 'text-dk-dim')} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-dk-text">{product.name}</p>
          {product.category && (
            <span className="text-xs px-1.5 py-0.5 bg-dk-surface2 text-dk-muted rounded-md">
              {product.category}
            </span>
          )}
          {!product.is_active && (
            <span className="text-xs px-1.5 py-0.5 bg-dk-surface2 text-dk-dim rounded-md border border-dk-border">
              비활성
            </span>
          )}
        </div>
        {product.description && (
          <p className="text-xs text-dk-dim mt-0.5 truncate max-w-xs">{product.description}</p>
        )}
        {(product.active_contract_count ?? 0) > 0 && (
          <p className="text-xs text-dk-green mt-0.5">활성 계약 {product.active_contract_count}건</p>
        )}
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-dk-text">
          {product.unit_price ? formatAmount(product.unit_price) : '—'}
        </p>
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full border font-medium',
          BILLING_CLASS[product.billing_cycle]
        )}>
          {BILLING_LABEL[product.billing_cycle]}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onToggle}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            product.is_active ? 'text-dk-green hover:bg-dk-green/10' : 'text-dk-dim hover:bg-dk-surface2'
          )}
          title={product.is_active ? '비활성화' : '활성화'}>
          {product.is_active
            ? <ToggleRight className="w-5 h-5" />
            : <ToggleLeft className="w-5 h-5" />
          }
        </button>
        <button onClick={onEdit}
          className="p-1.5 rounded-lg text-dk-dim hover:text-dk-blue hover:bg-dk-blue/10 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete}
          className="p-1.5 rounded-lg text-dk-dim hover:text-dk-red hover:bg-dk-red/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function ProductsSettingsPage() {
  const [loading, setLoading]             = useState(true)
  const [products, setProducts]           = useState<ProductWithCount[]>([])
  const [showModal, setShowModal]         = useState(false)
  const [editing, setEditing]             = useState<Product | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  function loadProducts() {
    setLoading(true)
    fetch('/api/settings/products?limit=100')
      .then(r => r.json())
      .then(json => setProducts(json.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadProducts() }, [])

  const handleDelete = async (p: ProductWithCount) => {
    const msg = (p.active_contract_count ?? 0) > 0
      ? `이 제품은 활성 계약 ${p.active_contract_count}건에 연결되어 있어 비활성화됩니다. 계속할까요?`
      : '제품을 삭제하시겠습니까?'
    if (!confirm(msg)) return
    await fetch(`/api/settings/products/${p.id}`, { method: 'DELETE' }).catch(() => {})
    loadProducts()
  }

  const handleToggle = async (p: ProductWithCount) => {
    await fetch(`/api/settings/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !p.is_active }),
    }).catch(() => {})
    loadProducts()
  }

  const categories = ['all', ...Array.from(new Set(
    products.map(p => p.category).filter((c): c is string => !!c)
  ))]
  const filtered = filterCategory === 'all'
    ? products
    : products.filter(p => p.category === filterCategory)

  const activeCount = products.filter(p => p.is_active).length

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-dk-text">제품 관리</h1>
          <p className="text-sm text-dk-muted mt-0.5">계약에 연결할 제품 및 서비스 목록을 관리합니다</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-1.5 bg-dk-blue text-white text-sm px-3.5 py-2 rounded-lg hover:bg-dk-blue/80">
          <Plus className="w-4 h-4" /> 제품 추가
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-dk-surface border border-dk-border rounded-xl px-4 py-3">
          <p className="text-xs text-dk-muted">전체 제품</p>
          <p className="text-2xl font-bold text-dk-text">{products.length}</p>
        </div>
        <div className="bg-dk-surface border border-dk-green/30 rounded-xl px-4 py-3">
          <p className="text-xs text-dk-green">활성</p>
          <p className="text-2xl font-bold text-dk-green">{activeCount}</p>
        </div>
        <div className="bg-dk-surface border border-dk-border rounded-xl px-4 py-3">
          <p className="text-xs text-dk-muted">비활성</p>
          <p className="text-2xl font-bold text-dk-dim">{products.length - activeCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(c => (
          <button key={c} onClick={() => setFilterCategory(c)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
              filterCategory === c
                ? 'bg-dk-blue text-white border-dk-blue'
                : 'text-dk-muted border-dk-border hover:border-dk-border2 bg-dk-surface2'
            )}>
            {c === 'all' ? '전체' : c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-dk-muted" />
        </div>
      ) : (
        <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="w-10 h-10 text-dk-dim mx-auto mb-3" />
              <p className="text-sm text-dk-muted">등록된 제품이 없습니다</p>
              <button onClick={() => setShowModal(true)}
                className="mt-3 text-sm text-dk-blue hover:text-dk-blue/80">
                + 첫 번째 제품 추가
              </button>
            </div>
          ) : (
            filtered.map(p => (
              <ProductRow key={p.id} product={p}
                onEdit={() => { setEditing(p); setShowModal(true) }}
                onDelete={() => handleDelete(p)}
                onToggle={() => handleToggle(p)} />
            ))
          )}
        </div>
      )}

      {showModal && (
        <ProductModal
          product={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={loadProducts} />
      )}
    </div>
  )
}
