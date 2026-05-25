'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, CreditCard, Receipt,
  Layers, ChevronRight, Shield, LogOut,
  Search, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommandPalette } from './_components/command-palette'
import { NotificationBell } from './_components/notification-bell'

const NAV = [
  { href: '/super-admin/dashboard',      icon: LayoutDashboard, label: '운영 대시보드' },
  { href: '/super-admin/tenants',        icon: Building2,       label: '테넌트 관리' },
  { href: '/super-admin/subscriptions',  icon: CreditCard,      label: '구독 관리' },
  { href: '/super-admin/invoices',       icon: Receipt,         label: '결제 관리' },
  { href: '/super-admin/plans',          icon: Layers,          label: '플랜 관리' },
  { href: '/super-admin/system/logs',    icon: Activity,        label: '시스템 관리' },
]

/** 슈퍼 관리자 영역 공통 레이아웃.
 *  좌측 네비게이션(대시보드/테넌트/구독/결제/플랜/시스템)과 상단 검색바를 제공하고,
 *  메인 콘텐츠는 자식 컴포넌트로 렌더링한다. proxy.ts에서 인증/권한을 사전에 검증한다. */
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* 사이드바 */}
      <aside className="w-[220px] shrink-0 flex flex-col border-r border-white/10 bg-gray-950">
        {/* 로고 */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none">Revenue OS</p>
              <p className="text-[10px] text-blue-400 mt-0.5 font-medium">Super Admin</p>
            </div>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* 하단 유저 영역 */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
            <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-300 text-xs font-bold">
              S
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">Super Admin</p>
              <p className="text-[10px] text-gray-500 truncate">admin@revenue-os.com</p>
            </div>
            <LogOut className="w-3.5 h-3.5 text-gray-500 hover:text-red-400 transition-colors" />
          </div>
        </div>
      </aside>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 헤더 */}
        <header className="h-13 shrink-0 flex items-center justify-between px-6 border-b border-white/10 bg-gray-950">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="flex items-center gap-3 flex-1 max-w-sm text-left text-gray-500 hover:text-gray-300 transition-colors">
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-sm">테넌트, 사용자, 인보이스 검색...</span>
            <kbd className="text-[10px] text-gray-600 border border-gray-700 px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        {/* 페이지 */}
        <main className="flex-1 overflow-y-auto bg-gray-900">
          {children}
        </main>
      </div>

      {/* 글로벌 명령 팔레트 (Cmd+K) */}
      <CommandPalette />
    </div>
  )
}
