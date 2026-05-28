'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Star, PhoneCall, Clock, ScanLine, Loader2 } from 'lucide-react'
import { formatRelative } from '@/lib/utils'
import type { DashboardStats } from '@/types/domain'
import { ACTIVITY_TYPE_LABEL } from '@/types/domain'

export default function DashboardPage() {
  const [stats, setStats]   = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(j => { if (j.data) setStats(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-dk-muted" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5 text-dk-blue" />}  label="전체 고객"     value={stats?.total_contacts ?? 0} />
        <StatCard icon={<Star  className="w-5 h-5 text-dk-orange" />} label="VIP 고객"      value={stats?.vip_contacts ?? 0} />
        <StatCard icon={<Clock className="w-5 h-5 text-dk-red" />}    label="30일 미연락"   value={stats?.no_contact_30 ?? 0} />
        <StatCard icon={<Clock className="w-5 h-5 text-dk-dim" />}    label="60일 미연락"   value={stats?.no_contact_60 ?? 0} />
      </div>

      {/* 명함 등록 CTA */}
      <Link
        href="/app/scan"
        className="flex items-center gap-3 p-4 bg-dk-accent/10 border border-dk-accent/30 rounded-xl hover:bg-dk-accent/20 transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl bg-dk-accent/20 flex items-center justify-center group-hover:bg-dk-accent/30 transition-colors">
          <ScanLine className="w-5 h-5 text-dk-blue" />
        </div>
        <div>
          <p className="text-sm font-semibold text-dk-text">명함 등록하기</p>
          <p className="text-xs text-dk-muted">카메라로 촬영하거나 이미지를 업로드하세요</p>
        </div>
      </Link>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 최근 등록 고객 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-dk-text">최근 등록 고객</h2>
            <Link href="/app/contacts" className="text-xs text-dk-blue hover:text-dk-blueHover">전체 보기</Link>
          </div>
          <div className="space-y-2">
            {stats?.recent_contacts.length === 0 && (
              <p className="text-xs text-dk-dim py-4 text-center">아직 등록된 고객이 없습니다</p>
            )}
            {stats?.recent_contacts.map(c => (
              <Link key={c.id} href={`/app/contacts/${c.id}`}
                className="flex items-center gap-3 p-3 bg-dk-surface border border-dk-border rounded-xl hover:bg-dk-surface2 transition-colors">
                <div className="w-8 h-8 rounded-full bg-tint-blue flex items-center justify-center text-dk-blue text-xs font-bold shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dk-text truncate">{c.name}</p>
                  <p className="text-xs text-dk-muted truncate">{c.company_name ?? c.title ?? '—'}</p>
                </div>
                <span className="text-[10px] text-dk-dim shrink-0">{formatRelative(c.created_at)}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* 최근 활동 */}
        <section>
          <h2 className="text-sm font-semibold text-dk-text mb-3">최근 활동</h2>
          <div className="space-y-2">
            {stats?.recent_activities.length === 0 && (
              <p className="text-xs text-dk-dim py-4 text-center">아직 활동 이력이 없습니다</p>
            )}
            {stats?.recent_activities.map(a => (
              <div key={a.id} className="flex items-start gap-3 p-3 bg-dk-surface border border-dk-border rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-dk-surface2 flex items-center justify-center shrink-0 mt-0.5">
                  <PhoneCall className="w-3.5 h-3.5 text-dk-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] bg-dk-surface2 text-dk-muted px-1.5 py-0.5 rounded">
                      {ACTIVITY_TYPE_LABEL[a.type]}
                    </span>
                    <span className="text-xs font-medium text-dk-text truncate">{a.contact_name}</span>
                  </div>
                  {a.content && <p className="text-xs text-dk-muted truncate">{a.content}</p>}
                </div>
                <span className="text-[10px] text-dk-dim shrink-0">{formatRelative(a.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 30일 미연락 안내 */}
      {stats && stats.no_contact_30 > 0 && (
        <div className="flex items-center gap-3 p-4 bg-tint-amber border border-tint-amber-border rounded-xl">
          <Clock className="w-4 h-4 text-dk-orange shrink-0" />
          <p className="text-sm text-dk-text">
            <span className="font-semibold text-dk-orange">{stats.no_contact_30}명</span>의 고객과 30일 이상 연락이 없습니다.{' '}
            <Link href="/app/contacts?filter=no_contact_30" className="text-dk-blue hover:underline">확인하기</Link>
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-dk-surface border border-dk-border rounded-xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-dk-surface2 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-dk-text font-tabular">{value.toLocaleString()}</p>
        <p className="text-xs text-dk-muted">{label}</p>
      </div>
    </div>
  )
}

