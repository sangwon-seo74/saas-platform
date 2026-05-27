'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Save, Bell, ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react'
import type { MessageTemplate } from '@/types/domain'

interface NotifConfig {
  days_before: number
  id: string | null
  template_id: string | null
  is_active: boolean
  template: { id: string; name: string; channel: string; kakao_template_code: string | null } | null
}

const MILESTONE_LABELS: Record<number, string> = {
  30: 'D-30 (만료 30일 전)',
  14: 'D-14 (만료 14일 전)',
  7:  'D-7  (만료 7일 전)',
}

export default function RenewalNotificationsPage() {
  const [configs, setConfigs]     = useState<NotifConfig[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [saved, setSaved]         = useState(false)
  const [openPicker, setOpenPicker] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cfgRes, tplRes] = await Promise.all([
        fetch('/api/settings/renewal-notifications'),
        fetch('/api/settings/templates?active=true&limit=100'),
      ])
      const cfgJson = await cfgRes.json()
      const tplJson = await tplRes.json()
      if (!cfgRes.ok) { setError(cfgJson.error?.message ?? '로드 실패'); return }
      setConfigs(cfgJson.data ?? [])
      setTemplates(tplJson.data?.data ?? [])
    } catch {
      setError('네트워크 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateConfig = (days: number, patch: Partial<NotifConfig>) => {
    setConfigs(prev => prev.map(c => c.days_before === days ? { ...c, ...patch } : c))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/renewal-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: configs.map(c => ({
            days_before: c.days_before,
            template_id: c.template_id,
            is_active:   c.is_active,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? '저장 실패'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      load()
    } catch {
      setError('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-dk-muted" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-5 h-5 text-dk-blue" />
        <div>
          <h1 className="text-lg font-semibold text-dk-text">갱신 자동 알림</h1>
          <p className="text-sm text-dk-muted mt-0.5">계약 만료 전 자동으로 발송할 알림 설정입니다.</p>
        </div>
      </div>

      <div className="space-y-3">
        {configs.map(cfg => (
          <div key={cfg.days_before}
            className="bg-dk-surface border border-dk-border rounded-xl p-4 space-y-3">
            {/* Row header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-dk-text font-mono">
                {MILESTONE_LABELS[cfg.days_before] ?? `D-${cfg.days_before}`}
              </span>
              <button
                onClick={() => updateConfig(cfg.days_before, { is_active: !cfg.is_active })}
                className="flex items-center gap-1.5 text-sm"
              >
                {cfg.is_active
                  ? <ToggleRight className="w-5 h-5 text-dk-blue" />
                  : <ToggleLeft  className="w-5 h-5 text-dk-dim" />}
                <span className={cfg.is_active ? 'text-dk-blue' : 'text-dk-dim'}>
                  {cfg.is_active ? '활성' : '비활성'}
                </span>
              </button>
            </div>

            {/* Template picker */}
            <div className="relative">
              <button
                onClick={() => setOpenPicker(openPicker === cfg.days_before ? null : cfg.days_before)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface2 text-left hover:bg-dk-surface2/70 transition-colors"
              >
                <span className={cfg.template_id ? 'text-dk-text flex-1 truncate' : 'text-dk-dim flex-1 truncate'}>
                  {cfg.template?.name ?? '템플릿 선택 (선택 사항)'}
                </span>
                {cfg.template && (
                  <span className="text-xs text-dk-muted shrink-0 bg-dk-surface px-2 py-0.5 rounded-md border border-dk-border">
                    {cfg.template.channel}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-dk-muted shrink-0" />
              </button>

              {openPicker === cfg.days_before && (
                <div className="absolute z-10 top-full mt-1 w-full bg-dk-surface border border-dk-border rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                  <button
                    onClick={() => { updateConfig(cfg.days_before, { template_id: null, template: null }); setOpenPicker(null) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-dk-surface2 transition-colors text-xs text-dk-dim"
                  >
                    선택 해제
                  </button>
                  {templates.length === 0 ? (
                    <p className="text-xs text-dk-dim px-4 py-3 text-center">
                      저장된 템플릿이 없습니다.
                    </p>
                  ) : (
                    templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          updateConfig(cfg.days_before, {
                            template_id: t.id,
                            template: { id: t.id, name: t.name, channel: t.channel, kakao_template_code: t.kakao_template_code ?? null },
                          })
                          setOpenPicker(null)
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-dk-surface2 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-dk-text font-medium truncate flex-1">{t.name}</span>
                          <span className="text-xs text-dk-muted shrink-0 bg-dk-surface px-2 py-0.5 rounded-md border border-dk-border">
                            {t.channel}
                          </span>
                        </div>
                        <p className="text-xs text-dk-dim truncate mt-0.5">{t.content}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Template meta */}
            {cfg.template && (
              <p className="text-xs text-dk-dim">
                채널: <span className="text-dk-muted">{cfg.template.channel}</span>
                {cfg.template.kakao_template_code && (
                  <> · 코드: <span className="text-dk-muted font-mono">{cfg.template.kakao_template_code}</span></>
                )}
              </p>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-dk-red">{error}</p>}

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-dk-blue rounded-lg hover:bg-dk-blue/80 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? '저장 중...' : '저장'}
        </button>
        {saved && <span className="text-sm text-dk-green">저장되었습니다</span>}
      </div>

      <div className="mt-8 p-4 bg-tint-blue rounded-xl border border-tint-blue-border">
        <p className="text-xs text-dk-muted leading-relaxed">
          활성화된 마일스톤은 매일 자정에 실행되는 배치 작업이 해당일에 만료되는 계약을 찾아
          템플릿에 지정된 채널로 자동 발송합니다. 템플릿을 지정하지 않으면 알림이 발송되지 않습니다.
        </p>
      </div>
    </div>
  )
}
