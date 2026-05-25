'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, RefreshCw, Eye, EyeOff, AlertCircle } from 'lucide-react'

type Provider = 'kakao' | 'sms' | 'email' | 'naver_map'

interface Integration {
  provider: Provider
  label: string
  description: string
  is_active: boolean
  tested_at: string | null
  fields: { key: string; label: string; type: string; placeholder: string }[]
}

const INTEGRATIONS: Integration[] = [
  {
    provider: 'kakao', label: '카카오 알림톡',
    description: '카카오 비즈니스 채널을 통한 알림톡 발송',
    is_active: true, tested_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    fields: [
      { key: 'sender_key', label: '발신프로필 키', type: 'password', placeholder: 'sender_key...' },
      { key: 'pfid',       label: '플러스친구 ID', type: 'text',     placeholder: '@채널명' },
    ],
  },
  {
    provider: 'sms', label: '솔라피 (문자)',
    description: 'Solapi API를 통한 SMS/LMS 발송',
    is_active: false, tested_at: null,
    fields: [
      { key: 'api_key',      label: 'API Key',    type: 'password', placeholder: 'NCSOL...' },
      { key: 'api_secret',   label: 'API Secret', type: 'password', placeholder: '' },
      { key: 'sender_phone', label: '발신번호',    type: 'text',     placeholder: '01012345678' },
    ],
  },
  {
    provider: 'email', label: '이메일 (SMTP)',
    description: '자체 SMTP 서버를 통한 이메일 발송',
    is_active: true, tested_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    fields: [
      { key: 'smtp_host', label: 'SMTP 호스트', type: 'text',     placeholder: 'smtp.gmail.com' },
      { key: 'smtp_port', label: '포트',        type: 'text',     placeholder: '587' },
      { key: 'user',      label: '사용자명',    type: 'text',     placeholder: 'user@company.com' },
      { key: 'password',  label: '비밀번호',    type: 'password', placeholder: '' },
    ],
  },
  {
    provider: 'naver_map', label: '네이버 지도',
    description: '고객사 주소 지도 표시에 사용',
    is_active: false, tested_at: null,
    fields: [
      { key: 'client_id',     label: 'Client ID',     type: 'text',     placeholder: '' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '' },
    ],
  },
]

const PROVIDER_ICON: Record<Provider, string> = {
  kakao: '💬', sms: '📱', email: '📧', naver_map: '🗺️',
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const [expanded, setExpanded]     = useState(integration.is_active)
  const [showSecrets, setShowSecrets] = useState(false)
  const [testing, setTesting]       = useState(false)

  const handleTest = () => { setTesting(true); setTimeout(() => setTesting(false), 2000) }

  const formatTested = (at: string) => {
    const d = Math.floor((Date.now() - new Date(at).getTime()) / (1000 * 60 * 60 * 24))
    return d === 0 ? '오늘' : `${d}일 전`
  }

  return (
    <div className="bg-dk-surface border border-dk-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-xl bg-dk-surface2 flex items-center justify-center text-xl">
          {PROVIDER_ICON[integration.provider]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-dk-text">{integration.label}</span>
            {integration.is_active
              ? <CheckCircle className="w-4 h-4 text-dk-green" />
              : <XCircle className="w-4 h-4 text-dk-dim" />
            }
          </div>
          <p className="text-xs text-dk-muted mt-0.5">{integration.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {integration.tested_at && (
            <span className="text-xs text-dk-dim">테스트: {formatTested(integration.tested_at)}</span>
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
            {integration.fields.map(field => (
              <div key={field.key}>
                <label className="text-xs font-medium text-dk-muted mb-1.5 block">{field.label}</label>
                <input
                  type={field.type === 'password' && !showSecrets ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm border border-dk-border rounded-lg bg-dk-surface text-dk-text placeholder:text-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue font-mono" />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button onClick={handleTest} disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              {testing ? '테스트 중...' : '연결 테스트'}
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-white bg-dk-blue rounded-lg hover:bg-dk-blue/80">
              저장
            </button>
            {integration.is_active && (
              <button className="ml-auto px-3 py-1.5 text-xs font-medium text-dk-red border border-dk-red/30 rounded-lg hover:bg-dk-red/10">
                연동 해제
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function IntegrationsSettingPage() {
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

      <div className="space-y-3">
        {INTEGRATIONS.map(integration => (
          <IntegrationCard key={integration.provider} integration={integration} />
        ))}
      </div>
    </div>
  )
}
