'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import type { Contact } from '@/types/domain'

interface FormState {
  name: string
  department: string
  title: string
  mobile: string
  fax: string
  email: string
  notes: string
  company_name: string
}

const EMPTY: FormState = {
  name: '', department: '', title: '',
  mobile: '', fax: '', email: '',
  notes: '', company_name: '',
}

export default function ContactEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id ?? '') as string

  const [form,      setForm]      = useState<FormState>(EMPTY)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    if (!id) return
    fetch(`/api/contacts/${id}`)
      .then(r => r.json())
      .then(j => {
        const c: Contact = j.data
        if (!c) return
        setForm({
          name:         c.name,
          department:   c.department ?? '',
          title:        c.title ?? '',
          mobile:       c.mobile ?? '',
          fax:          c.fax ?? '',
          email:        c.email ?? '',
          notes:        c.notes ?? '',
          company_name: c.company?.name ?? '',
        })
      })
      .catch(() => setError('불러오기 실패'))
      .finally(() => setLoading(false))
  }, [id])

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('이름은 필수입니다'); return }
    setSaving(true)
    setError('')

    try {
      // 회사명이 변경됐으면 회사 upsert 후 company_id 갱신
      let companyId: string | null = null
      if (form.company_name.trim()) {
        const coRes = await fetch('/api/companies/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.company_name.trim() }),
        }).then(r => r.json())
        companyId = coRes.data?.id ?? null
      }

      const patchBody: Record<string, unknown> = {
        name:       form.name.trim(),
        department: form.department.trim() || null,
        title:      form.title.trim()      || null,
        mobile:     form.mobile.trim()     || null,
        fax:        form.fax.trim()        || null,
        email:      form.email.trim()      || null,
        notes:      form.notes.trim()      || null,
      }
      if (companyId !== null || !form.company_name.trim()) {
        patchBody.company_id = companyId
      }

      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      }).then(r => r.json())

      if (res.error) throw new Error(res.error.message)
      router.push(`/app/contacts/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-dk-muted" /></div>
  }

  return (
    <div className="p-6 max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg text-dk-dim hover:text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-dk-text">연락처 편집</h1>
          <p className="text-xs text-dk-muted mt-0.5">정보를 수정하고 저장하세요</p>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-dk-red">{error}</div>
      )}

      {/* 담당자 정보 */}
      <section className="space-y-3 p-4 bg-dk-surface border border-dk-border rounded-xl">
        <p className="text-xs font-semibold text-dk-dim uppercase tracking-wider">담당자 정보</p>
        <Field label="이름 *"   value={form.name}       onChange={set('name')} />
        <Field label="부서"     value={form.department} onChange={set('department')} />
        <Field label="직책"     value={form.title}      onChange={set('title')} />
        <Field label="휴대폰"   value={form.mobile}     onChange={set('mobile')} type="tel" />
        <Field label="팩스"     value={form.fax}        onChange={set('fax')}    type="tel" />
        <Field label="이메일"   value={form.email}      onChange={set('email')}  type="email" />
      </section>

      {/* 회사 정보 */}
      <section className="space-y-3 p-4 bg-dk-surface border border-dk-border rounded-xl">
        <p className="text-xs font-semibold text-dk-dim uppercase tracking-wider">회사 정보</p>
        <Field label="회사명" value={form.company_name} onChange={set('company_name')} />
      </section>

      {/* 메모 */}
      <section className="space-y-2 p-4 bg-dk-surface border border-dk-border rounded-xl">
        <p className="text-xs font-semibold text-dk-dim uppercase tracking-wider">메모</p>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          rows={4}
          placeholder="자유 메모..."
          className="w-full px-3 py-2 text-sm bg-dk-surface2 border border-dk-border rounded-lg text-dk-text placeholder-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue/50 resize-none"
        />
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 flex items-center justify-center gap-2 bg-dk-accent hover:bg-dk-accentHover text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        저장
      </button>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text',
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-medium text-dk-dim uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="mt-1 w-full px-3 py-2 text-sm bg-dk-surface2 border border-dk-border rounded-lg text-dk-text placeholder-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue/50"
      />
    </div>
  )
}
