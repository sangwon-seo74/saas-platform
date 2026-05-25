'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, Building2, User, Receipt } from 'lucide-react'

type SearchResult = {
  tenants:  { id: string; name: string; biz_no: string | null }[]
  users:    { id: string; name: string; email: string; tenant_id: string }[]
  invoices: { id: string; invoice_no: string | null; tenant_id: string }[]
}

/** Cmd+K(또는 Ctrl+K) 글로벌 검색 명령 팔레트.
 *  슈퍼어드민 레이아웃에 마운트되어 단축키로 열린다.
 *  검색은 250ms 디바운스 후 /api/super-admin/search 호출. */
export function CommandPalette() {
  const router      = useRouter()
  const [open, setOpen]     = useState(false)
  const [q, setQ]           = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQ(''); setResult(null) }
  }, [open])

  useEffect(() => {
    if (!q || q.length < 2) { setResult(null); return }
    setLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/super-admin/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(json => setResult(json.data ?? null))
        .catch(() => setResult(null))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  if (!open) return null

  const go = (href: string) => {
    router.push(href)
    setOpen(false)
  }

  const total = (result?.tenants.length ?? 0) + (result?.users.length ?? 0) + (result?.invoices.length ?? 0)

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24" onClick={() => setOpen(false)}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-700">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            ref={inputRef}
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="테넌트, 사용자, 인보이스 검색…"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
          />
          <kbd className="text-[10px] text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-6 text-gray-500 text-xs gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> 검색 중...
            </div>
          )}
          {!loading && q.length >= 2 && total === 0 && (
            <p className="text-center text-xs text-gray-500 py-6">검색 결과가 없습니다</p>
          )}
          {!loading && q.length < 2 && (
            <p className="text-center text-xs text-gray-500 py-6">2자 이상 입력하세요</p>
          )}

          {(result?.tenants.length ?? 0) > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-gray-500 px-2 py-1 uppercase tracking-wider">테넌트</p>
              {result!.tenants.map(t => (
                <button key={t.id} onClick={() => go(`/super-admin/tenants/${t.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-left">
                  <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{t.name}</p>
                    {t.biz_no && <p className="text-[10px] text-gray-500">{t.biz_no}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {(result?.users.length ?? 0) > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-gray-500 px-2 py-1 uppercase tracking-wider">사용자</p>
              {result!.users.map(u => (
                <button key={u.id} onClick={() => go(`/super-admin/tenants/${u.tenant_id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-left">
                  <User className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{u.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {(result?.invoices.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 px-2 py-1 uppercase tracking-wider">인보이스</p>
              {result!.invoices.map(i => (
                <button key={i.id} onClick={() => go(`/super-admin/invoices/${i.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-left">
                  <Receipt className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-sm text-gray-200 truncate">{i.invoice_no ?? i.id.slice(0, 8)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
