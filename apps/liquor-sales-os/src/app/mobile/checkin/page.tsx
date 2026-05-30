'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Navigation, Search, CheckCircle, Loader2, AlertCircle,
  Building2, Plus, Trash2, Calendar, ChevronRight,
} from 'lucide-react'
import { cn, CLIENT_TYPE_LABEL, VISIT_TYPE_LABEL, calcDistance, formatDistance } from '@/lib/utils'
import type { Client, Visit, VisitType, ApiResponse } from '@/types/domain'

type Step = 'locate' | 'select_client' | 'planned_form' | 'form' | 'done'

interface NearbyClient extends Client {
  distance?: number
}

interface PlannedVisit {
  id: string
  visit_type: VisitType
  purpose: string | null
  check_in_at: string | null
  client: { id: string; name: string; address: string | null; client_type: string } | null
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

  // GPS
  const [gpsError,  setGpsError]  = useState('')
  const [locating,  setLocating]  = useState(false)

  // 거래처 / 예약 목록
  const [clients,       setClients]       = useState<NearbyClient[]>([])
  const [plannedVisits, setPlannedVisits] = useState<PlannedVisit[]>([])
  const [searchQ,       setSearchQ]       = useState('')
  const [loadingList,   setLoadingList]   = useState(false)

  // 신규 체크인
  const [selected,   setSelected]   = useState<NearbyClient | null>(null)
  const [visitType,  setVisitType]  = useState<VisitType>('sales')
  const [purpose,    setPurpose]    = useState('')
  const [result,     setResult]     = useState('')
  const [items,      setItems]      = useState<OrderItem[]>([])

  // 예약 체크인
  const [selectedPlanned, setSelectedPlanned] = useState<PlannedVisit | null>(null)
  const [plannedResult,   setPlannedResult]   = useState('')
  const [plannedItems,    setPlannedItems]    = useState<OrderItem[]>([])

  // 공통
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [visitId,     setVisitId]     = useState<string | null>(null)
  const [doneName,    setDoneName]    = useState('')

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

  // 거래처 + 예약 방문 동시 로드
  useEffect(() => {
    if (step !== 'select_client' || lat === null || lng === null) return
    setLoadingList(true)

    Promise.all([
      fetch(`/api/clients/nearby?lat=${lat}&lng=${lng}`).then(r => r.json() as Promise<ApiResponse<Client[]>>),
      fetch('/api/visits?status=planned&limit=20').then(r => r.json() as Promise<ApiResponse<Visit[]>>),
    ]).then(([clientsRes, visitsRes]) => {
      if (clientsRes.data) {
        const withDist = clientsRes.data.map(c => ({
          ...c,
          distance: c.lat && c.lng ? calcDistance(lat, lng, c.lat, c.lng) : undefined,
        })).sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999))
        setClients(withDist)
      }
      if (visitsRes.data) {
        setPlannedVisits(visitsRes.data as unknown as PlannedVisit[])
      }
    }).catch(() => {}).finally(() => setLoadingList(false))
  }, [step, lat, lng])

  // 신규 체크인 아이템 조작
  const addItem    = () => setItems(prev => [...prev, { product_name: '', quantity: 1, memo: '' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateItem = <K extends keyof OrderItem>(i: number, key: K, val: OrderItem[K]) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item))

  // 예약 체크인 아이템 조작
  const addPlannedItem    = () => setPlannedItems(prev => [...prev, { product_name: '', quantity: 1, memo: '' }])
  const removePlannedItem = (i: number) => setPlannedItems(prev => prev.filter((_, idx) => idx !== i))
  const updatePlannedItem = <K extends keyof OrderItem>(i: number, key: K, val: OrderItem[K]) =>
    setPlannedItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item))

  // 신규 체크인 제출
  const handleNewCheckin = async () => {
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
          result,
          lat,
          lng,
          items: items.filter(i => i.product_name.trim()),
        }),
      })
      const json = await res.json() as ApiResponse<{ id: string }>
      if (json.error) throw new Error(json.error.message)
      if (!json.data) throw new Error('응답 오류')
      setVisitId(json.data.id)
      setDoneName(selected.name)
      setStep('done')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  // 예약 방문 → 체크인 전환 제출
  const handlePlannedCheckin = async () => {
    if (!selectedPlanned || lat === null || lng === null) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`/api/visits/${selectedPlanned.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status:      'checked_in',
          check_in_at: new Date().toISOString(),
          lat,
          lng,
          result:      plannedResult || undefined,
          items:       plannedItems.filter(i => i.product_name.trim()),
        }),
      })
      const json = await res.json() as ApiResponse<{ id: string }>
      if (json.error) throw new Error(json.error.message)
      setVisitId(selectedPlanned.id)
      setDoneName(selectedPlanned.client?.name ?? '')
      setStep('done')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredClients = clients.filter(c =>
    !searchQ || c.name.includes(searchQ) || (c.address ?? '').includes(searchQ)
  )
  const filteredPlanned = plannedVisits.filter(v =>
    !searchQ || (v.client?.name ?? '').includes(searchQ)
  )

  /* ── 1단계: GPS 위치 확인 ── */
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
          {locating
            ? <><Loader2 className="w-5 h-5 animate-spin" />위치 확인 중...</>
            : <><MapPin className="w-5 h-5" />위치 확인</>}
        </button>
      </div>
    )
  }

  /* ── 2단계: 거래처 선택 (예약 방문 + 신규) ── */
  if (step === 'select_client') {
    const hasPlanned = filteredPlanned.length > 0

    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="px-4 py-4 border-b border-dk-border bg-dk-surface shrink-0">
          <h1 className="text-base font-bold text-dk-text mb-1">거래처 선택</h1>
          <div className="relative mt-2">
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
          {loadingList ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-dk-muted" />
            </div>
          ) : (
            <>
              {/* 예약된 방문 섹션 */}
              {hasPlanned && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-dk-surface2 border-b border-dk-border sticky top-0">
                    <Calendar className="w-3.5 h-3.5 text-dk-orange" />
                    <span className="text-xs font-semibold text-dk-orange">예약된 방문</span>
                    <span className="text-xs text-dk-dim ml-auto">{filteredPlanned.length}건</span>
                  </div>
                  <div className="divide-y divide-dk-border">
                    {filteredPlanned.map(visit => (
                      <button
                        key={visit.id}
                        onClick={() => { setSelectedPlanned(visit); setStep('planned_form') }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-dk-surface2 transition-colors text-left active:bg-dk-surface2"
                      >
                        <div className="w-10 h-10 rounded-xl bg-tint-orange flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-dk-orange" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-dk-text truncate">
                            {visit.client?.name ?? '—'}
                          </p>
                          <p className="text-xs text-dk-dim truncate mt-0.5">
                            {VISIT_TYPE_LABEL[visit.visit_type]} · {visit.client?.address ?? '주소 없음'}
                          </p>
                          {visit.purpose && (
                            <p className="text-xs text-dk-muted truncate mt-0.5">{visit.purpose}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-dk-dim shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 신규 체크인 섹션 */}
              {hasPlanned && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-dk-surface2 border-b border-dk-border sticky top-0">
                  <Building2 className="w-3.5 h-3.5 text-dk-blue" />
                  <span className="text-xs font-semibold text-dk-blue">신규 체크인</span>
                  <span className="text-xs text-dk-dim ml-auto">주변 {filteredClients.length}개</span>
                </div>
              )}
              <div className="divide-y divide-dk-border">
                {filteredClients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-dk-dim text-sm gap-2">
                    <Building2 className="w-6 h-6" />
                    {searchQ ? `"${searchQ}" 검색 결과 없음` : '거래처 없음'}
                  </div>
                ) : (
                  filteredClients.map(client => (
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
                          client.distance < 200  ? 'text-dk-green' :
                          client.distance < 1000 ? 'text-dk-orange' : 'text-dk-muted'
                        )}>
                          {formatDistance(client.distance)}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  /* ── 3단계A: 예약 방문 체크인 폼 ── */
  if (step === 'planned_form' && selectedPlanned) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="px-4 py-4 border-b border-dk-border bg-dk-surface shrink-0">
          <button onClick={() => setStep('select_client')} className="text-xs text-dk-blue mb-2">← 다시 선택</button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-dk-orange shrink-0" />
            <p className="text-base font-bold text-dk-text truncate">{selectedPlanned.client?.name ?? '—'}</p>
          </div>
          <p className="text-xs text-dk-muted mt-0.5">
            {VISIT_TYPE_LABEL[selectedPlanned.visit_type]} · 예약 방문 체크인
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* 방문 목적 (읽기 전용) */}
          {selectedPlanned.purpose && (
            <div className="px-3 py-2.5 bg-dk-surface2 rounded-xl border border-dk-border">
              <p className="text-[10px] text-dk-muted mb-1 uppercase tracking-wide">지시사항</p>
              <p className="text-sm text-dk-text whitespace-pre-wrap">{selectedPlanned.purpose}</p>
            </div>
          )}

          {/* 현재 위치 확인 */}
          <div className="flex items-center gap-2 text-xs text-dk-green">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="font-tabular">
              GPS {lat?.toFixed(5)}, {lng?.toFixed(5)}
            </span>
          </div>

          {/* 상담 결과 */}
          <div>
            <label className="text-xs font-medium text-dk-muted block mb-1.5">상담 결과</label>
            <textarea
              value={plannedResult}
              onChange={e => setPlannedResult(e.target.value)}
              rows={3}
              placeholder="상담 결과, 특이사항 등을 입력하세요..."
              className="w-full px-3 py-2.5 bg-dk-surface border border-dk-border rounded-xl text-sm text-dk-text placeholder-dk-dim focus:outline-none focus:border-dk-border2 resize-none"
            />
          </div>

          {/* 주문 내역 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-dk-muted">주문 내역</label>
              <button
                type="button"
                onClick={addPlannedItem}
                className="text-xs text-dk-blue flex items-center gap-1 hover:text-dk-blueHover"
              >
                <Plus className="w-3.5 h-3.5" />추가
              </button>
            </div>
            <div className="space-y-2">
              {plannedItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    value={item.product_name}
                    onChange={e => updatePlannedItem(i, 'product_name', e.target.value)}
                    placeholder="제품명"
                    className="flex-1 px-3 py-2 bg-dk-surface border border-dk-border rounded-lg text-sm text-dk-text placeholder-dk-dim focus:outline-none focus:border-dk-border2"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updatePlannedItem(i, 'quantity', parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-16 px-2 py-2 bg-dk-surface border border-dk-border rounded-lg text-sm text-dk-text text-center focus:outline-none focus:border-dk-border2"
                  />
                  <button type="button" onClick={() => removePlannedItem(i)} className="p-2 text-dk-dim hover:text-dk-red transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {plannedItems.length === 0 && (
                <p className="text-xs text-dk-dim">주문 내역이 없으면 그대로 체크인하세요.</p>
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
            onClick={handlePlannedCheckin}
            disabled={submitting}
            className="w-full py-4 bg-dk-accent hover:bg-dk-accentHover text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-orange-900/30"
          >
            {submitting
              ? <><Loader2 className="w-5 h-5 animate-spin" />저장 중...</>
              : <><CheckCircle className="w-5 h-5" />체크인 완료</>}
          </button>
        </div>
      </div>
    )
  }

  /* ── 3단계B: 신규 체크인 폼 ── */
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
              <button type="button" onClick={addItem} className="text-xs text-dk-blue flex items-center gap-1 hover:text-dk-blueHover">
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
                  <button type="button" onClick={() => removeItem(i)} className="p-2 text-dk-dim hover:text-dk-red transition-colors">
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
            onClick={handleNewCheckin}
            disabled={submitting}
            className="w-full py-4 bg-dk-accent hover:bg-dk-accentHover text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-orange-900/30"
          >
            {submitting
              ? <><Loader2 className="w-5 h-5 animate-spin" />저장 중...</>
              : <><CheckCircle className="w-5 h-5" />체크인 완료</>}
          </button>
        </div>
      </div>
    )
  }

  /* ── 4단계: 완료 ── */
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-tint-green flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-dk-green" />
        </div>
        <h1 className="text-xl font-bold text-dk-text mb-2">체크인 완료!</h1>
        <p className="text-sm text-dk-muted mb-2">{doneName}</p>
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
              setSelectedPlanned(null)
              setPurpose('')
              setResult('')
              setItems([])
              setPlannedResult('')
              setPlannedItems([])
              setVisitId(null)
              setDoneName('')
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
