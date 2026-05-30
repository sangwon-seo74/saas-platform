'use client'

import { useState, useEffect } from 'react'

const KAKAO_MAPS_KEY = process.env.NEXT_PUBLIC_KAKAO_MAPS_KEY

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (cb: () => void) => void
        Map: new (el: HTMLElement, opts: { center: unknown; level: number }) => unknown
        Marker: new (opts: { map: unknown; position: unknown; draggable?: boolean }) => {
          getPosition: () => { getLat: () => number; getLng: () => number }
        }
        event: { addListener: (target: unknown, type: string, handler: () => void) => void }
        LatLng: new (lat: number, lng: number) => unknown
        services: {
          Geocoder: new () => {
            addressSearch: (
              addr: string,
              cb: (result: Array<{ x: string; y: string }>, status: string) => void
            ) => void
          }
          Status: { OK: string }
        }
      }
    }
  }
}

/**
 * Kakao Maps JavaScript SDK 로딩 훅.
 * autoload=false 패턴으로 scripts + services 라이브러리까지 완전 초기화 후 loaded=true.
 * 스크립트가 이미 삽입돼 있으면 load() 콜백만 대기 (중복 삽입 방지).
 */
export function useKakaoMaps(): { loaded: boolean; error: boolean } {
  const [loaded, setLoaded] = useState(false)
  const [error, setError]   = useState(false)

  useEffect(() => {
    if (!KAKAO_MAPS_KEY) { setError(true); return }
    if (window.kakao?.maps?.services) { setLoaded(true); return }

    const existing = document.querySelector('script[src*="dapi.kakao.com/v2/maps"]')
    if (existing) {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => setLoaded(true))
      } else {
        const timer = setInterval(() => {
          if (window.kakao?.maps) {
            clearInterval(timer)
            window.kakao.maps.load(() => setLoaded(true))
          }
        }, 100)
        const timeout = setTimeout(() => { clearInterval(timer); setError(true) }, 10000)
        return () => { clearInterval(timer); clearTimeout(timeout) }
      }
      return
    }

    const script = document.createElement('script')
    script.src   = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAPS_KEY}&libraries=services&autoload=false`
    script.async = true
    script.onload  = () => window.kakao!.maps.load(() => setLoaded(true))
    script.onerror = () => setError(true)
    document.head.appendChild(script)

    const timeout = setTimeout(() => setError(true), 10000)
    return () => clearTimeout(timeout)
  }, [])

  return { loaded, error }
}
