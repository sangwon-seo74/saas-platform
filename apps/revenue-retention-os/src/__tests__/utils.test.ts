import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calcDday, formatDday, getDdayClass, getRenewalBucket,
  formatAmount, formatAmountShort, formatDuration,
  formatRelative,
} from '@/lib/utils'

// ─── calcDday ─────────────────────────────────────────────────
describe('calcDday', () => {
  const TODAY = '2024-06-01T10:00:00Z'
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(TODAY)) })
  afterEach(() => { vi.useRealTimers() })

  it('오늘 만료 → 0', () => {
    expect(calcDday('2024-06-01')).toBe(0)
  })

  it('내일 만료 → 1', () => {
    expect(calcDday('2024-06-02')).toBe(1)
  })

  it('어제 만료 → -1 (이미 만료)', () => {
    expect(calcDday('2024-05-31')).toBe(-1)
  })

  it('30일 후 만료 → 30', () => {
    expect(calcDday('2024-07-01')).toBe(30)
  })
})

// ─── formatDday ───────────────────────────────────────────────
describe('formatDday', () => {
  it('양수 → D-N', () => {
    expect(formatDday(30)).toBe('D-30')
    expect(formatDday(1)).toBe('D-1')
  })

  it('0 → D-Day', () => {
    expect(formatDday(0)).toBe('D-Day')
  })

  it('음수 → D+N', () => {
    expect(formatDday(-1)).toBe('D+1')
    expect(formatDday(-15)).toBe('D+15')
  })
})

// ─── getDdayClass ─────────────────────────────────────────────
describe('getDdayClass', () => {
  it('만료 전 충분한 기간 → muted', () => {
    expect(getDdayClass(90)).toBe('text-dk-muted')
    expect(getDdayClass(31)).toBe('text-dk-muted')
  })

  it('14~30일 이내 → orange', () => {
    expect(getDdayClass(30)).toBe('text-dk-orange')
    expect(getDdayClass(15)).toBe('text-dk-orange')
    expect(getDdayClass(14)).toBe('text-dk-orange')
  })

  it('7일 이내 → red', () => {
    expect(getDdayClass(7)).toBe('text-dk-red')
    expect(getDdayClass(0)).toBe('text-dk-red')
  })

  it('이미 만료(음수) → red', () => {
    expect(getDdayClass(-1)).toBe('text-dk-red')
    expect(getDdayClass(-30)).toBe('text-dk-red')
  })
})

// ─── getRenewalBucket ─────────────────────────────────────────
describe('getRenewalBucket', () => {
  const TODAY = '2024-06-01T00:00:00Z'
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(TODAY)) })
  afterEach(() => { vi.useRealTimers() })

  it('7일 이내 → D-7', () => {
    expect(getRenewalBucket('2024-06-07')).toBe('D-7')
    expect(getRenewalBucket('2024-06-01')).toBe('D-7')
  })

  it('8~14일 → D-14', () => {
    expect(getRenewalBucket('2024-06-14')).toBe('D-14')
  })

  it('15~30일 → D-30', () => {
    expect(getRenewalBucket('2024-06-30')).toBe('D-30')
  })

  it('31~60일 → D-60', () => {
    expect(getRenewalBucket('2024-07-31')).toBe('D-60')
  })

  it('61일 이상 → D-90', () => {
    expect(getRenewalBucket('2024-09-01')).toBe('D-90')
  })
})

// ─── formatAmount ─────────────────────────────────────────────
describe('formatAmount', () => {
  it('null/undefined → —', () => {
    expect(formatAmount(null)).toBe('—')
    expect(formatAmount(undefined)).toBe('—')
  })

  it('0 → 0원', () => {
    expect(formatAmount(0)).toBe('0원')
  })

  it('1000 → 천 단위 구분자 포함', () => {
    const result = formatAmount(1000000)
    expect(result).toMatch(/원$/)
    expect(result).toContain('1,000,000')
  })
})

// ─── formatAmountShort ────────────────────────────────────────
describe('formatAmountShort', () => {
  it('null → —', () => {
    expect(formatAmountShort(null)).toBe('—')
  })

  it('1억 이상 → 억원 단위', () => {
    expect(formatAmountShort(100_000_000)).toBe('1.0억원')
    expect(formatAmountShort(250_000_000)).toBe('2.5억원')
  })

  it('1만 이상 → 만원 단위', () => {
    expect(formatAmountShort(50_000)).toBe('5만원')
    expect(formatAmountShort(10_000)).toBe('1만원')
  })

  it('1만 미만 → 원 단위', () => {
    expect(formatAmountShort(9_999)).toBe('9,999원')
  })
})

// ─── formatDuration ───────────────────────────────────────────
describe('formatDuration', () => {
  it('null/0 → —', () => {
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(0)).toBe('—')
  })

  it('90초 → 1분 30초', () => {
    expect(formatDuration(90)).toBe('1분 30초')
  })

  it('3600초 → 60분 0초', () => {
    expect(formatDuration(3600)).toBe('60분 0초')
  })
})

// ─── formatRelative ───────────────────────────────────────────
describe('formatRelative', () => {
  const BASE = new Date('2024-06-01T12:00:00Z').getTime()
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(BASE) })
  afterEach(() => { vi.useRealTimers() })

  it('null → —', () => { expect(formatRelative(null)).toBe('—') })
  it('59초 전 → 방금 전', () => {
    expect(formatRelative(new Date(BASE - 59_000).toISOString())).toBe('방금 전')
  })
  it('30분 전 → 30분 전', () => {
    expect(formatRelative(new Date(BASE - 30 * 60_000).toISOString())).toBe('30분 전')
  })
  it('6시간 전 → 6시간 전', () => {
    expect(formatRelative(new Date(BASE - 6 * 60 * 60_000).toISOString())).toBe('6시간 전')
  })
  it('6일 전 → 6일 전', () => {
    expect(formatRelative(new Date(BASE - 6 * 24 * 60 * 60_000).toISOString())).toBe('6일 전')
  })
  it('8일 전 → 날짜 형식', () => {
    const r = formatRelative(new Date(BASE - 8 * 24 * 60 * 60_000).toISOString())
    expect(r).toMatch(/2024/)
  })
})
