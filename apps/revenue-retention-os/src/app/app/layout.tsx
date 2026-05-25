'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, History, FileText,
  RefreshCw, CheckSquare, BarChart2, Settings,
  ChevronRight, Bell, Search, LogOut, Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/supabase/auth-client'
import { AnnouncementBanner } from './_components/announcement-banner'

const NAV_MAIN = [
  { href: '/app/dashboard',         icon: LayoutDashboard, label: '대시보드' },
  { href: '/app/companies',         icon: Building2,       label: '고객사' },
  { href: '/app/activities',        icon: History,         label: '활동이력' },
  { href: '/app/contracts',         icon: FileText,        label: '계약' },
  {
    href: '/app/renewals',
    icon: RefreshCw,
    label: '갱신 관리',
    highlight: true,
    badge: 5,
  },
  {
    href: '/app/tasks/my',
    icon: CheckSquare,
    label: '내 업무',
    badge: 3,
  },
]

const NAV_BOTTOM = [
  { href: '/app/reports/renewal-rate', icon: BarChart2, label: '리포트', roles: ['admin', 'manager'] },
  { href: '/app/settings/tenant',      icon: Settings,  label: '설정',   roles: ['admin'] },
]

function NavItem({
  href, icon: Icon, label, badge, highlight, collapsed
}: {
  href: string
  icon: React.ElementType
  label: string
  badge?: number
  highlight?: boolean
  collapsed: boolean
}) {
  const pathname = usePathname() ?? ''
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors relative',
        collapsed ? 'justify-center' : '',
        active
          ? highlight
            ? 'bg-[#1f6feb] text-white'
            : 'bg-dk-surface2 text-dk-blue font-medium'
          : highlight
            ? 'text-dk-blue hover:bg-dk-surface2 font-medium'
            : 'text-dk-muted hover:bg-dk-surface2 hover:text-dk-text'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && badge && badge > 0 ? (
        <span className={cn(
          'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
          active && highlight ? 'bg-white/30 text-white' : 'bg-red-500 text-white'
        )}>
          {badge}
        </span>
      ) : null}
      {collapsed && badge && badge > 0 ? (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      ) : null}
    </Link>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const pathname = usePathname() ?? ''
  const router   = useRouter()

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.push('/login')
  }

  const allNav = [...NAV_MAIN, ...NAV_BOTTOM]
  const currentNav = allNav.find(n =>
    pathname === n.href || pathname.startsWith(n.href + '/')
  )

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className={cn(
        'flex items-center border-b border-dk-border shrink-0',
        collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4 gap-2.5'
      )}>
        <div className="w-7 h-7 rounded-lg bg-dk-blue flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">R</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-dk-text leading-none truncate">Revenue OS</p>
            <p className="text-[10px] text-dk-dim mt-0.5">Retention Platform</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg text-dk-dim hover:text-dk-muted hover:bg-dk-surface2 shrink-0 hidden lg:flex"
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          }
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_MAIN.map(item => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="px-2 pb-3 space-y-0.5 border-t border-dk-border pt-3 shrink-0">
        {NAV_BOTTOM.map(item => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}

        <button
          onClick={() => setShowLogoutConfirm(true)}
          title="로그아웃"
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-dk-surface2 transition-colors mt-1',
            collapsed ? 'justify-center' : '',
            signingOut ? 'opacity-50 cursor-wait' : 'cursor-pointer'
          )}>
          <div className="w-7 h-7 rounded-full bg-[#1c2d4a] flex items-center justify-center text-dk-blue text-xs font-bold shrink-0">
            K
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-dk-text truncate">김관리자</p>
                <p className="text-[10px] text-dk-dim truncate">admin</p>
              </div>
              <LogOut className="w-3.5 h-3.5 text-dk-dim shrink-0" />
            </>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-dk-bg overflow-hidden">
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-dk-surface border border-dk-border rounded-2xl p-6 w-80 shadow-xl">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#3d1a1a] mx-auto mb-4">
              <LogOut className="w-5 h-5 text-[#FF7B72]" />
            </div>
            <h2 className="text-base font-semibold text-dk-text text-center mb-1">로그아웃</h2>
            <p className="text-sm text-dk-muted text-center mb-6">정말 로그아웃 하시겠습니까?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
                취소
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#FF7B72]/80 hover:bg-[#FF7B72] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait">
                {signingOut ? '처리 중...' : '로그아웃'}
              </button>
            </div>
          </div>
        </div>
      )}
      <aside className={cn(
        'hidden lg:flex flex-col shrink-0 bg-dk-surface border-r border-dk-border transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}>
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[220px] bg-dk-surface border-r border-dk-border z-50 flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-13 shrink-0 bg-dk-surface border-b border-dk-border flex items-center px-4 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-dk-muted hover:bg-dk-surface2"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex-1">
            {currentNav && (
              <p className="text-sm font-semibold text-dk-text">{currentNav.label}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button className="p-1.5 rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
              <Search className="w-4 h-4" />
            </button>
            <button className="relative p-1.5 rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        <AnnouncementBanner />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
