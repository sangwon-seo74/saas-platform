'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, Camera, Loader2, CheckCircle2,
  AlertCircle, X, RotateCcw, Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecognizedCardData } from '@/types/domain'

type ScanStep = 'upload' | 'scanning' | 'review' | 'saving' | 'done' | 'error'

interface DuplicateContact {
  id: string
  name: string
  title: string | null
  email: string | null
  mobile: string | null
  company: { name: string } | null
  match_type?: 'hard' | 'soft'
}

const EMPTY_FORM: RecognizedCardData = {
  company_name: null, contact_name: null, title: null, department: null,
  phone: null, mobile: null, fax: null, email: null, website: null, address: null, biz_no: null,
}

export default function ScanPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step,       setStep]       = useState<ScanStep>('upload')
  const [imageB64,   setImageB64]   = useState('')
  const [mediaType,  setMediaType]  = useState('image/jpeg')
  const [preview,    setPreview]    = useState('')
  const [form,       setForm]       = useState<RecognizedCardData>(EMPTY_FORM)
  const [duplicates, setDuplicates] = useState<DuplicateContact[]>([])
  const [errMsg,     setErrMsg]     = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const loadImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)
      const base64 = dataUrl.split(',')[1]
      setImageB64(base64)
      setMediaType(file.type || 'image/jpeg')
    }
    reader.readAsDataURL(file)
  }

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return
    const file = files[0]
    if (!file.type.startsWith('image/')) { setErrMsg('이미지 파일만 업로드할 수 있습니다'); return }
    loadImage(file)
    setStep('upload')
    setErrMsg('')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [])

  const scanCard = async () => {
    if (!imageB64) return
    setStep('scanning')
    setErrMsg('')
    try {
      const res = await fetch('/api/business-cards/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageB64, media_type: mediaType }),
      }).then(r => r.json())

      if (res.error) throw new Error(res.error.message)
      setForm(res.data.extracted ?? EMPTY_FORM)
      setDuplicates(res.data.duplicate_contacts ?? [])
      setStep('review')
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : '인식에 실패했습니다')
      setStep('error')
    }
  }

  const saveContact = async () => {
    setStep('saving')
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recognized: form, image_base64: imageB64, media_type: mediaType }),
      }).then(r => r.json())

      if (res.error) throw new Error(res.error.message)
      setStep('done')
      setTimeout(() => router.push(`/app/contacts/${res.data.id}`), 1200)
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : '저장에 실패했습니다')
      setStep('error')
    }
  }

  const reset = () => {
    setStep('upload'); setImageB64(''); setPreview(''); setForm(EMPTY_FORM)
    setDuplicates([]); setErrMsg('')
  }

  const field = (key: keyof RecognizedCardData, label: string) => (
    <div key={key}>
      <label className="text-[10px] font-medium text-dk-dim uppercase tracking-wider">{label}</label>
      <input
        value={form[key] ?? ''}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value || null }))}
        className="mt-1 w-full px-3 py-2 text-sm bg-dk-surface2 border border-dk-border rounded-lg text-dk-text placeholder-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue/50"
      />
    </div>
  )

  /* ── 완료 ──────────────────────────────────────────────── */
  if (step === 'done') {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-dk-green mx-auto" />
          <p className="text-dk-text font-semibold">고객이 등록됐습니다</p>
          <p className="text-xs text-dk-muted">상세 페이지로 이동합니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-lg font-bold text-dk-text">명함 등록</h1>
        <p className="text-xs text-dk-muted mt-0.5">명함을 촬영하거나 이미지를 업로드해 고객을 등록합니다</p>
      </div>

      {/* 이미지 업로드 존 */}
      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer',
            isDragging ? 'border-dk-blue bg-dk-accent/10' : 'border-dk-border hover:border-dk-border2 hover:bg-dk-surface2'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-dk-dim mx-auto mb-3" />
          <p className="text-sm font-medium text-dk-text mb-1">이미지를 드래그하거나 클릭해서 업로드</p>
          <p className="text-xs text-dk-dim">JPG, PNG, WEBP · 최대 10MB</p>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFiles(e.target.files)} />
        </div>
      ) : (
        <div className="relative">
          <img src={preview} alt="명함 미리보기" className="w-full rounded-2xl border border-dk-border object-contain max-h-60" />
          <button onClick={reset} className="absolute top-2 right-2 p-1.5 bg-dk-bg/80 rounded-lg text-dk-muted hover:text-dk-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 에러 */}
      {errMsg && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 text-dk-red shrink-0" />
          <p className="text-xs text-dk-red">{errMsg}</p>
        </div>
      )}

      {/* 스캔 버튼 */}
      {preview && (step === 'upload' || step === 'error') && (
        <button onClick={scanCard} className="w-full py-2.5 bg-dk-accent text-white rounded-xl font-medium text-sm hover:bg-dk-accentHover transition-colors flex items-center justify-center gap-2">
          <Camera className="w-4 h-4" />명함 인식하기
        </button>
      )}

      {/* 스캔 중 */}
      {step === 'scanning' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-8 h-8 animate-spin text-dk-blue" />
          <p className="text-sm text-dk-muted">AI가 명함을 인식하고 있습니다...</p>
        </div>
      )}

      {/* 리뷰 단계 */}
      {step === 'review' && (
        <>
          {/* 중복 경고 */}
          {duplicates.length > 0 && (
            <div className="p-3 bg-dk-orange/10 border border-dk-orange/30 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-dk-orange">중복 가능성이 있는 고객</p>
              {duplicates.map(d => (
                <div key={d.id} className="flex items-center gap-2 text-xs text-dk-text">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-dk-dim">·</span>
                  <span className="text-dk-muted">{d.company?.name ?? '—'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${d.match_type === 'hard' ? 'bg-red-500/15 text-dk-red' : 'bg-dk-orange/15 text-dk-orange'}`}>
                    {d.match_type === 'hard' ? '동일 연락처' : '유사 이름'}
                  </span>
                  <a href={`/app/contacts/${d.id}`} className="ml-auto text-dk-blue hover:underline shrink-0">보기</a>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-dk-text">인식 결과 확인 · 수정</h2>
            <div className="space-y-3 p-4 bg-dk-surface border border-dk-border rounded-xl">
              <p className="text-xs font-semibold text-dk-dim uppercase tracking-wider">회사 정보</p>
              {field('company_name', '회사명')}
              {field('address', '주소')}
              {field('website', '홈페이지')}
              {field('phone', '대표 전화')}
            </div>
            <div className="space-y-3 p-4 bg-dk-surface border border-dk-border rounded-xl">
              <p className="text-xs font-semibold text-dk-dim uppercase tracking-wider">담당자 정보</p>
              {field('contact_name', '이름')}
              {field('department', '부서')}
              {field('title', '직책')}
              {field('mobile', '휴대폰')}
              {field('email', '이메일')}
              {field('biz_no', '사업자번호')}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setStep('upload'); setErrMsg('') }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-dk-surface border border-dk-border rounded-xl text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors">
              <RotateCcw className="w-4 h-4" />다시 촬영
            </button>
            <button onClick={saveContact}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm bg-dk-accent text-white rounded-xl font-medium hover:bg-dk-accentHover transition-colors">
              <Save className="w-4 h-4" />고객 저장
            </button>
          </div>
        </>
      )}

      {/* 저장 중 */}
      {step === 'saving' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-8 h-8 animate-spin text-dk-blue" />
          <p className="text-sm text-dk-muted">저장 중...</p>
        </div>
      )}
    </div>
  )
}
