'use client'

import { useState, useEffect } from 'react'
import {
  Building2, Phone, Mail, MapPin,
  Shield, AlertTriangle, CheckCircle2, Pencil, Save, X, Loader2
} from 'lucide-react'

type Tenant = {
  id: string; name: string; biz_no: string | null
  ceo_name: string | null; email: string | null
  phone: string | null; address: string | null
  is_active: boolean; created_at: string
  stats: {
    total_companies: number; total_users: number
    messages_this_month: number; active_contracts: number
  }
}

function SectionCard({ title, icon: Icon, children, action }: {
  title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="bg-dk-surface border border-dk-border rounded-xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-dk-border">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-dk-muted" />
          <h3 className="text-sm font-semibold text-dk-text">{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Field({ label, value, editing, name, onChange, type = 'text', placeholder, readOnly }: {
  label: string; value: string; editing: boolean; name: string
  onChange: (name: string, val: string) => void
  type?: string; placeholder?: string; readOnly?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-medium text-dk-muted mb-1 block">{label}</label>
      {editing && !readOnly ? (
        <input type={type} value={value}
          onChange={e => onChange(name, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-dk-border rounded-lg text-sm bg-dk-surface2 text-dk-text focus:outline-none focus:ring-2 focus:ring-dk-blue" />
      ) : (
        <p className="text-sm text-dk-text">{value || '—'}</p>
      )}
    </div>
  )
}

/** 일반 admin의 자기 테넌트 정보 페이지.
 *  사업자번호 등 민감 필드는 슈퍼관리자가 관리. admin은 대표/이메일/전화/주소만 편집 가능. */
export default function TenantSettingsPage() {
  const [tenant, setTenant]   = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState<Partial<Tenant>>({})
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/settings/tenant')
      .then(r => r.json())
      .then(json => { if (json.data) { setTenant(json.data as Tenant); setDraft(json.data as Tenant) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleChange = (name: string, val: string) => setDraft(prev => ({ ...prev, [name]: val }))

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/settings/tenant', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:     draft.name,
        ceo_name: draft.ceo_name,
        email:    draft.email,
        phone:    draft.phone,
        address:  draft.address,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      load()
    }
  }

  const handleCancel = () => { setDraft(tenant ?? {}); setEditing(false) }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-dk-muted" /></div>
  }
  if (!tenant) {
    return <div className="p-6"><p className="text-dk-muted">테넌트 정보를 불러올 수 없습니다.</p></div>
  }

  const get = (k: keyof Tenant): string => (draft[k] as string | null | undefined) ?? ''

  return (
    <div className="space-y-6 max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-dk-text">조직 정보</h1>
          <p className="text-sm text-dk-muted mt-0.5">서비스에 표시되는 사업자 기본 정보를 관리합니다</p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-dk-green text-sm bg-dk-green/10 px-3 py-1.5 rounded-lg border border-dk-green/30">
            <CheckCircle2 className="w-4 h-4" />저장되었습니다
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '고객사',         value: tenant.stats.total_companies },
          { label: '활성 계약',      value: tenant.stats.active_contracts },
          { label: '사용자',         value: tenant.stats.total_users },
          { label: '이번 달 발송',   value: tenant.stats.messages_this_month.toLocaleString() },
        ].map(s => (
          <div key={s.label} className="bg-dk-surface border border-dk-border rounded-xl px-4 py-3">
            <p className="text-xs text-dk-muted">{s.label}</p>
            <p className="text-xl font-bold text-dk-text mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      <SectionCard title="기본 정보" icon={Building2}
        action={
          editing ? (
            <div className="flex gap-2">
              <button onClick={handleCancel}
                className="flex items-center gap-1 text-xs text-dk-muted px-2.5 py-1.5 rounded-lg border border-dk-border hover:bg-dk-surface2">
                <X className="w-3.5 h-3.5" /> 취소
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1 text-xs text-white bg-dk-blue px-2.5 py-1.5 rounded-lg hover:bg-dk-blue/80 disabled:opacity-50">
                <Save className="w-3.5 h-3.5" /> {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-dk-muted px-2.5 py-1.5 rounded-lg border border-dk-border hover:bg-dk-surface2">
              <Pencil className="w-3.5 h-3.5" /> 편집
            </button>
          )
        }>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="상호명"        value={get('name')}    editing={editing} name="name"     onChange={handleChange} placeholder="(주)회사명" />
          <Field label="사업자등록번호" value={get('biz_no')}  editing={editing} name="biz_no"   onChange={handleChange} placeholder="000-00-00000" readOnly />
          <Field label="대표자명"       value={get('ceo_name')} editing={editing} name="ceo_name" onChange={handleChange} placeholder="홍길동" />
          <Field label="가입일"         value={new Date(tenant.created_at).toLocaleDateString('ko-KR')} editing={false} name="created_at" onChange={() => {}} />
        </div>
        {editing && (
          <p className="text-[11px] text-dk-dim mt-3">
            ⓘ 사업자등록번호는 운영팀에서만 변경할 수 있습니다.
          </p>
        )}
      </SectionCard>

      <SectionCard title="연락처" icon={Phone}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">대표 전화</label>
            {editing ? (
              <input value={get('phone')} onChange={e => handleChange('phone', e.target.value)} placeholder="02-1234-5678"
                className="w-full px-3 py-2 border border-dk-border rounded-lg text-sm bg-dk-surface2 text-dk-text focus:outline-none focus:ring-2 focus:ring-dk-blue" />
            ) : (
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-dk-dim" /><p className="text-sm text-dk-text">{tenant.phone || '—'}</p></div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-dk-muted mb-1 block">이메일</label>
            {editing ? (
              <input type="email" value={get('email')} onChange={e => handleChange('email', e.target.value)} placeholder="contact@company.com"
                className="w-full px-3 py-2 border border-dk-border rounded-lg text-sm bg-dk-surface2 text-dk-text focus:outline-none focus:ring-2 focus:ring-dk-blue" />
            ) : (
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-dk-dim" /><p className="text-sm text-dk-text">{tenant.email || '—'}</p></div>
            )}
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-dk-muted mb-1 block">주소</label>
            {editing ? (
              <input value={get('address')} onChange={e => handleChange('address', e.target.value)} placeholder="서울시 강남구 ..."
                className="w-full px-3 py-2 border border-dk-border rounded-lg text-sm bg-dk-surface2 text-dk-text focus:outline-none focus:ring-2 focus:ring-dk-blue" />
            ) : (
              <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-dk-dim" /><p className="text-sm text-dk-text">{tenant.address || '—'}</p></div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="위험 구역" icon={Shield}>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-dk-red/5 border border-dk-red/30 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-dk-red mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-dk-red">서비스 해지</p>
              <p className="text-xs text-dk-muted mt-0.5">계정 해지는 운영팀에 직접 요청해 주세요. 해지 후에도 일정 기간 데이터 복구가 가능합니다.</p>
            </div>
            <button className="shrink-0 text-xs font-medium text-dk-red border border-dk-red/30 px-3 py-1.5 rounded-lg hover:bg-dk-red/10 transition-colors"
              onClick={() => alert('운영팀에 문의해 주세요')}>
              운영팀 문의
            </button>
          </div>
        </div>
      </SectionCard>

    </div>
  )
}
