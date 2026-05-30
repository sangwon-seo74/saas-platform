'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'

const INPUT_CLS = 'w-full px-3 py-2 text-sm bg-dk-surface border border-dk-border rounded-lg text-dk-text placeholder-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue/50'
const LABEL_CLS = 'block text-xs font-medium text-dk-muted mb-1.5'

export default function EditCompanyPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [form, setForm] = useState({ name: '', address: '', website: '', main_phone: '' })
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/companies/${id}`)
      .then(r => r.json())
      .then(j => {
        if (j.data) {
          setForm({
            name:       j.data.name       ?? '',
            address:    j.data.address    ?? '',
            website:    j.data.website    ?? '',
            main_phone: j.data.main_phone ?? '',
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('회사명은 필수입니다'); return }
    setSubmitting(true)
    setError(null)

    const res = await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:       form.name.trim()       || undefined,
        address:    form.address.trim()    || null,
        website:    form.website.trim()    || null,
        main_phone: form.main_phone.trim() || null,
      }),
    }).then(r => r.json()).catch(() => null)

    if (!res?.data) {
      setError(res?.error?.message ?? '저장 중 오류가 발생했습니다')
      setSubmitting(false)
      return
    }

    router.push(`/app/companies/${id}`)
  }

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-dk-muted" /></div>
  )

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/app/companies/${id}`} className="p-1.5 rounded-lg text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-dk-text">회사 수정</h1>
          <p className="text-xs text-dk-muted mt-0.5">{form.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={LABEL_CLS}>회사명 <span className="text-dk-red">*</span></label>
          <input value={form.name} onChange={e => set('name', e.target.value)} className={INPUT_CLS} autoFocus />
        </div>
        <div>
          <label className={LABEL_CLS}>대표 전화</label>
          <input value={form.main_phone} onChange={e => set('main_phone', e.target.value)} placeholder="02-000-0000" className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>주소</label>
          <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="서울시 강남구..." className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>웹사이트</label>
          <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://example.com" className={INPUT_CLS} />
        </div>

        {error && <p className="text-xs text-dk-red">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link href={`/app/companies/${id}`} className="flex-1 py-2.5 text-sm text-center text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
            취소
          </Link>
          <button
            type="submit"
            disabled={!form.name.trim() || submitting}
            className="flex-1 py-2.5 text-sm text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover disabled:opacity-40 flex items-center justify-center gap-2 font-medium transition-colors"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />저장 중...</> : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
