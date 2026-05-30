'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Building2, Phone, Globe, MapPin, Pencil, Loader2, Star, Mail } from 'lucide-react'
import type { Company, Contact } from '@/types/domain'

type CompanyDetail = Company & {
  contacts: Pick<Contact, 'id' | 'name' | 'title' | 'department' | 'mobile' | 'email' | 'is_vip' | 'last_contacted_at'>[]
}

export default function CompanyDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/companies/${id}`).then(r => r.json()).catch(() => null)
    if (!res?.data) { setNotFound(true); setLoading(false); return }
    setCompany(res.data)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-dk-muted" /></div>
  )

  if (notFound || !company) return (
    <div className="p-6 text-center py-16">
      <p className="text-dk-muted">회사를 찾을 수 없습니다</p>
      <Link href="/app/companies" className="mt-3 inline-block text-sm text-dk-blue hover:text-dk-blueHover">
        목록으로 돌아가기
      </Link>
    </div>
  )

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/app/companies" className="p-1.5 rounded-lg text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-dk-text">{company.name}</h1>
        </div>
        <Link
          href={`/app/companies/${id}/edit`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />수정
        </Link>
      </div>

      {/* 회사 정보 */}
      <section className="bg-dk-surface border border-dk-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-dk-muted" />
          <h2 className="text-sm font-semibold text-dk-text">회사 정보</h2>
        </div>
        <div className="space-y-2.5 text-sm">
          {company.main_phone && (
            <div className="flex items-center gap-2.5">
              <Phone className="w-3.5 h-3.5 text-dk-dim shrink-0" />
              <a href={`tel:${company.main_phone}`} className="text-dk-text hover:text-dk-blue">{company.main_phone}</a>
            </div>
          )}
          {company.address && (
            <div className="flex items-start gap-2.5">
              <MapPin className="w-3.5 h-3.5 text-dk-dim shrink-0 mt-0.5" />
              <span className="text-dk-text">{company.address}</span>
            </div>
          )}
          {company.website && (
            <div className="flex items-center gap-2.5">
              <Globe className="w-3.5 h-3.5 text-dk-dim shrink-0" />
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-dk-blue hover:text-dk-blueHover truncate">
                {company.website}
              </a>
            </div>
          )}
          {!company.main_phone && !company.address && !company.website && (
            <p className="text-xs text-dk-dim">추가 정보 없음</p>
          )}
        </div>
      </section>

      {/* 담당자 목록 */}
      <section className="bg-dk-surface border border-dk-border rounded-xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-dk-border">
          <h2 className="text-sm font-semibold text-dk-text">담당자 ({company.contacts.length}명)</h2>
          <Link
            href={`/app/contacts/new?company=${id}`}
            className="text-xs text-dk-blue hover:text-dk-blueHover"
          >
            + 담당자 추가
          </Link>
        </div>
        {company.contacts.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-dk-dim">등록된 담당자가 없습니다</div>
        ) : (
          <div className="divide-y divide-dk-border">
            {company.contacts.map(c => (
              <Link
                key={c.id}
                href={`/app/contacts/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-dk-surface2 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-tint-blue flex items-center justify-center text-dk-blue text-sm font-bold shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-dk-text">{c.name}</span>
                    {c.is_vip && <Star className="w-3 h-3 text-dk-orange fill-dk-orange" />}
                  </div>
                  <p className="text-xs text-dk-muted">{[c.department, c.title].filter(Boolean).join(' · ') || '—'}</p>
                </div>
                <div className="flex items-center gap-2 text-dk-dim shrink-0">
                  {c.mobile && <a href={`tel:${c.mobile}`} onClick={e => e.stopPropagation()} title={c.mobile}><Phone className="w-3.5 h-3.5 hover:text-dk-green" /></a>}
                  {c.email  && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} title={c.email}><Mail className="w-3.5 h-3.5 hover:text-dk-blue" /></a>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
