'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, ScanLine, Search,
  Settings, ChevronRight, LogOut, Menu, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/supabase/auth-client'

const NAV_MAIN = [
  { href: '/app/dashboard', icon: LayoutDashboard, label: '대시보드' },
  { href: '/app/contacts',  icon: Users,           label: '고객목록' },
  { href: '/app/companies', icon: Building2,       label: '회사목록' },
  { href: '/app/scan',      icon: ScanLine,        label: '명함등록', highlight: true as const },
  { href: '/app/search',    icon: Search,          label: '검색' },
]

const NAV_BOTTOM = [
  { href: '/app/settings', icon: Settings, label: '설정', roles: ['owner'] },
]

function NavItem({
  href, icon: Icon, label, highlight, collapsed
}: {
  href: string; icon: React.ElementType; label: string; highlight?: boolean; collapsed: boolean
}) {
  const pathname = usePathname() ?? ''
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
        collapsed ? 'justify-center' : '',
        active
          ? highlight ? 'bg-dk-accent text-white' : 'bg-dk-surface2 text-dk-blue font-medium'
          : highlight ? 'text-dk-blue hover:bg-dk-surface2 font-medium' : 'text-dk-muted hover:bg-dk-surface2 hover:text-dk-text'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
    </Link>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed,          setCollapsed]          = useState(false)
  const [mobileOpen,         setMobileOpen]         = useState(false)
  const [showLogoutConfirm,  setShowLogoutConfirm]  = useState(false)
  const [signingOut,         setSigningOut]         = useState(false)
  const [me, setMe] = useState<{ name: string; role: string } | null>(null)
  const pathname = usePathname() ?? ''
  const router   = useRouter()

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(j => { if (j.data) setMe(j.data) }).catch(() => {})
  }, [])

  // 설정 메뉴는 owner만 표시
  const visibleNavBottom = NAV_BOTTOM.filter(n => {
    if (n.roles && me) return n.roles.includes(me.role)
    return !n.roles
  })

  const allNav = [...NAV_MAIN, ...visibleNavBottom]
  const currentNav = allNav.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.push('/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className={cn('flex items-center border-b border-dk-border shrink-0', collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4 gap-2.5')}>
        <div className="w-7 h-7 rounded-lg bg-dk-blue flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">N</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-dk-text leading-none truncate">Namecard CRM</p>
            <p className="text-[10px] text-dk-dim mt-0.5">명함 고객관리</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-lg text-dk-dim hover:text-dk-muted hover:bg-dk-surface2 shrink-0 hidden lg:flex">
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 rotate-180" />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_MAIN.map(item => <NavItem key={item.href} {...item} collapsed={collapsed} />)}
      </nav>

      <div className="px-2 pb-3 space-y-0.5 border-t border-dk-border pt-3 shrink-0">
        {visibleNavBottom.map(item => <NavItem key={item.href} {...item} collapsed={collapsed} />)}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          title={me ? `${me.name} · 로그아웃` : '로그아웃'}
          className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-dk-surface2 transition-colors mt-1', collapsed ? 'justify-center' : '', signingOut ? 'opacity-50 cursor-wait' : 'cursor-pointer')}>
          <div className="w-7 h-7 rounded-full bg-tint-blue flex items-center justify-center text-dk-blue text-xs font-bold shrink-0">
            {me ? me.name[0] : '?'}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-dk-text truncate">{me?.name ?? '…'}</p>
                <p className="text-[10px] text-dk-dim truncate">{me?.role === 'owner' ? '관리자' : '팀원'}</p>
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
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-tint-red mx-auto mb-4">
              <LogOut className="w-5 h-5 text-dk-red" />
            </div>
            <h2 className="text-base font-semibold text-dk-text text-center mb-1">로그아웃</h2>
            <p className="text-sm text-dk-muted text-center mb-6">정말 로그아웃 하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 px-4 py-2 text-sm font-medium text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">취소</button>
              <button onClick={handleSignOut} disabled={signingOut} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-dk-red/80 hover:bg-dk-red rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait">
                {signingOut ? '처리 중...' : '로그아웃'}
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className={cn('hidden lg:flex flex-col shrink-0 bg-dk-surface border-r border-dk-border transition-all duration-200', collapsed ? 'w-[60px]' : 'w-[220px]')}>
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[220px] bg-dk-surface border-r border-dk-border z-50 flex flex-col">{sidebarContent}</aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-13 shrink-0 bg-dk-surface border-b border-dk-border flex items-center px-4 gap-3">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-lg text-dk-muted hover:bg-dk-surface2">
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex-1">
            {currentNav && <p className="text-sm font-semibold text-dk-text">{currentNav.label}</p>}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
