'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, Save, AlertCircle, CheckCircle } from 'lucide-react'

type SettingKey =
  | 'solapi.api_key'
  | 'solapi.api_secret'
  | 'solapi.sender_phone'
  | 'kakao.sender_key'
  | 'email.from_name'
  | 'email.from_email'

interface FieldDef {
  key: SettingKey
  label: string
  secret?: boolean
  placeholder?: string
  hint?: string
}

const SECTIONS: { title: string; desc: string; fields: FieldDef[] }[] = [
  {
    title: '문자 · 카카오 알림톡 (Solapi)',
    desc: '모든 테넌트가 공유하는 Solapi API 자격증명',
    fields: [
      { key: 'solapi.api_key',      label: 'API Key',   secret: true, placeholder: 'NCSOL...' },
      { key: 'solapi.api_secret',   label: 'API Secret', secret: true, placeholder: '' },
      { key: 'solapi.sender_phone', label: '발신 번호',  placeholder: '01012345678', hint: '하이픈 없이 입력' },
      { key: 'kakao.sender_key',    label: '카카오 발신프로필 키 (pfId)', secret: true, placeholder: '' },
    ],
  },
  {
    title: '이메일 (Resend)',
    desc: '플랫폼 공용 발신자 정보. RESEND_API_KEY는 core-api 환경변수에서 별도 설정.',
    fields: [
      { key: 'email.from_name',  label: '발신자명',  placeholder: 'SaaS Platform' },
      { key: 'email.from_email', label: '발신 이메일', placeholder: 'noreply@saas-foundry.io', hint: 'Resend에서 도메인 인증 필요' },
    ],
  },
]

const SECRET_KEYS = new Set<SettingKey>(['solapi.api_key', 'solapi.api_secret', 'kakao.sender_key'])

export default function PlatformSettingsPage() {
  const [values,      setValues]      = useState<Record<string, string>>({})
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [savedMsg,    setSavedMsg]    = useState<string | null>(null)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/super-admin/system/platform-settings')
      .then(r => r.json())
      .then(json => { if (json.data?.settings) setValues(json.data.settings) })
      .catch(() => setErrorMsg('설정을 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSavedMsg(null)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/super-admin/system/platform-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: values }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setErrorMsg(json.error?.message ?? '저장 실패'); return }
      setSavedMsg('저장됐습니다')
      setTimeout(() => setSavedMsg(null), 3000)
    } catch {
      setErrorMsg('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">플랫폼 설정</h1>
          <p className="text-sm text-gray-400 mt-0.5">모든 테넌트가 공유하는 외부 API 자격증명을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSecrets(!showSecrets)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 border border-white/10 rounded-lg hover:bg-white/5"
          >
            {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showSecrets ? '숨기기' : '보기'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-sm text-green-400">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {savedMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {SECTIONS.map(section => (
        <div key={section.title} className="bg-gray-800/50 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white">{section.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{section.desc}</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            {section.fields.map(field => {
              const isSecret = SECRET_KEYS.has(field.key)
              const isSet = values[field.key] === '__set__'
              return (
                <div key={field.key} className={field.key === 'kakao.sender_key' ? 'col-span-2' : ''}>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">{field.label}</label>
                  <input
                    type={isSecret && !showSecrets ? 'password' : 'text'}
                    value={isSet ? '' : (values[field.key] ?? '')}
                    onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={isSet ? '(설정됨 — 변경 시 입력)' : (field.placeholder ?? '')}
                    className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-gray-900 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  {field.hint && (
                    <p className="text-xs text-gray-500 mt-1">{field.hint}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          자격증명 변경 즉시 모든 테넌트의 발송에 적용됩니다. 잘못된 값 저장 시 전체 발송이 중단될 수 있습니다.
        </p>
      </div>
    </div>
  )
}
