'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  Building, Users, UsersRound, Package, MessageSquare,
  Plug, CreditCard, Receipt,
} from 'lucide-react'

const SETTINGS_NAV = [
  { href: '/app/settings/tenant',       label: '테넌트 정보',    icon: Building },
  { href: '/app/settings/users',        label: '사용자 관리',    icon: Users },
  { href: '/app/settings/teams',        label: '팀 관리',        icon: UsersRound },
  { href: '/app/settings/products',     label: '제품 관리',      icon: Package },
  { href: '/app/settings/templates',    label: '메시지 템플릿',  icon: MessageSquare },
  { href: '/app/settings/integrations', label: 'API 연동',       icon: Plug },
  { hr: true as const },
  { href: '/app/settings/subscription', label: '구독 현황',      icon: CreditCard },
  { href: '/app/settings/invoices',     label: '결제 이력',      icon: Receipt },
]

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''

  return (
    <div className="flex gap-6 p-6">
      <aside className="w-52 flex-shrink-0">
        <div className="sticky top-6">
          <p className="text-xs font-semibold text-dk-dim uppercase tracking-wider mb-3 px-2">설정</p>
          <nav className="space-y-0.5">
            {SETTINGS_NAV.map((item, i) => {
              if ('hr' in item) return <div key={i} className="my-2 border-t border-dk-border" />
              const Icon = item.icon
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors',
                    active
                      ? 'bg-dk-surface2 text-dk-text'
                      : 'text-dk-muted hover:bg-dk-surface2 hover:text-dk-text'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-dk-blue' : 'text-dk-dim')} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}
