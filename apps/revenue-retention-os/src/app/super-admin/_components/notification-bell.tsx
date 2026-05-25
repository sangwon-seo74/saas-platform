'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

type Notification = {
  type: string; count: number; label: string; href: string
  severity: 'critical' | 'warning' | 'info'
}

/** 헤더 우측의 알림 벨 + 드롭다운.
 *  /api/super-admin/notifications를 60초마다 폴링해 미납/만료/실패 등의 카운트를 표시한다. */
export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([])
  const [open, setOpen]   = useState(false)

  const load = () => {
    fetch('/api/super-admin/notifications')
      .then(r => r.json())
      .then(json => setItems((json.data ?? []) as Notification[]))
      .catch(() => {})
  }
  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  const totalCount = items.reduce((s, i) => s + i.count, 0)
  const hasCritical = items.some(i => i.severity === 'critical')

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="relative p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
        <Bell className="w-4 h-4" />
        {totalCount > 0 && (
          <span className={cn(
            'absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full',
            hasCritical ? 'bg-red-500' : 'bg-amber-500'
          )} />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-40 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <p className="text-sm font-semibold text-white">알림</p>
              <p className="text-[10px] text-gray-500 mt-0.5">즉각 조치가 필요한 항목</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">새 알림이 없습니다 ✓</p>
              ) : items.map(n => (
                <Link key={n.type} href={n.href} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    n.severity === 'critical' ? 'bg-red-500' : n.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                  )} />
                  <p className="text-xs text-gray-200 flex-1">{n.label}</p>
                  <span className={cn('text-xs font-bold font-mono',
                    n.severity === 'critical' ? 'text-red-400' : n.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                  )}>{n.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
