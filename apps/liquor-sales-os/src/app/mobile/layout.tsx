'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, ClipboardList, Building2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/mobile/checkin',    icon: MapPin,          label: '체크인' },
  { href: '/mobile/visits',     icon: ClipboardList,   label: '방문기록' },
  { href: '/mobile/clients',    icon: Building2,       label: '거래처' },
  { href: '/app/dashboard',     icon: User,            label: '내 정보' },
]

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''

  return (
    <div className="flex flex-col h-screen bg-dk-bg overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-dk-surface border-t border-dk-border flex items-stretch safe-area-inset-bottom z-10">
        {TABS.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors',
                active ? 'text-dk-orange' : 'text-dk-dim hover:text-dk-muted'
              )}
            >
              <tab.icon className={cn('w-5 h-5', active && 'text-dk-orange')} />
              <span className="font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
