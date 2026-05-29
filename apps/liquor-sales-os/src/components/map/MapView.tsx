'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Building2, Navigation } from 'lucide-react'
import { CLIENT_TYPE_LABEL, formatRelative, cn } from '@/lib/utils'
import type { Client, RepLocation } from '@/types/domain'

interface Props {
  clients: Client[]
  repLocations: RepLocation[]
  todayVisitedClientIds: Set<string>
}

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void
        Map: new (container: HTMLElement, opts: object) => KakaoMap
        LatLng: new (lat: number, lng: number) => KakaoLatLng
        Marker: new (opts: object) => KakaoMarker
        InfoWindow: new (opts: object) => KakaoInfoWindow
        MarkerImage: new (src: string, size: object, opts?: object) => KakaoMarkerImage
        Size: new (w: number, h: number) => object
        Point: new (x: number, y: number) => object
        event: { addListener: (target: object, event: string, handler: () => void) => void }
      }
    }
  }
}

type KakaoMap = { setCenter: (latlng: KakaoLatLng) => void; getLevel: () => number }
type KakaoLatLng = object
type KakaoMarker = { setMap: (map: KakaoMap | null) => void }
type KakaoInfoWindow = { open: (map: KakaoMap, marker: KakaoMarker) => void; close: () => void }
type KakaoMarkerImage = object

interface SelectedItem {
  type: 'client' | 'rep'
  id: string
  name: string
  info: string
  lat: number
  lng: number
}

export default function MapView({ clients, repLocations, todayVisitedClientIds }: Props) {
  const mapRef    = useRef<HTMLDivElement>(null)
  const kakaoLoaded = useRef(false)
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY

  useEffect(() => {
    if (!kakaoKey || kakaoLoaded.current || !mapRef.current) return

    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false`
    script.onload = () => {
      window.kakao.maps.load(() => {
        kakaoLoaded.current = true
        setMapReady(true)
      })
    }
    document.head.appendChild(script)
  }, [kakaoKey])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.kakao?.maps) return

    const K = window.kakao.maps
    const center = clients[0]
      ? new K.LatLng(clients[0].lat!, clients[0].lng!)
      : new K.LatLng(37.5665, 126.9780) // 서울 기본

    const map = new K.Map(mapRef.current, {
      center,
      level: 8,
    }) as KakaoMap

    // 거래처 마커
    clients.forEach(client => {
      if (!client.lat || !client.lng) return
      const isVisited = todayVisitedClientIds.has(client.id)
      const marker = new K.Marker({
        position: new K.LatLng(client.lat, client.lng),
        map,
        title: client.name,
      })
      K.event.addListener(marker, 'click', () => {
        setSelected({
          type: 'client',
          id: client.id,
          name: client.name,
          info: `${CLIENT_TYPE_LABEL[client.client_type] ?? client.client_type} · ${isVisited ? '오늘 방문' : '미방문'}`,
          lat: client.lat!,
          lng: client.lng!,
        })
      })
    })

    // 담당자 마커
    repLocations.forEach(loc => {
      const marker = new K.Marker({
        position: new K.LatLng(loc.lat, loc.lng),
        map,
        title: (loc.rep as unknown as { name: string } | null)?.name ?? '담당자',
      })
      K.event.addListener(marker, 'click', () => {
        setSelected({
          type: 'rep',
          id: loc.rep_user_id,
          name: (loc.rep as unknown as { name: string } | null)?.name ?? '담당자',
          info: `마지막 위치 · ${formatRelative(loc.updated_at)}`,
          lat: loc.lat,
          lng: loc.lng,
        })
      })
    })
  }, [mapReady, clients, repLocations, todayVisitedClientIds])

  if (!kakaoKey) {
    return <FallbackTable clients={clients} repLocations={repLocations} todayVisitedClientIds={todayVisitedClientIds} />
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      {selected && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-72 bg-dk-surface border border-dk-border rounded-xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              selected.type === 'client' ? 'bg-tint-blue' : 'bg-tint-orange'
            )}>
              {selected.type === 'client'
                ? <Building2 className="w-4 h-4 text-dk-blue" />
                : <Navigation className="w-4 h-4 text-dk-orange" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dk-text">{selected.name}</p>
              <p className="text-xs text-dk-muted mt-0.5">{selected.info}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-dk-dim hover:text-dk-muted text-xs">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

function FallbackTable({ clients, repLocations, todayVisitedClientIds }: Props) {
  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="bg-tint-amber border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
        카카오맵 API 키(NEXT_PUBLIC_KAKAO_MAP_KEY)가 설정되지 않았습니다. 목록으로 표시합니다.
      </div>

      <div>
        <h3 className="text-sm font-semibold text-dk-text mb-2">담당자 위치 ({repLocations.length})</h3>
        <div className="space-y-2">
          {repLocations.map(loc => (
            <div key={loc.rep_user_id} className="flex items-center gap-3 p-3 bg-dk-surface border border-dk-border rounded-lg">
              <div className="w-7 h-7 rounded-full bg-tint-orange flex items-center justify-center text-dk-orange text-xs font-bold shrink-0">
                {(loc.rep as unknown as { name: string } | null)?.name?.[0] ?? '?'}
              </div>
              <div>
                <p className="text-sm text-dk-text">{(loc.rep as unknown as { name: string } | null)?.name ?? '—'}</p>
                <p className="text-xs text-dk-dim">{formatRelative(loc.updated_at)}</p>
              </div>
              <div className="ml-auto text-xs text-dk-dim font-tabular">
                {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
              </div>
            </div>
          ))}
          {repLocations.length === 0 && <p className="text-sm text-dk-dim">위치 정보 없음</p>}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-dk-text mb-2">거래처 ({clients.length})</h3>
        <div className="space-y-2">
          {clients.slice(0, 20).map(client => (
            <div key={client.id} className="flex items-center gap-3 p-3 bg-dk-surface border border-dk-border rounded-lg">
              <div className={cn(
                'w-2 h-2 rounded-full shrink-0',
                todayVisitedClientIds.has(client.id) ? 'bg-dk-green' : 'bg-dk-border2'
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-dk-text truncate">{client.name}</p>
                <p className="text-xs text-dk-dim truncate">{client.address ?? '—'}</p>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <MapPin className="w-3 h-3 text-dk-dim" />
                <span className="text-dk-dim font-tabular">{client.lat?.toFixed(4)}</span>
              </div>
            </div>
          ))}
          {clients.length === 0 && <p className="text-sm text-dk-dim">거래처 없음</p>}
        </div>
      </div>
    </div>
  )
}
