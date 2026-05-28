'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Search, Loader2, User, Building2 } from 'lucide-react'

import type { Contact } from '@/types/domain'

export default function SearchPage() {
  const [q,       setQ]       = useState('')
  const [results, setResults] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => ({}))
    setResults(res.data?.contacts ?? [])
    setSearched(true)
    setLoading(false)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQ(e.target.value)
  }

  useEffect(() => {
    const t = setTimeout(() => search(q), 300)
    return () => clearTimeout(t)
  }, [q, search])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-bold text-dk-text">검색</h1>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dk-dim" />
        <input
          autoFocus
          value={q}
          onChange={handleChange}
          placeholder="이름, 회사, 전화번호, 이메일, 메모 검색..."
          className="w-full pl-10 pr-4 py-3 text-sm bg-dk-surface border border-dk-border rounded-xl text-dk-text placeholder-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue/50"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-dk-muted" /></div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <Search className="w-8 h-8 text-dk-dim mx-auto" />
          <p className="text-dk-muted text-sm">검색 결과가 없습니다</p>
          <p className="text-xs text-dk-dim">이름, 회사명, 전화번호, 이메일로 검색해보세요</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-dk-dim">{results.length}건 검색됨</p>
          {results.map(c => (
            <Link key={c.id} href={`/app/contacts/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 bg-dk-surface border border-dk-border rounded-xl hover:bg-dk-surface2 transition-colors">
              <div className="w-9 h-9 rounded-full bg-tint-blue flex items-center justify-center text-dk-blue text-sm font-bold shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dk-text">
                  <Highlight text={c.name} query={q} />
                </p>
                <div className="flex items-center gap-1.5 text-xs text-dk-muted">
                  {c.company && (
                    <><Building2 className="w-3 h-3 shrink-0" /><span className="truncate"><Highlight text={c.company.name} query={q} /></span></>
                  )}
                  {c.title && <span className="text-dk-dim">· {c.title}</span>}
                </div>
                {c.mobile && <p className="text-xs text-dk-dim"><Highlight text={c.mobile} query={q} /></p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!q && (
        <div className="text-center py-12 space-y-2">
          <Search className="w-8 h-8 text-dk-dim mx-auto" />
          <p className="text-dk-muted text-sm">고객을 검색하세요</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['홍길동', '삼성', '010-', '@gmail.com'].map(hint => (
              <button key={hint} onClick={() => { setQ(hint); search(hint) }}
                className="text-xs px-3 py-1.5 bg-dk-surface border border-dk-border rounded-full text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
                {hint}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-dk-orange/30 text-dk-orange rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

