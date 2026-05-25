'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/app/reports/renewal-rate',   label: '갱신율' },
  { href: '/app/reports/forecast',       label: '매출 예측' },
  { href: '/app/reports/performance',    label: '담당자 실적' },
  { href: '/app/reports/arr-movement',   label: 'ARR 변동' },
  { href: '/app/reports/risk-dashboard', label: '위험도 현황' },
  { href: '/app/reports/product-rate',   label: '상품별 갱신율' },
]

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const router   = useRouter()
  return (
    <div>
      <div className="border-b border-dk-border bg-dk-surface px-6 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map(t => {
            const active = pathname.startsWith(t.href)
            return (
              <Link key={t.href} href={t.href}
                onClick={() => { if (active) router.refresh() }}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  active
                    ? 'border-dk-blue text-dk-blue'
                    : 'border-transparent text-dk-muted hover:text-dk-text'
                )}>
                {t.label}
              </Link>
            )
          })}
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}
