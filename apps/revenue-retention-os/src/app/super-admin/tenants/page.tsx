'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building2, Plus, Search, ChevronRight, Loader2, Download
} from 'lucide-react'
import { cn, formatAmount, formatDate } from '@/lib/utils'
import type { SubscriptionStatus } from '@/types/domain'
import { PlanBadge, SubscriptionStatusBadge, SUBSCRIPTION_STATUS_CFG } from '../_components/badges'
import { downloadCsv } from '../_components/csv'

type TenantRow = {
  id: string; name: string; biz_no: string; is_active: boolean; created_at: string
  plan: string; plan_code: string; subscription_status: string
  expires_at: string; user_count: number; company_count: number
  mrr: number; last_login_at: string | null
}

/** 신규 테넌트 등록 모달.
 *  POST /api/super-admin/tenants 호출 → tenants 레코드 생성 + 체험 구독 추가 +
 *  관리자 이메일로 초대 메일 발송. 성공 시 부모의 onCreated 콜백으로 목록을 새로고침한다. */
function NewTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', biz_no: '', admin_email: '', admin_name: '', plan: 'standard' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setError(json.error?.message ?? '등록에 실패했습니다'); return }
      onCreated()
      onClose()
    } catch {
      setError('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6">
        <h2 className="text-base font-bold text-white mb-5">신규 테넌트 등록</h2>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <div className="space-y-3.5">
          {[
            { key: 'name', label: '회사명 *', placeholder: '(주)회사명' },
            { key: 'biz_no', label: '사업자등록번호', placeholder: '000-00-00000' },
            { key: 'admin_email', label: '관리자 이메일 *', placeholder: 'admin@company.com' },
            { key: 'admin_name', label: '관리자 이름 *', placeholder: '홍길동' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
              <input
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">초기 플랜</label>
            <select
              value={form.plan}
              onChange={e => setForm(prev => ({ ...prev, plan: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="free">Free</option>
              <option value="standard">Standard</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700">
            취소
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
            {saving ? '처리 중...' : '등록 + 초대메일 발송'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** 테넌트 관리 페이지(목록).
 *  검색어/상태 필터를 적용해 /api/super-admin/tenants에서 최대 100건을 가져오고,
 *  활성 MRR 합계와 함께 표로 표시한다. 우측 상단 '테넌트 등록' 버튼으로 신규 등록 모달을 연다. */
export default function TenantsPage() {
  const [tenants, setTenants]       = useState<TenantRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [q, setQ]                   = useState('')
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all')
  const [showModal, setShowModal]   = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (q) params.set('q', q)
    fetch(`/api/super-admin/tenants?${params}`)
      .then(r => r.json())
      .then(json => {
        setTenants((json.data?.data ?? []) as TenantRow[])
        setTotalCount(json.data?.count ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = tenants.filter(t => {
    const matchQ = !q || t.name.includes(q) || t.biz_no.includes(q)
    const matchStatus = statusFilter === 'all' || t.subscription_status === statusFilter
    return matchQ && matchStatus
  })

  const totalMrr = filtered.filter(t => t.is_active).reduce((s, t) => s + t.mrr, 0)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">테넌트 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">전체 {totalCount}개 · 활성 MRR {formatAmount(totalMrr)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCsv(`tenants_${new Date().toISOString().slice(0, 10)}.csv`, tenants.map(t => ({
              테넌트명: t.name, 사업자번호: t.biz_no, 활성: t.is_active ? 'Y' : 'N',
              플랜: t.plan, 구독상태: t.subscription_status, 만료일: t.expires_at,
              사용자수: t.user_count, 고객사수: t.company_count, MRR: t.mrr,
              가입일: t.created_at,
            })))}
            className="flex items-center gap-1.5 text-gray-300 border border-gray-700 hover:border-gray-500 text-sm px-3 py-2 rounded-lg transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> 테넌트 등록
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-500" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="테넌트명, 사업자번호 검색"
            className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none flex-1"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'trialing', 'past_due', 'cancelled'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
                statusFilter === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300')}>
              {s === 'all' ? '전체' : SUBSCRIPTION_STATUS_CFG[s as SubscriptionStatus]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                {['테넌트', '플랜', '구독 상태', '만료일', '사용자/고객사', 'MRR', '최근 접속', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-white/3 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                        t.is_active ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-700 text-gray-500')}>
                        {t.name[0]}
                      </div>
                      <div>
                        <p className={cn('text-sm font-medium', t.is_active ? 'text-gray-100' : 'text-gray-500')}>{t.name}</p>
                        <p className="text-[10px] text-gray-500">{t.biz_no}</p>
                      </div>
                      {!t.is_active && <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full">정지</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><PlanBadge plan={t.plan} /></td>
                  <td className="px-4 py-3.5"><SubscriptionStatusBadge status={t.subscription_status} /></td>
                  <td className="px-4 py-3.5">
                    <p className={cn('text-xs font-mono', t.expires_at && new Date(t.expires_at) < new Date() ? 'text-red-400' : 'text-gray-300')}>
                      {t.expires_at ? formatDate(t.expires_at) : '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-300">
                      <span className="text-gray-200 font-medium">{t.user_count}</span>
                      <span className="text-gray-600 mx-1">/</span>
                      <span className="text-gray-200 font-medium">{t.company_count}</span>
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className={cn('text-xs font-mono font-semibold', t.mrr > 0 ? 'text-blue-400' : 'text-gray-600')}>
                      {t.mrr > 0 ? formatAmount(t.mrr) : '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-[10px] text-gray-500">{t.last_login_at ? formatDate(t.last_login_at) : '없음'}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/super-admin/tenants/${t.id}`}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      상세 <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="py-16 text-center">
              <Building2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">검색 결과가 없습니다</p>
            </div>
          )}
        </div>
      )}

      {showModal && <NewTenantModal onClose={() => setShowModal(false)} onCreated={load} />}
    </div>
  )
}
