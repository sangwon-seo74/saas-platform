'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

type Provider = 'kakao' | 'sms' | 'email' | 'naver_map'

interface FieldDef {
  key: string
  label: string
  type: 'text' | 'password'
  placeholder: string
}

interface IntegrationDef {
  provider: Provider
  label: string
  description: string
  fields: FieldDef[]
}

interface IntegrationRow {
  provider: string
  config: Record<string, string>
  is_active: boolean
  tested_at: string | null
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    provider: 'kakao', label: '카카오 알림톡',
    description: '카카오 비즈니스 채널을 통한 알림톡 발송',
    fields: [
      { key: 'sender_key', label: '발신프로필 키', type: 'password', placeholder: 'sender_key...' },
      { key: 'pfid',       label: '플러스친구 ID', type: 'text',     placeholder: '@채널명' },
    ],
  },
  {
    provider: 'sms', label: '솔라피 (문자)',
    description: 'Solapi API를 통한 SMS/LMS 발송',
    fields: [
      { key: 'api_key',      label: 'API Key',    type: 'password', placeholder: 'NCSOL...' },
      { key: 'api_secret',   label: 'API Secret', type: 'password', placeholder: '' },
      { key: 'sender_phone', label: '발신번호',    type: 'text',     placeholder: '01012345678' },
    ],
  },
  {
    provider: 'email', label: '이메일 (Resend)',
    description: '플랫폼 공용 이메일 서비스 — 발신자 브랜딩만 설정하면 됩니다',
    fields: [
      { key: 'from_name',  label: '발신자명',              type: 'text', placeholder: '갱신 OS' },
      { key: 'from_email', label: '발신 이메일 (선택)',     type: 'text', placeholder: 'noreply@company.com' },
    ],
  },
  {
    provider: 'naver_map', label: '네이버 지도',
    description: '고객사 주소 지도 표시에 사용',
    fields: [
      { key: 'client_id',     label: 'Client ID',     type: 'text',     placeholder: '' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '' },
    ],
  },
]

const PROVIDER_ICON: Record<Provider, string> = {
  kakao: '💬', sms: '📱', email: '📧', naver_map: '🗺️',
}

function formatTested(at: string): string {
  const d = Math.floor((Date.now() - new Date(at).getTime()) / (1000 * 60 * 60 * 24))
  return d === 0 ? '오늘' : `${d}일 전`
}

function IntegrationCard({
  def,
  row,
  onSaved,
}: {
  def: IntegrationDef
  row: IntegrationRow | null
  onSaved: (updated: IntegrationRow) => void
}) {
  const [expanded,    setExpanded]    = useState(!!(row?.is_active))
  const [showSecrets, setShowSecrets] = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)

  // config 값 상태 (비밀 필드는 '__set__' 또는 실제 입력값)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const saved = row?.config ?? {}
    return Object.fromEntries(def.fields.map(f => [f.key, saved[f.key] ?? '']))
  })
  const [isActive, setIsActive] = useState(row?.is_active ?? false)

  // DB 값이 로드되면 동기화
  useEffect(() => {
    const saved = row?.config ?? {}
    setValues(Object.fromEntries(def.fields.map(f => [f.key, saved[f.key] ?? ''])))
    setIsActive(row?.is_active ?? false)
  }, [row, def.fields])

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: def.provider, config: values, is_active: isActive }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setSaveError(json.error?.message ?? '저장 실패')
        return
      }
      onSaved({ provider: def.provider, config: values, is_active: isActive, tested_at: row?.tested_at ?? null })
    } catch {
      setSaveError('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  const handleDisable = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: def.provider, config: values, is_active: false }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setSaveError(json.error?.message ?? '해제 실패'); return }
      setIsActive(false)
      onSaved({ provider: def.provider, config: values, is_active: false, tested_at: null })
    } catch {
      setSaveError('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-xl bg-dk-surface2 flex items-center justify-center text-xl">
          {PROVIDER_ICON[def.provider as Provider]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-dk-text">{def.label}</span>
            {isActive
              ? <CheckCircle className="w-4 h-4 text-dk-green" />
              : <XCircle className="w-4 h-4 text-dk-dim" />
            }
          </div>
          <p className="text-xs text-dk-muted mt-0.5">{def.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {row?.tested_at && (
            <span className="text-xs text-dk-dim">테스트: {formatTested(row.tested_at)}</span>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 text-xs font-medium text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2">
            {expanded ? '접기' : '설정'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-dk-border p-4 bg-dk-surface2/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-dk-muted">API 설정</span>
            <button onClick={() => setShowSecrets(!showSecrets)}
              className="flex items-center gap-1 text-xs text-dk-muted hover:text-dk-text">
              {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showSecrets ? '숨기기' : '보기'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {def.fields.map(field => {
              const isSet = values[field.key] === '__set__'
              return (
                <div key={field.key}>
                  <label className="text-xs font-medium text-dk-muted mb-1.5 block">{field.label}</label>
                  <input
                    type={field.type === 'password' && !showSecrets ? 'password' : 'text'}
                    value={isSet ? '' : (values[field.key] ?? '')}
                    onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={isSet ? '(설정됨 — 변경 시 입력)' : field.placeholder}
                    className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue font-mono"
                  />
                </div>
              )
            })}
          </div>

          {saveError && (
            <p className="mt-3 text-xs text-dk-red">{saveError}</p>
          )}

          <div className="flex items-center gap-2 mt-4">
            <label className="flex items-center gap-1.5 text-xs text-dk-muted cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="rounded"
              />
              활성화
            </label>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-dk-blue rounded-lg hover:bg-dk-blue/80 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {saving ? '저장 중...' : '저장'}
            </button>
            {isActive && (
              <button
                onClick={handleDisable}
                disabled={saving}
                className="ml-auto px-3 py-1.5 text-xs font-medium text-dk-red border border-dk-red/30 rounded-lg hover:bg-dk-red/10 disabled:opacity-50">
                연동 해제
              </button>
            )}
            <span className="text-xs text-dk-dim ml-1">
              연결 테스트는 발송 연동 구현 후 지원됩니다
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function IntegrationsSettingPage() {
  const [loading, setLoading] = useState(true)
  const [rows,    setRows]    = useState<IntegrationRow[]>([])

  useEffect(() => {
    fetch('/api/settings/integrations')
      .then(r => r.json())
      .then(json => { if (json.data) setRows(json.data) })
      .finally(() => setLoading(false))
  }, [])

  const getRow = (provider: string) => rows.find(r => r.provider === provider) ?? null

  const handleSaved = (updated: IntegrationRow) => {
    setRows(prev => {
      const exists = prev.some(r => r.provider === updated.provider)
      return exists
        ? prev.map(r => r.provider === updated.provider ? updated : r)
        : [...prev, updated]
    })
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-dk-text">API 연동</h2>
        <p className="text-sm text-dk-muted mt-0.5">외부 서비스와 연동하여 메시지 발송 기능을 활성화합니다</p>
      </div>

      <div className="p-3 bg-dk-orange/5 border border-dk-orange/30 rounded-xl flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-dk-orange flex-shrink-0 mt-0.5" />
        <p className="text-xs text-dk-muted">
          API 키는 암호화하여 저장됩니다. 설정 후 연결 테스트를 통해 정상 작동을 확인하세요.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-dk-dim" />
        </div>
      ) : (
        <div className="space-y-3">
          {INTEGRATIONS.map(def => (
            <IntegrationCard
              key={def.provider}
              def={def}
              row={getRow(def.provider)}
              onSaved={handleSaved}
            />
          ))}
        </div>
      )}
    </div>
  )
}
