'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import { ArrowLeft, Loader2, MapPin } from 'lucide-react'

type UserOption = { id: string; name: string }

declare global { interface Window { daum: { Postcode: new (opts: { oncomplete: (d: { zonecode: string; roadAddress: string; jibunAddress: string; userSelectedType: 'R' | 'J' }) => void }) => { open: () => void } } } }

const INDUSTRY_OPTIONS = [
  'IT서비스', '자동차IT', '금융IT', '통신', '제조', '유통/물류', '의료/바이오', '건설/부동산', '교육', '기타',
]

const INPUT_CLS = 'w-full px-3 py-2.5 border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-dk-blue focus:border-transparent'
const SELECT_CLS = 'w-full px-3 py-2 border border-dk-border bg-dk-surface2 text-dk-text rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-dk-blue focus:border-transparent'
const LABEL_CLS = 'text-xs font-medium text-dk-muted mb-1 block'

export default function NewCompanyPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', biz_no: '', industry: '', company_size: '',
    website: '', address_zip: '', address_road: '', address_detail: '', memo: '',
    assigned_user_id: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(j => setUsers(j.data ?? [])).catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('고객사명은 필수입니다'); return }
    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:           form.name.trim(),
        biz_no:           form.biz_no.trim()         || null,
        industry:         form.industry              || null,
        company_size:     form.company_size          || null,
        website:          form.website.trim()        || null,
        address_zip:      form.address_zip           || null,
        address_road:     form.address_road          || null,
        address_detail:   form.address_detail.trim() || null,
        memo:             form.memo.trim()           || null,
        assigned_user_id: form.assigned_user_id      || null,
      }),
    })
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setError(json?.error?.message ?? '등록 중 오류가 발생했습니다')
      setSubmitting(false)
      return
    }

    router.push(`/app/companies/${json.data?.id ?? ''}`)
  }

  return (
    <div className="p-6 max-w-lg">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" />
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/companies"
          className="p-1.5 rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-dk-text">고객사 등록</h1>
          <p className="text-xs text-dk-dim mt-0.5">회사명만 입력해도 등록됩니다</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-dk-surface border border-dk-border rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-dk-muted uppercase tracking-wide">필수 정보</h3>
          <div>
            <label className={LABEL_CLS}>
              회사명 <span className="text-dk-red">*</span>
            </label>
            <input
              autoFocus
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="(주)회사명"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>사업자등록번호</label>
            <input
              value={form.biz_no}
              onChange={e => set('biz_no', e.target.value)}
              placeholder="000-00-00000"
              className={INPUT_CLS}
            />
          </div>
        </div>

        <div className="bg-dk-surface border border-dk-border rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-dk-muted uppercase tracking-wide">추가 정보 (선택)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>업종</label>
              <select
                value={form.industry}
                onChange={e => set('industry', e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">선택</option>
                {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>기업 규모</label>
              <select
                value={form.company_size}
                onChange={e => set('company_size', e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">선택</option>
                <option value="large">대기업</option>
                <option value="medium">중견기업</option>
                <option value="small">중소기업</option>
                <option value="startup">스타트업</option>
              </select>
            </div>
          </div>
          {users.length > 0 && (
            <div>
              <label className={LABEL_CLS}>담당자</label>
              <select
                value={form.assigned_user_id}
                onChange={e => set('assigned_user_id', e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">담당자 없음</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={LABEL_CLS}>주소</label>
            <div className="flex gap-2 mb-2">
              <input readOnly value={form.address_zip} placeholder="우편번호"
                className={INPUT_CLS + ' w-24 bg-dk-surface cursor-default'} />
              <button type="button"
                onClick={() => new window.daum.Postcode({
                  oncomplete: d => {
                    set('address_zip', d.zonecode)
                    set('address_road', d.userSelectedType === 'J' ? d.jibunAddress : d.roadAddress)
                  }
                }).open()}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-dk-accent rounded-xl hover:bg-dk-accentHover shrink-0">
                <MapPin className="w-3.5 h-3.5" /> 주소 검색
              </button>
            </div>
            <input readOnly value={form.address_road} placeholder="도로명주소 (검색 후 자동 입력)"
              className={INPUT_CLS + ' mb-2 bg-dk-surface cursor-default'} />
            <input value={form.address_detail} onChange={e => set('address_detail', e.target.value)}
              placeholder="상세주소 (동/호수, 층 등)" className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>웹사이트</label>
            <input
              value={form.website}
              onChange={e => set('website', e.target.value)}
              placeholder="https://example.com"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>메모</label>
            <textarea
              value={form.memo}
              onChange={e => set('memo', e.target.value)}
              rows={3}
              placeholder="특이사항, 영업 배경..."
              className={INPUT_CLS + ' resize-none'}
            />
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-tint-red border border-tint-red-border rounded-xl text-sm text-dk-red">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Link href="/app/companies"
            className="flex-1 py-2.5 text-sm text-dk-muted border border-dk-border rounded-xl hover:bg-dk-surface2 text-center transition-colors">
            취소
          </Link>
          <button
            type="submit"
            disabled={!form.name.trim() || submitting}
            className="flex-1 py-2.5 text-sm text-white bg-dk-accent rounded-xl hover:bg-dk-accentHover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />등록 중...</> : '고객사 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
