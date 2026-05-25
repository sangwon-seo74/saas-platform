'use client'

import { useState, useEffect } from 'react'
import { Bell, Wrench, CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Announcement = {
  id: string; type: 'notice' | 'maintenance' | 'update'
  title: string; content: string; starts_at: string; ends_at: string | null
}

const CFG = {
  notice:      { label: '공지',     icon: Bell,         cls: 'bg-blue-500/10 border-blue-500/30 text-blue-300'    },
  maintenance: { label: '점검',     icon: Wrench,       cls: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
  update:      { label: '업데이트', icon: CheckCircle2, cls: 'bg-green-500/10 border-green-500/30 text-green-300' },
}

/** 일반 앱 상단의 공지 배너. /api/announcements/active를 60초마다 폴링.
 *  사용자가 X로 닫은 공지는 sessionStorage에 기억해 다시 표시하지 않는다. */
export function AnnouncementBanner() {
  const [items, setItems]     = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('dismissed_announcements')
      if (raw) setDismissed(new Set(JSON.parse(raw) as string[]))
    } catch {}
  }, [])

  useEffect(() => {
    const load = () => {
      fetch('/api/announcements/active')
        .then(r => r.json())
        .then(json => setItems((json.data ?? []) as Announcement[]))
        .catch(() => {})
    }
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  const dismiss = (id: string) => {
    const next = new Set(dismissed); next.add(id)
    setDismissed(next)
    try { sessionStorage.setItem('dismissed_announcements', JSON.stringify([...next])) } catch {}
  }

  const visible = items.filter(i => !dismissed.has(i.id))
  if (visible.length === 0) return null

  return (
    <div className="px-4 py-2 space-y-1 bg-dk-bg">
      {visible.map(a => {
        const cfg  = CFG[a.type]
        const Icon = cfg.icon
        return (
          <div key={a.id} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg border', cfg.cls)}>
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <p className="text-xs font-semibold">{cfg.label}</p>
            <p className="text-xs flex-1 truncate">{a.title}</p>
            <button onClick={() => dismiss(a.id)} className="text-current/60 hover:text-current">
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
