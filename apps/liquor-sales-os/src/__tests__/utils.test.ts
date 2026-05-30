import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calcDistance, formatDistance, formatNoVisitDays, formatRelative,
  CLIENT_TYPE_LABEL, VISIT_STATUS_LABEL, VISIT_TYPE_LABEL,
} from '@/lib/utils'

// ─── calcDistance (Haversine) ─────────────────────────────────
describe('calcDistance', () => {
  it('같은 좌표 → 0m', () => {
    expect(calcDistance(37.5, 127.0, 37.5, 127.0)).toBeCloseTo(0, 0)
  })

  it('서울 시청 ↔ 강남역 ≈ 8~10km', () => {
    // 서울 시청: 37.5665, 126.9780 / 강남역: 37.4979, 127.0276
    const dist = calcDistance(37.5665, 126.9780, 37.4979, 127.0276)
    expect(dist).toBeGreaterThan(7_000)
    expect(dist).toBeLessThan(11_000)
  })

  it('인접 좌표 → 수십 미터', () => {
    const dist = calcDistance(37.5000, 127.0000, 37.5001, 127.0001)
    expect(dist).toBeGreaterThan(0)
    expect(dist).toBeLessThan(200)
  })

  it('대칭성: A→B 와 B→A 거리 동일', () => {
    const d1 = calcDistance(37.5, 127.0, 37.6, 127.1)
    const d2 = calcDistance(37.6, 127.1, 37.5, 127.0)
    expect(d1).toBeCloseTo(d2, 1)
  })
})

// ─── formatDistance ───────────────────────────────────────────
describe('formatDistance', () => {
  it('1000m 미만 → Xm', () => {
    expect(formatDistance(0)).toBe('0m')
    expect(formatDistance(150)).toBe('150m')
    expect(formatDistance(999)).toBe('999m')
  })

  it('1000m 이상 → X.Xkm', () => {
    expect(formatDistance(1000)).toBe('1.0km')
    expect(formatDistance(1500)).toBe('1.5km')
    expect(formatDistance(10000)).toBe('10.0km')
  })
})

// ─── formatNoVisitDays ────────────────────────────────────────
describe('formatNoVisitDays', () => {
  const BASE = new Date('2024-06-01T12:00:00Z').getTime()
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(BASE) })
  afterEach(() => { vi.useRealTimers() })

  it('null/undefined → 방문 이력 없음', () => {
    expect(formatNoVisitDays(null)).toBe('방문 이력 없음')
    expect(formatNoVisitDays(undefined)).toBe('방문 이력 없음')
  })

  it('오늘 → 오늘', () => {
    expect(formatNoVisitDays(new Date(BASE - 1000).toISOString())).toBe('오늘')
  })

  it('1일 전 → 어제', () => {
    expect(formatNoVisitDays(new Date(BASE - 24 * 60 * 60_000).toISOString())).toBe('어제')
  })

  it('3일 전 → 3일 전', () => {
    expect(formatNoVisitDays(new Date(BASE - 3 * 24 * 60 * 60_000).toISOString())).toBe('3일 전')
  })
})

// ─── formatRelative ───────────────────────────────────────────
describe('formatRelative', () => {
  const BASE = new Date('2024-06-01T12:00:00Z').getTime()
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(BASE) })
  afterEach(() => { vi.useRealTimers() })

  it('null → —', () => { expect(formatRelative(null)).toBe('—') })

  it('방금 전', () => {
    expect(formatRelative(new Date(BASE - 30_000).toISOString())).toBe('방금 전')
  })

  it('45분 전', () => {
    expect(formatRelative(new Date(BASE - 45 * 60_000).toISOString())).toBe('45분 전')
  })

  it('5시간 전', () => {
    expect(formatRelative(new Date(BASE - 5 * 60 * 60_000).toISOString())).toBe('5시간 전')
  })

  it('4일 전', () => {
    expect(formatRelative(new Date(BASE - 4 * 24 * 60 * 60_000).toISOString())).toBe('4일 전')
  })
})

// ─── 상수 레이블 ──────────────────────────────────────────────
describe('Label constants', () => {
  it('CLIENT_TYPE_LABEL — 모든 타입 정의', () => {
    expect(CLIENT_TYPE_LABEL.restaurant).toBe('음식점')
    expect(CLIENT_TYPE_LABEL.bar).toBe('주점')
    expect(CLIENT_TYPE_LABEL.wholesale).toBe('도매')
    expect(CLIENT_TYPE_LABEL.retail).toBe('소매')
    expect(CLIENT_TYPE_LABEL.other).toBe('기타')
  })

  it('VISIT_STATUS_LABEL — 4가지 상태 정의', () => {
    expect(VISIT_STATUS_LABEL.planned).toBeDefined()
    expect(VISIT_STATUS_LABEL.checked_in).toBeDefined()
    expect(VISIT_STATUS_LABEL.completed).toBeDefined()
    expect(VISIT_STATUS_LABEL.cancelled).toBeDefined()
  })

  it('VISIT_TYPE_LABEL — 4가지 유형 정의', () => {
    expect(VISIT_TYPE_LABEL.sales).toBe('영업')
    expect(VISIT_TYPE_LABEL.delivery).toBe('배송')
    expect(VISIT_TYPE_LABEL.collection).toBe('수금')
    expect(VISIT_TYPE_LABEL.other).toBe('기타')
  })
})
