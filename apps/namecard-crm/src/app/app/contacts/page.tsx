'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Star, Phone, Mail, ScanLine, Loader2, Search, LayoutList, LayoutGrid, UserPlus } from 'lucide-react'
import { cn, formatRelative } from '@/lib/utils'
import type { Contact } from '@/types/domain'

type SortKey = 'created_at' | 'name' | 'last_contacted_at'
type ViewMode = 'list' | 'card'

export default function ContactsPage() {
  return (
    <Suspense>
      <ContactsContent />
    </Suspense>
  )
}

function ContactsContent() {
  const searchParams = useSearchParams()

  const [contacts, setContacts]   = useState<Contact[]>([])
  const [total,    setTotal]      = useState(0)
  const [loading,  setLoading]    = useState(true)
  const [view,     setView]       = useState<ViewMode>('list')
  const [sort,     setSort]       = useState<SortKey>('created_at')
  const [filterVip, setFilterVip] = useState(false)
  const [q,         setQ]         = useState('')

  const filter = searchParams?.get('filter')

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      sort, order: 'desc', limit: '50',
      ...(filterVip ? { is_vip: '1' } : {}),
      ...(q ? { q } : {}),
      ...(filter ? { filter } : {}),
    })
    const res = await fetch(`/api/contacts?${params}`).then(r => r.json()).catch(() => ({}))
    setContacts(res.data?.data ?? [])
    setTotal(res.data?.total ?? 0)
    setLoading(false)
  }, [sort, filterVip, q, filter])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-dk-text">고객목록</h1>
          <p className="text-xs text-dk-muted mt-0.5">총 {total.toLocaleString()}명</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app/contacts/new" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-dk-border text-dk-muted rounded-lg hover:bg-dk-surface2 transition-colors">
            <UserPlus className="w-4 h-4" />직접 등록
          </Link>
          <Link href="/app/scan" className="flex items-center gap-1.5 px-3 py-2 bg-dk-accent text-white text-sm font-medium rounded-lg hover:bg-dk-accentHover transition-colors">
            <ScanLine className="w-4 h-4" />명함 등록
          </Link>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-dk-dim" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="이름, 회사, 전화번호 검색..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-dk-surface border border-dk-border rounded-lg text-dk-text placeholder-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue/50"
          />
        </div>
        <button onClick={() => setFilterVip(v => !v)}
          className={cn('flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors', filterVip ? 'bg-dk-orange/10 border-dk-orange/30 text-dk-orange' : 'bg-dk-surface border-dk-border text-dk-muted hover:text-dk-text')}>
          <Star className="w-3.5 h-3.5" />VIP
        </button>
        <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
          className="px-3 py-2 text-sm bg-dk-surface border border-dk-border rounded-lg text-dk-text focus:outline-none focus:ring-2 focus:ring-dk-blue/50">
          <option value="created_at">최근 등록순</option>
          <option value="name">이름순</option>
          <option value="last_contacted_at">최근 연락순</option>
        </select>
        <div className="flex border border-dk-border rounded-lg overflow-hidden">
          <button onClick={() => setView('list')} className={cn('p-2 transition-colors', view === 'list' ? 'bg-dk-surface2 text-dk-text' : 'bg-dk-surface text-dk-dim hover:text-dk-muted')}>
            <LayoutList className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView('card')} className={cn('p-2 transition-colors', view === 'card' ? 'bg-dk-surface2 text-dk-text' : 'bg-dk-surface text-dk-dim hover:text-dk-muted')}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-dk-muted" /></div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-dk-muted">고객이 없습니다</p>
          <Link href="/app/scan" className="inline-flex items-center gap-1.5 text-sm text-dk-blue hover:text-dk-blueHover">
            <ScanLine className="w-4 h-4" />명함을 등록해보세요
          </Link>
        </div>
      ) : view === 'list' ? (
        <div className="space-y-1">
          {contacts.map(c => (
            <Link key={c.id} href={`/app/contacts/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 bg-dk-surface border border-dk-border rounded-xl hover:bg-dk-surface2 transition-colors">
              <div className="w-9 h-9 rounded-full bg-tint-blue flex items-center justify-center text-dk-blue text-sm font-bold shrink-0">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-dk-text">{c.name}</span>
                  {c.is_vip && <Star className="w-3 h-3 text-dk-orange fill-dk-orange" />}
                </div>
                <p className="text-xs text-dk-muted truncate">{c.company?.name ?? '—'} · {c.title ?? '—'}</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                {c.mobile && <a href={`tel:${c.mobile}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg text-dk-dim hover:text-dk-green hover:bg-dk-surface2 transition-colors" title={c.mobile}><Phone className="w-3.5 h-3.5" /></a>}
                {c.email  && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg text-dk-dim hover:text-dk-blue hover:bg-dk-surface2 transition-colors" title={c.email}><Mail className="w-3.5 h-3.5" /></a>}
              </div>
              <span className="text-[10px] text-dk-dim shrink-0 hidden md:block">{formatRelative(c.last_contacted_at)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {contacts.map(c => (
            <Link key={c.id} href={`/app/contacts/${c.id}`}
              className="p-4 bg-dk-surface border border-dk-border rounded-xl hover:bg-dk-surface2 transition-colors space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-full bg-tint-blue flex items-center justify-center text-dk-blue font-bold">
                  {c.name[0]}
                </div>
                {c.is_vip && <Star className="w-3.5 h-3.5 text-dk-orange fill-dk-orange" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-dk-text">{c.name}</p>
                <p className="text-xs text-dk-muted truncate">{c.company?.name ?? '—'}</p>
                <p className="text-xs text-dk-dim truncate">{c.title ?? '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                {c.mobile && <a href={`tel:${c.mobile}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg text-dk-dim hover:text-dk-green hover:bg-dk-surface2 transition-colors"><Phone className="w-3.5 h-3.5" /></a>}
                {c.email  && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg text-dk-dim hover:text-dk-blue hover:bg-dk-surface2 transition-colors"><Mail className="w-3.5 h-3.5" /></a>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

