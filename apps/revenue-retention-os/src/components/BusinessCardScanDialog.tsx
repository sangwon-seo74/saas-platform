'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Camera, Loader2, AlertTriangle, CheckCircle2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-dk-border bg-dk-surface2 text-dk-text placeholder-dk-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-dk-blue'
const LABEL_CLS = 'text-xs font-medium text-dk-muted mb-1 block'

type Extracted = {
  company_name: string | null
  contact_name: string | null
  title: string | null
  department: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  website: string | null
  address: string | null
  biz_no: string | null
}

type DuplicateContact = {
  id: string
  name: string
  title: string | null
  email: string | null
  mobile: string | null
  company_id: string | null
  company: { id: string; name: string } | null
}

type ExistingCompany = { id: string; name: string }

type Props = {
  onClose: () => void
  onSuccess: () => void
  presetCompanyId?: string
  presetCompanyName?: string
}

type Step = 'upload' | 'scanning' | 'review' | 'saving'

export function BusinessCardScanDialog({ onClose, onSuccess, presetCompanyId, presetCompanyName }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [error, setError] = useState<string | null>(null)

  // 스캔 결과
  const [imageBase64, setImageBase64] = useState<string>('')
  const [mediaType, setMediaType]     = useState<string>('image/jpeg')
  const [previewUrl, setPreviewUrl]   = useState<string>('')
  const [extracted, setExtracted]     = useState<Extracted | null>(null)
  const [duplicates, setDuplicates]   = useState<DuplicateContact[]>([])

  // 편집 폼 상태
  const [form, setForm] = useState({
    contact_name: '', title: '', department: '',
    phone: '', mobile: '', email: '',
    company_name: presetCompanyName ?? '',
    website: '', address: '', biz_no: '',
    is_primary: false, is_decision_maker: false,
  })
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(presetCompanyId ?? '')
  const [companySuggestions, setCompanySuggestions] = useState<ExistingCompany[]>([])
  const [duplicateAction, setDuplicateAction] = useState<'new' | 'update' | null>(null)
  const [selectedDuplicateId, setSelectedDuplicateId] = useState<string>('')

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  // 파일 선택 처리
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하여야 합니다')
      return
    }

    setError(null)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setMediaType(file.type)

    // Base64 변환
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setImageBase64(base64)
      await handleScan(base64, file.type)
    }
    reader.readAsDataURL(file)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScan = async (base64: string, mType: string) => {
    setStep('scanning')
    setError(null)
    try {
      const res = await fetch('/api/business-cards/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, media_type: mType }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error?.message ?? 'OCR 처리 중 오류가 발생했습니다')
        setStep('upload')
        return
      }
      const data = json.data as { extracted: Extracted; duplicate_contacts: DuplicateContact[] }
      const ext = data.extracted

      setExtracted(ext)
      setDuplicates(data.duplicate_contacts ?? [])
      setForm(prev => ({
        ...prev,
        contact_name: ext.contact_name ?? '',
        title:        ext.title        ?? '',
        department:   ext.department   ?? '',
        phone:        ext.phone        ?? '',
        mobile:       ext.mobile       ?? '',
        email:        ext.email        ?? '',
        company_name: presetCompanyId ? (presetCompanyName ?? '') : (ext.company_name ?? ''),
        website:      ext.website      ?? '',
        address:      ext.address      ?? '',
        biz_no:       ext.biz_no       ?? '',
      }))

      // 업체명으로 기존 업체 검색
      if (!presetCompanyId && ext.company_name) {
        const sRes = await fetch(`/api/companies?q=${encodeURIComponent(ext.company_name)}&limit=5`)
        const sJson = await sRes.json().catch(() => null)
        setCompanySuggestions((sJson?.data?.data ?? []) as ExistingCompany[])
      }

      setStep('review')
    } catch {
      setError('네트워크 오류가 발생했습니다')
      setStep('upload')
    }
  }

  const handleSubmit = async () => {
    if (!form.contact_name.trim()) { setError('담당자 이름은 필수입니다'); return }
    if (!selectedCompanyId && !form.company_name.trim()) {
      setError('업체를 선택하거나 업체명을 입력해 주세요'); return
    }
    if (duplicates.length > 0 && duplicateAction === null) {
      setError('중복 담당자 처리 방법을 선택해 주세요'); return
    }

    setStep('saving')
    setError(null)

    try {
      let companyId = selectedCompanyId

      // 업체가 없으면 신규 등록
      if (!companyId) {
        const cRes = await fetch('/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:    form.company_name.trim(),
            biz_no:  form.biz_no.trim() || null,
            website: form.website.trim() || null,
            address_road: form.address.trim() || null,
          }),
        })
        const cJson = await cRes.json().catch(() => null)
        if (!cRes.ok) {
          setError(cJson?.error?.message ?? '업체 등록 중 오류가 발생했습니다')
          setStep('review')
          return
        }
        companyId = cJson.data.id as string
      }

      let contactId: string

      if (duplicateAction === 'update' && selectedDuplicateId) {
        // 기존 담당자 업데이트
        const uRes = await fetch(`/api/contacts/${selectedDuplicateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:              form.contact_name.trim(),
            title:             form.title.trim()      || null,
            department:        form.department.trim() || null,
            phone:             form.phone.trim()      || null,
            mobile:            form.mobile.trim()     || null,
            email:             form.email.trim()      || null,
            is_primary:        form.is_primary,
            is_decision_maker: form.is_decision_maker,
          }),
        })
        const uJson = await uRes.json().catch(() => null)
        if (!uRes.ok) {
          setError(uJson?.error?.message ?? '담당자 수정 중 오류가 발생했습니다')
          setStep('review')
          return
        }
        contactId = selectedDuplicateId
      } else {
        // 신규 담당자 등록
        const ctRes = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id:        companyId,
            name:              form.contact_name.trim(),
            title:             form.title.trim()      || null,
            department:        form.department.trim() || null,
            phone:             form.phone.trim()      || null,
            mobile:            form.mobile.trim()     || null,
            email:             form.email.trim()      || null,
            is_primary:        form.is_primary,
            is_decision_maker: form.is_decision_maker,
          }),
        })
        const ctJson = await ctRes.json().catch(() => null)
        if (!ctRes.ok) {
          setError(ctJson?.error?.message ?? '담당자 등록 중 오류가 발생했습니다')
          setStep('review')
          return
        }
        contactId = ctJson.data.id as string
      }

      // 명함 이미지 업로드
      if (imageBase64) {
        await fetch(`/api/business-cards/${contactId}/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: imageBase64, media_type: mediaType }),
        })
        // 이미지 업로드 실패해도 담당자 등록은 완료된 것으로 처리
      }

      onSuccess()
    } catch {
      setError('저장 중 오류가 발생했습니다')
      setStep('review')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dk-surface border border-dk-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-y-auto max-h-[95vh]">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dk-border">
          <div>
            <h3 className="text-base font-semibold text-dk-text flex items-center gap-2">
              <Camera className="w-4 h-4 text-dk-blue" />
              명함 스캔 등록
            </h3>
            <p className="text-xs text-dk-muted mt-0.5">명함 사진으로 업체·담당자를 자동 등록합니다</p>
          </div>
          <button onClick={onClose} className="text-dk-muted hover:text-dk-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* 오류 메시지 */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-tint-red border border-tint-red-border text-dk-red text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1: 업로드 */}
          {(step === 'upload' || step === 'scanning') && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }}
              />
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
                  step === 'scanning'
                    ? 'border-dk-blue bg-tint-blue'
                    : 'border-dk-border hover:border-dk-blue hover:bg-dk-surface2',
                )}
                onClick={() => step === 'upload' && fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  if (e.dataTransfer.files?.[0] && step === 'upload') handleFileSelect(e.dataTransfer.files[0])
                }}
              >
                {step === 'scanning' ? (
                  <div className="flex flex-col items-center gap-3 text-dk-blue">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-sm font-medium">AI가 명함을 분석 중입니다...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-dk-muted">
                    <Upload className="w-8 h-8" />
                    <div>
                      <p className="text-sm font-medium text-dk-text">명함 사진을 업로드하세요</p>
                      <p className="text-xs mt-1">클릭하거나 드래그 · 모바일에서 카메라 촬영 가능</p>
                      <p className="text-xs mt-0.5">JPEG, PNG, WEBP · 최대 10MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: 검토 및 편집 */}
          {step === 'review' && extracted && (
            <div className="space-y-5">

              {/* 미리보기 */}
              {previewUrl && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="명함 미리보기" className="max-h-36 rounded-lg border border-dk-border object-contain" />
                </div>
              )}

              {/* 중복 경고 */}
              {duplicates.length > 0 && (
                <div className="rounded-xl border border-tint-amber-border bg-tint-amber p-4 space-y-3">
                  <div className="flex items-center gap-2 text-dk-orange text-sm font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    동일 이메일/휴대폰의 담당자가 이미 등록되어 있습니다
                  </div>
                  <div className="space-y-2">
                    {duplicates.map(d => (
                      <div key={d.id} className="flex items-center gap-3 text-sm">
                        <input
                          type="radio" name="dup" id={`dup-${d.id}`}
                          value={d.id}
                          checked={duplicateAction === 'update' && selectedDuplicateId === d.id}
                          onChange={() => { setDuplicateAction('update'); setSelectedDuplicateId(d.id) }}
                          className="accent-dk-blue"
                        />
                        <label htmlFor={`dup-${d.id}`} className="text-dk-text cursor-pointer">
                          <span className="font-medium">{d.name}</span>
                          {d.title && <span className="text-dk-muted ml-1">({d.title})</span>}
                          {d.company && <span className="text-dk-muted ml-1">· {d.company.name}</span>}
                        </label>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 text-sm">
                      <input
                        type="radio" name="dup" id="dup-new"
                        checked={duplicateAction === 'new'}
                        onChange={() => { setDuplicateAction('new'); setSelectedDuplicateId('') }}
                        className="accent-dk-blue"
                      />
                      <label htmlFor="dup-new" className="text-dk-text cursor-pointer">신규 담당자로 등록</label>
                    </div>
                  </div>
                </div>
              )}

              {/* 업체 선택/입력 */}
              {!presetCompanyId && (
                <div>
                  <label className={LABEL_CLS}>업체 <span className="text-dk-red">*</span></label>
                  {companySuggestions.length > 0 && !selectedCompanyId ? (
                    <div className="space-y-1.5 mb-2">
                      <p className="text-xs text-dk-muted">기존 업체와 유사한 이름이 있습니다. 선택하거나 신규 등록하세요.</p>
                      {companySuggestions.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedCompanyId(c.id); set('company_name', c.name) }}
                          className="w-full text-left px-3 py-2 text-sm rounded-lg border border-dk-border bg-dk-surface2 hover:border-dk-blue hover:bg-tint-blue text-dk-text transition-colors"
                        >
                          {c.name}
                          <span className="ml-1 text-xs text-dk-blue">선택</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCompanySuggestions([])}
                        className="text-xs text-dk-muted underline"
                      >
                        신규 업체로 등록
                      </button>
                    </div>
                  ) : selectedCompanyId ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-tint-blue border border-tint-blue-border text-dk-blue text-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="font-medium">{form.company_name}</span>
                      <button type="button" onClick={() => { setSelectedCompanyId(''); setCompanySuggestions([]) }} className="ml-auto">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="업체명 입력 (신규 등록)"
                      value={form.company_name}
                      onChange={e => set('company_name', e.target.value)}
                      className={INPUT_CLS}
                    />
                  )}
                </div>
              )}

              {/* 담당자 정보 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={LABEL_CLS}>담당자 이름 <span className="text-dk-red">*</span></label>
                  <input type="text" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} className={INPUT_CLS} placeholder="홍길동" />
                </div>
                <div>
                  <label className={LABEL_CLS}>직함</label>
                  <input type="text" value={form.title} onChange={e => set('title', e.target.value)} className={INPUT_CLS} placeholder="대리" />
                </div>
                <div>
                  <label className={LABEL_CLS}>부서</label>
                  <input type="text" value={form.department} onChange={e => set('department', e.target.value)} className={INPUT_CLS} placeholder="영업팀" />
                </div>
                <div>
                  <label className={LABEL_CLS}>전화</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={INPUT_CLS} placeholder="02-1234-5678" />
                </div>
                <div>
                  <label className={LABEL_CLS}>휴대폰</label>
                  <input type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} className={INPUT_CLS} placeholder="010-1234-5678" />
                </div>
                <div className="col-span-2">
                  <label className={LABEL_CLS}>이메일</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={INPUT_CLS} placeholder="hong@example.com" />
                </div>
              </div>

              {/* 신규 업체일 때 추가 정보 */}
              {!presetCompanyId && !selectedCompanyId && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-dk-border">
                  <p className="col-span-2 text-xs text-dk-muted font-medium">신규 업체 추가 정보 (선택)</p>
                  <div>
                    <label className={LABEL_CLS}>사업자번호</label>
                    <input type="text" value={form.biz_no} onChange={e => set('biz_no', e.target.value)} className={INPUT_CLS} placeholder="123-45-67890" />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>웹사이트</label>
                    <input type="url" value={form.website} onChange={e => set('website', e.target.value)} className={INPUT_CLS} placeholder="https://example.com" />
                  </div>
                  <div className="col-span-2">
                    <label className={LABEL_CLS}>주소</label>
                    <input type="text" value={form.address} onChange={e => set('address', e.target.value)} className={INPUT_CLS} placeholder="서울시 강남구..." />
                  </div>
                </div>
              )}

              {/* 담당자 속성 */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-dk-text">
                  <input type="checkbox" checked={form.is_primary} onChange={e => set('is_primary', e.target.checked)} className="accent-dk-blue" />
                  주 담당자
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-dk-text">
                  <input type="checkbox" checked={form.is_decision_maker} onChange={e => set('is_decision_maker', e.target.checked)} className="accent-dk-blue" />
                  의사결정자
                </label>
              </div>

              {/* 다른 명함 스캔 */}
              <button
                type="button"
                onClick={() => { setStep('upload'); setExtracted(null); setDuplicates([]); setImageBase64(''); setPreviewUrl('') }}
                className="text-xs text-dk-muted underline"
              >
                다른 명함 다시 스캔
              </button>
            </div>
          )}

          {/* 저장 중 */}
          {step === 'saving' && (
            <div className="flex flex-col items-center gap-3 py-8 text-dk-blue">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">저장 중입니다...</span>
            </div>
          )}
        </div>

        {/* 푸터 버튼 */}
        {step === 'review' && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-dk-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-dk-border text-dk-muted hover:text-dk-text transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 text-sm rounded-lg bg-dk-blue text-white font-medium hover:opacity-90 transition-opacity"
            >
              {duplicateAction === 'update' ? '담당자 업데이트' : '등록 완료'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
