'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, History, FileText,
  RefreshCw, CheckSquare, BarChart2, Settings,
  ChevronRight, Bell, Search, LogOut, Menu, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/supabase/auth-client'
import { AnnouncementBanner } from './_components/announcement-banner'
import { GlobalSearch } from '@/components/GlobalSearch'

const NAV_MAIN_BASE = [
  { href: '/app/dashboard',  icon: LayoutDashboard, label: '대시보드' },
  { href: '/app/companies',  icon: Building2,       label: '고객사' },
  { href: '/app/activities', icon: History,         label: '활동이력' },
  { href: '/app/contracts',  icon: FileText,        label: '계약' },
  { href: '/app/renewals',   icon: RefreshCw,       label: '갱신 관리', highlight: true as const },
  { href: '/app/tasks/my',   icon: CheckSquare,     label: '내 업무' },
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
            ? 'bg-dk-accent text-white'
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

type NotifTask    = { id: string; title: string; due_at: string | null; company: { name: string } | null }
type NotifRenewal = { id: string; company_name: string; expires_at: string; risk: string }

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [badges, setBadges] = useState({ renewals: 0, tasks: 0 })
  const [me, setMe] = useState<{ name: string; role: string; email: string } | null>(null)
  const [showBell, setShowBell]       = useState(false)
  const [bellLoading, setBellLoading] = useState(false)
  const [notifTasks, setNotifTasks]     = useState<NotifTask[]>([])
  const [notifRenewals, setNotifRenewals] = useState<NotifRenewal[]>([])
  const bellRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname() ?? ''
  const router   = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(j => { if (j.data) setMe(j.data) }).catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/renewals?status=pending&status=contacted&status=negotiating&days_to_expire=30&limit=1').then(r => r.json()),
      fetch('/api/tasks?mine=true&status=todo&status=in_progress&overdue=true&limit=1').then(r => r.json()),
    ]).then(([renewals, tasks]) => {
      setBadges({
        renewals: renewals.data?.count ?? 0,
        tasks:    tasks.data?.count    ?? 0,
      })
    }).catch(() => {})
  }, [pathname])

  useEffect(() => {
    if (!showBell) return
    setBellLoading(true)
    Promise.all([
      fetch('/api/tasks?mine=true&overdue=true&limit=5').then(r => r.json()),
      fetch('/api/renewals?days_to=7&limit=5').then(r => r.json()),
    ]).then(([tasks, renewals]) => {
      setNotifTasks(tasks.data?.data ?? [])
      setNotifRenewals((renewals.data?.data ?? []).map((rv: { id: string; company: { name: string } | null; contract_expires_at: string; risk_level: string }) => ({
        id: rv.id,
        company_name: rv.company?.name ?? '',
        expires_at: rv.contract_expires_at,
        risk: rv.risk_level,
      })))
    }).catch(() => {}).finally(() => setBellLoading(false))
  }, [showBell])

  useEffect(() => {
    if (!showBell) return
    function handleOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showBell])

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.push('/login')
  }

  const NAV_MAIN = NAV_MAIN_BASE.map(item => ({
    ...item,
    badge: item.href === '/app/renewals' ? badges.renewals
         : item.href === '/app/tasks/my' ? badges.tasks
         : undefined,
  }))

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
        <a
          href={process.env.NEXT_PUBLIC_LANDING_URL || 'https://saas-foundry.vercel.app'}
          title="SaaS Platform 홈"
          className={cn('flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity', !collapsed && 'flex-1')}
        >
          <div className="w-7 h-7 rounded-lg bg-dk-blue flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-dk-text leading-none truncate">Revenue OS</p>
              <p className="text-[10px] text-dk-dim mt-0.5">Retention Platform</p>
            </div>
          )}
        </a>
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
          title={me ? `${me.name} · 로그아웃` : '로그아웃'}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-dk-surface2 transition-colors mt-1',
            collapsed ? 'justify-center' : '',
            signingOut ? 'opacity-50 cursor-wait' : 'cursor-pointer'
          )}>
          <div className="w-7 h-7 rounded-full bg-tint-blue flex items-center justify-center text-dk-blue text-xs font-bold shrink-0">
            {me ? me.name[0] : '?'}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-dk-text truncate">{me?.name ?? '…'}</p>
                <p className="text-[10px] text-dk-dim truncate">{me?.role ?? ''}</p>
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
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}

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
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">
                취소
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-dk-red/80 hover:bg-dk-red rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait">
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
            <button
              onClick={() => setShowSearch(true)}
              title="검색 (⌘K)"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors text-xs border border-dk-border">
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">검색</span>
              <kbd className="hidden sm:inline text-[10px] opacity-60">⌘K</kbd>
            </button>
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setShowBell(v => !v)}
                className={cn(
                  'relative p-1.5 rounded-lg transition-colors',
                  showBell ? 'text-dk-text bg-dk-surface2' : 'text-dk-muted hover:text-dk-text hover:bg-dk-surface2'
                )}>
                <Bell className="w-4 h-4" />
                {(badges.tasks > 0 || badges.renewals > 0) && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </button>

              {showBell && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-dk-surface border border-dk-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-dk-border">
                    <p className="text-sm font-semibold text-dk-text">알림</p>
                    <button onClick={() => setShowBell(false)} className="text-dk-dim hover:text-dk-muted p-0.5">
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {bellLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-4 h-4 animate-spin text-dk-muted" />
                    </div>
                  ) : (notifTasks.length === 0 && notifRenewals.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Bell className="w-6 h-6 text-dk-dim" />
                      <p className="text-xs text-dk-dim">새 알림이 없습니다</p>
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-dk-border">
                      {notifTasks.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-dk-dim uppercase tracking-wider px-4 py-2 bg-dk-surface2/50">
                            기한 초과 업무
                          </p>
                          {notifTasks.map(t => (
                            <Link key={t.id} href="/app/tasks/my" onClick={() => setShowBell(false)}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-dk-surface2 transition-colors">
                              <CheckSquare className="w-4 h-4 text-dk-red mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-dk-text truncate font-medium">{t.title}</p>
                                <p className="text-xs text-dk-dim mt-0.5">
                                  {t.company?.name ?? '–'}{t.due_at ? ` · ${t.due_at.slice(0, 10)}` : ''}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      {notifRenewals.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-dk-dim uppercase tracking-wider px-4 py-2 bg-dk-surface2/50">
                            D-7 갱신 임박
                          </p>
                          {notifRenewals.map(rv => (
                            <Link key={rv.id} href={`/app/renewals/${rv.id}`} onClick={() => setShowBell(false)}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-dk-surface2 transition-colors">
                              <RefreshCw className="w-4 h-4 text-dk-orange mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-dk-text truncate font-medium">{rv.company_name}</p>
                                <p className="text-xs text-dk-dim mt-0.5">만료 {rv.expires_at.slice(0, 10)}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="px-4 py-2.5 border-t border-dk-border bg-dk-surface2/50 flex gap-3">
                    <Link href="/app/tasks/my" onClick={() => setShowBell(false)}
                      className="flex-1 text-center text-xs text-dk-muted hover:text-dk-text transition-colors">
                      내 업무 보기
                    </Link>
                    <Link href="/app/renewals" onClick={() => setShowBell(false)}
                      className="flex-1 text-center text-xs text-dk-muted hover:text-dk-text transition-colors">
                      갱신 관리 보기
                    </Link>
                  </div>
                </div>
              )}
            </div>
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
