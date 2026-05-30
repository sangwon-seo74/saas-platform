'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, ChevronRight } from 'lucide-react'
import { useKakaoMaps } from '@/hooks/useKakaoMaps'

/**
 * 카카오 지도 컴포넌트.
 * - savedLat/savedLng 있으면 좌표 우선 표시, 없으면 address 지오코딩
 * - 마커는 항상 draggable — dragend 시 onMarkerChange 호출
 * - Section 래퍼는 포함하지 않음. 호출부에서 Section으로 감쌀 것.
 */
export function KakaoMap({
  address,
  savedLat,
  savedLng,
  onMarkerChange,
}: {
  address: string | null
  savedLat: number | null
  savedLng: number | null
  onMarkerChange: (lat: number, lng: number) => void
}) {
  const mapRef             = useRef<HTMLDivElement>(null)
  const onMarkerChangeRef  = useRef(onMarkerChange)
  const [addrError, setAddrError] = useState(false)
  const { loaded, error: scriptError } = useKakaoMaps()

  useEffect(() => { onMarkerChangeRef.current = onMarkerChange }, [onMarkerChange])

  useEffect(() => {
    if (!loaded || !mapRef.current) return
    const el = mapRef.current
    el.innerHTML = ''

    const initMap = (lat: number, lng: number) => {
      const coords = new window.kakao!.maps.LatLng(lat, lng)
      const map    = new window.kakao!.maps.Map(el, { center: coords, level: 3 })
      const marker = new window.kakao!.maps.Marker({ map, position: coords, draggable: true })
      window.kakao!.maps.event.addListener(marker, 'dragend', () => {
        const pos = marker.getPosition()
        onMarkerChangeRef.current(pos.getLat(), pos.getLng())
      })
    }

    if (savedLat !== null && savedLng !== null) {
      initMap(savedLat, savedLng)
    } else if (address?.trim()) {
      const geocoder = new window.kakao!.maps.services.Geocoder()
      geocoder.addressSearch(address.trim(), (result, status) => {
        if (status !== window.kakao!.maps.services.Status.OK || !el) {
          setAddrError(true)
          return
        }
        initMap(parseFloat(result[0].y), parseFloat(result[0].x))
      })
    } else {
      setAddrError(true)
    }
  }, [loaded, address, savedLat, savedLng])

  const kakaoSearchUrl = address
    ? `https://map.kakao.com/link/search/${encodeURIComponent(address)}`
    : 'https://map.kakao.com'

  if (scriptError || addrError) return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 px-1">
        <MapPin className="w-4 h-4 text-dk-muted shrink-0 mt-0.5" />
        <span className="text-sm text-dk-text leading-relaxed">{address}</span>
      </div>
      <a href={kakaoSearchUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-dk-blue border border-tint-blue-border rounded-lg hover:bg-tint-blue transition-colors">
        카카오맵에서 보기
        <ChevronRight className="w-4 h-4" />
      </a>
    </div>
  )

  if (!loaded) return (
    <div className="flex items-center justify-center h-[325px] text-sm text-dk-dim gap-1.5">
      <Loader2 className="w-4 h-4 animate-spin" />
      지도 불러오는 중...
    </div>
  )

  return <div ref={mapRef} className="w-full h-[325px] rounded-lg overflow-hidden" />
}
