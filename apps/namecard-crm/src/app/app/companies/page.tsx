'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Building2, Phone, Globe, Users, Plus, Loader2 } from 'lucide-react'
import type { Company } from '@/types/domain'

type CompanyWithCount = Company & { contact_count: number }

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyWithCount[]>([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [q,         setQ]         = useState('')

  const fetch_ = useCallback(async (query: string) => {
    setLoading(true)
    const params = new URLSearchParams(query ? { q: query } : {})
    const res = await fetch(`/api/companies?${params}`).then(r => r.json()).catch(() => ({}))
    const data = res.data ?? []
    setCompanies(data)
    setTotal(data.length)
    setLoading(false)
  }, [])

  useEffect(() => { fetch_(q) }, [q, fetch_])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-dk-text">회사목록</h1>
          <p className="text-xs text-dk-muted mt-0.5">총 {total.toLocaleString()}개사</p>
        </div>
        <Link
          href="/app/companies/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-dk-accent text-white text-sm font-medium rounded-lg hover:bg-dk-accentHover transition-colors"
        >
          <Plus className="w-4 h-4" />회사 추가
        </Link>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-dk-dim" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="회사명 검색..."
          className="w-full pl-8 pr-3 py-2 text-sm bg-dk-surface border border-dk-border rounded-lg text-dk-text placeholder-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue/50"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-dk-muted" /></div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-8 h-8 text-dk-dim mx-auto mb-3" />
          <p className="text-dk-muted text-sm">{q ? '검색 결과가 없습니다' : '등록된 회사가 없습니다'}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {companies.map(c => (
            <Link
              key={c.id}
              href={`/app/companies/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 bg-dk-surface border border-dk-border rounded-xl hover:bg-dk-surface2 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-tint-blue flex items-center justify-center text-dk-blue text-sm font-bold shrink-0">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dk-text">{c.name}</p>
                <p className="text-xs text-dk-muted truncate">{c.address ?? '주소 없음'}</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 shrink-0 text-dk-dim">
                {c.main_phone && <span title={c.main_phone}><Phone className="w-3.5 h-3.5" /></span>}
                {c.website    && <span title={c.website}><Globe className="w-3.5 h-3.5" /></span>}
                <span className="flex items-center gap-1 text-xs text-dk-muted">
                  <Users className="w-3.5 h-3.5" />{c.contact_count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
