'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'

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

export default function NewContactPage() {
  const router = useRouter()

  const [form,    setForm]    = useState<FormState>(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('이름은 필수입니다'); return }
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recognized: {
            contact_name: form.name.trim(),
            company_name: form.company_name.trim() || null,
            department:   form.department.trim()   || null,
            title:        form.title.trim()        || null,
            mobile:       form.mobile.trim()       || null,
            phone:        null,
            fax:          form.fax.trim()          || null,
            email:        form.email.trim()        || null,
            website:      null,
            address:      null,
            biz_no:       null,
          },
          notes: form.notes.trim() || null,
        }),
      }).then(r => r.json())

      if (res.error) throw new Error(res.error.message)
      router.push(`/app/contacts/${res.data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/contacts" className="p-1.5 rounded-lg text-dk-dim hover:text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-dk-text">연락처 직접 등록</h1>
          <p className="text-xs text-dk-muted mt-0.5">명함 없이 연락처를 직접 입력합니다</p>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-dk-red">{error}</div>
      )}

      {/* 담당자 정보 */}
      <section className="space-y-3 p-4 bg-dk-surface border border-dk-border rounded-xl">
        <p className="text-xs font-semibold text-dk-dim uppercase tracking-wider">담당자 정보</p>
        <Field label="이름 *"  value={form.name}       onChange={set('name')} />
        <Field label="부서"    value={form.department} onChange={set('department')} />
        <Field label="직책"    value={form.title}      onChange={set('title')} />
        <Field label="휴대폰"  value={form.mobile}     onChange={set('mobile')} type="tel" />
        <Field label="팩스"    value={form.fax}        onChange={set('fax')}    type="tel" />
        <Field label="이메일"  value={form.email}      onChange={set('email')}  type="email" />
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
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        등록
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
