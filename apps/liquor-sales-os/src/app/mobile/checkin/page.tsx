'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Navigation, Search, CheckCircle, Loader2, AlertCircle, Building2, Plus, Trash2 } from 'lucide-react'
import { cn, CLIENT_TYPE_LABEL, VISIT_TYPE_LABEL, calcDistance, formatDistance } from '@/lib/utils'
import type { Client, VisitType, ApiResponse } from '@/types/domain'

type Step = 'locate' | 'select_client' | 'form' | 'done'

interface NearbyClient extends Client {
  distance?: number
}

interface OrderItem {
  product_name: string
  quantity: number
  memo: string
}

export default function CheckinPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('locate')
  const [lat, setLat]   = useState<number | null>(null)
  const [lng, setLng]   = useState<number | null>(null)
  const [gpsError, setGpsError]     = useState('')
  const [locating,  setLocating]    = useState(false)
  const [clients,   setClients]     = useState<NearbyClient[]>([])
  const [searchQ,   setSearchQ]     = useState('')
  const [selected,  setSelected]    = useState<NearbyClient | null>(null)
  const [visitType, setVisitType]   = useState<VisitType>('sales')
  const [purpose,   setPurpose]     = useState('')
  const [result,    setResult]      = useState('')
  const [items,     setItems]       = useState<OrderItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [visitId,   setVisitId]     = useState<string | null>(null)

  const getLocation = useCallback(() => {
    setLocating(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setLocating(false)
        setStep('select_client')
      },
      err => {
        setGpsError(`GPS 오류: ${err.message}`)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  useEffect(() => {
    if (step !== 'select_client' || lat === null || lng === null) return
    fetch(`/api/clients/nearby?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then((res: ApiResponse<Client[]>) => {
        if (res.data) {
          const withDist = res.data.map(c => ({
            ...c,
            distance: c.lat && c.lng ? calcDistance(lat, lng, c.lat, c.lng) : undefined,
          })).sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999))
          setClients(withDist)
        }
      })
      .catch(() => {})
  }, [step, lat, lng])

  const filteredClients = clients.filter(c =>
    !searchQ || c.name.includes(searchQ) || (c.address ?? '').includes(searchQ)
  )

  const addItem = () => setItems(prev => [...prev, { product_name: '', quantity: 1, memo: '' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateItem = <K extends keyof OrderItem>(i: number, key: K, val: OrderItem[K]) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item))

  const handleSubmit = async () => {
    if (!selected || lat === null || lng === null) return
    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selected.id,
          visit_type: visitType,
          purpose,
          lat,
          lng,
          items: items.filter(i => i.product_name.trim()),
        }),
      })
      const json = await res.json() as ApiResponse<{ id: string }>
      if (json.error) throw new Error(json.error.message)
      if (!json.data) throw new Error('응답 오류')
      setVisitId(json.data.id)
      setStep('done')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'locate') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-tint-orange flex items-center justify-center mb-6">
          <Navigation className="w-10 h-10 text-dk-orange" />
        </div>
        <h1 className="text-xl font-bold text-dk-text mb-2">방문 체크인</h1>
        <p className="text-sm text-dk-muted mb-8">현재 위치를 확인한 후 거래처를 선택하세요</p>
        {gpsError && (
          <div className="w-full max-w-sm mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-300">{gpsError}</p>
          </div>
        )}
        <button
          onClick={getLocation}
          disabled={locating}
          className="w-full max-w-sm py-4 bg-dk-accent hover:bg-dk-accentHover text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-orange-900/30"
        >
          {locating ? <><Loader2 className="w-5 h-5 animate-spin" />위치 확인 중...</> : <><MapPin className="w-5 h-5" />위치 확인</>}
        </button>
      </div>
    )
  }

  if (step === 'select_client') {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="px-4 py-4 border-b border-dk-border bg-dk-surface shrink-0">
          <h1 className="text-base font-bold text-dk-text mb-1">거래처 선택</h1>
          <p className="text-xs text-dk-muted">
            {lat && lng ? `현재 위치 기준 ${filteredClients.length}개` : ''}
          </p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dk-dim" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="업체명 검색..."
              className="w-full pl-9 pr-3 py-2.5 bg-dk-surface2 border border-dk-border rounded-xl text-sm text-dk-text placeholder-dk-dim focus:outline-none focus:border-dk-border2"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-dk-dim text-sm gap-2">
              <Building2 className="w-6 h-6" />
              {searchQ ? `"${searchQ}" 검색 결과 없음` : '거래처 없음'}
            </div>
          ) : (
            <div className="divide-y divide-dk-border">
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => { setSelected(client); setStep('form') }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-dk-surface2 transition-colors text-left active:bg-dk-surface2"
                >
                  <div className="w-10 h-10 rounded-xl bg-dk-surface2 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-dk-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dk-text truncate">{client.name}</p>
                    <p className="text-xs text-dk-dim truncate mt-0.5">
                      {CLIENT_TYPE_LABEL[client.client_type]} · {client.address ?? '주소 없음'}
                    </p>
                  </div>
                  {client.distance !== undefined && (
                    <p className={cn(
                      'text-xs font-medium shrink-0',
                      client.distance < 200 ? 'text-dk-green' : client.distance < 1000 ? 'text-dk-orange' : 'text-dk-muted'
                    )}>
                      {formatDistance(client.distance)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 'form' && selected) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="px-4 py-4 border-b border-dk-border bg-dk-surface shrink-0">
          <button onClick={() => setStep('select_client')} className="text-xs text-dk-blue mb-2">← 다시 선택</button>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-dk-orange shrink-0" />
            <p className="text-base font-bold text-dk-text truncate">{selected.name}</p>
          </div>
          <p className="text-xs text-dk-muted mt-0.5 truncate">{selected.address ?? '—'}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-dk-muted block mb-2">방문 유형</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(VISIT_TYPE_LABEL) as [VisitType, string][]).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setVisitType(k)}
                  className={cn(
                    'py-2.5 rounded-xl text-sm font-medium border transition-colors',
                    visitType === k
                      ? 'bg-dk-accent border-dk-accent text-white'
                      : 'bg-dk-surface border-dk-border text-dk-muted hover:border-dk-border2'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-dk-muted block mb-1.5">방문 목적</label>
            <textarea
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              rows={2}
              placeholder="방문 목적을 간략히 입력하세요..."
              className="w-full px-3 py-2.5 bg-dk-surface border border-dk-border rounded-xl text-sm text-dk-text placeholder-dk-dim focus:outline-none focus:border-dk-border2 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-dk-muted block mb-1.5">상담 결과</label>
            <textarea
              value={result}
              onChange={e => setResult(e.target.value)}
              rows={3}
              placeholder="상담 결과, 특이사항 등을 입력하세요..."
              className="w-full px-3 py-2.5 bg-dk-surface border border-dk-border rounded-xl text-sm text-dk-text placeholder-dk-dim focus:outline-none focus:border-dk-border2 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-dk-muted">주문 내역</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-dk-blue flex items-center gap-1 hover:text-dk-blueHover"
              >
                <Plus className="w-3.5 h-3.5" />추가
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    value={item.product_name}
                    onChange={e => updateItem(i, 'product_name', e.target.value)}
                    placeholder="제품명"
                    className="flex-1 px-3 py-2 bg-dk-surface border border-dk-border rounded-lg text-sm text-dk-text placeholder-dk-dim focus:outline-none focus:border-dk-border2"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-16 px-2 py-2 bg-dk-surface border border-dk-border rounded-lg text-sm text-dk-text text-center focus:outline-none focus:border-dk-border2"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="p-2 text-dk-dim hover:text-dk-red transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-xs text-dk-dim">주문 내역이 없습니다. 추가 버튼을 눌러 입력하세요.</p>
              )}
            </div>
          </div>

          {submitError && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">{submitError}</p>
            </div>
          )}
        </div>

        <div className="px-4 py-4 border-t border-dk-border bg-dk-surface shrink-0">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 bg-dk-accent hover:bg-dk-accentHover text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-orange-900/30"
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" />저장 중...</>
            ) : (
              <><CheckCircle className="w-5 h-5" />체크인 완료</>
            )}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-tint-green flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-dk-green" />
        </div>
        <h1 className="text-xl font-bold text-dk-text mb-2">체크인 완료!</h1>
        <p className="text-sm text-dk-muted mb-2">{selected?.name}</p>
        <p className="text-xs text-dk-dim mb-8">방문 기록이 저장되었습니다.</p>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {visitId && (
            <button
              onClick={() => router.push(`/app/visits/${visitId}`)}
              className="py-3 border border-dk-border text-dk-text text-sm font-medium rounded-xl hover:bg-dk-surface2 transition-colors"
            >
              방문 기록 보기
            </button>
          )}
          <button
            onClick={() => {
              setStep('locate')
              setSelected(null)
              setPurpose('')
              setResult('')
              setItems([])
              setVisitId(null)
            }}
            className="py-3 bg-dk-accent text-white text-sm font-bold rounded-xl hover:bg-dk-accentHover transition-colors"
          >
            다음 체크인
          </button>
        </div>
      </div>
    )
  }

  return null
}
