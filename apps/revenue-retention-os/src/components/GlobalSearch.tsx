'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Building2, RefreshCw, FileText, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type SearchHit = {
  type: 'company' | 'renewal' | 'contract' | 'contact'
  id: string
  title: string
  sub: string | null
  href: string
}

const TYPE_CFG: Record<SearchHit['type'], { label: string; icon: React.ElementType; cls: string }> = {
  company:  { label: '고객사', icon: Building2,  cls: 'text-dk-blue' },
  contact:  { label: '담당자', icon: User,        cls: 'text-tint-purple-text' },
  contract: { label: '계약',   icon: FileText,    cls: 'text-dk-green' },
  renewal:  { label: '갱신',   icon: RefreshCw,   cls: 'text-dk-orange' },
}

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor,  setCursor]  = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`)
      const json = await res.json()
      setResults(json.data ?? [])
      setCursor(0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, doSearch])

  const navigate = useCallback((href: string) => {
    router.push(href)
    onClose()
  }, [router, onClose])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (!results.length) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
      if (e.key === 'Enter')     { e.preventDefault(); navigate(results[cursor]?.href ?? '#') }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [results, cursor, navigate, onClose])

  // group by type
  const groups: { type: SearchHit['type']; items: SearchHit[] }[] = []
  for (const hit of results) {
    const last = groups[groups.length - 1]
    if (last?.type === hit.type) { last.items.push(hit) }
    else { groups.push({ type: hit.type, items: [hit] }) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-dk-surface border border-dk-border rounded-2xl shadow-2xl overflow-hidden">
        {/* 입력창 */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-dk-border">
          {loading
            ? <Loader2 className="w-4 h-4 text-dk-muted animate-spin shrink-0" />
            : <Search className="w-4 h-4 text-dk-muted shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="고객사, 담당자, 계약번호 검색..."
            className="flex-1 bg-transparent text-sm text-dk-text placeholder:text-dk-dim outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
              className="text-dk-dim hover:text-dk-muted">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline text-[10px] text-dk-dim border border-dk-border rounded px-1.5 py-0.5 shrink-0">ESC</kbd>
        </div>

        {/* 결과 */}
        <div className="max-h-[360px] overflow-y-auto">
          {query.length < 2 ? (
            <p className="text-xs text-dk-dim text-center py-8">2글자 이상 입력하면 검색을 시작합니다</p>
          ) : results.length === 0 && !loading ? (
            <p className="text-xs text-dk-dim text-center py-8">검색 결과가 없습니다</p>
          ) : (
            <div className="py-2">
              {groups.map(group => {
                const cfg = TYPE_CFG[group.type]
                const Icon = cfg.icon
                return (
                  <div key={group.type}>
                    <p className="text-[10px] font-semibold text-dk-dim uppercase tracking-wider px-4 py-1.5 mt-1">
                      {cfg.label}
                    </p>
                    {group.items.map(hit => {
                      const isCurrent = results.indexOf(hit) === cursor
                      return (
                        <button
                          key={hit.id + hit.type}
                          onClick={() => navigate(hit.href)}
                          onMouseEnter={() => setCursor(results.indexOf(hit))}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            isCurrent ? 'bg-dk-surface2' : 'hover:bg-dk-surface2/60'
                          )}
                        >
                          <div className={cn('w-7 h-7 rounded-lg bg-dk-surface2 border border-dk-border flex items-center justify-center shrink-0', isCurrent && 'border-dk-border2')}>
                            <Icon className={cn('w-3.5 h-3.5', cfg.cls)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-dk-text truncate font-medium">{hit.title}</p>
                            {hit.sub && <p className="text-xs text-dk-dim truncate mt-0.5">{hit.sub}</p>}
                          </div>
                          {isCurrent && (
                            <kbd className="text-[10px] text-dk-dim border border-dk-border rounded px-1.5 py-0.5 shrink-0">↵</kbd>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 단축키 힌트 */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-dk-border bg-dk-surface2/50">
          <span className="text-[10px] text-dk-dim">↑↓ 이동</span>
          <span className="text-[10px] text-dk-dim">↵ 열기</span>
          <span className="text-[10px] text-dk-dim">ESC 닫기</span>
        </div>
      </div>
    </div>
  )
}
