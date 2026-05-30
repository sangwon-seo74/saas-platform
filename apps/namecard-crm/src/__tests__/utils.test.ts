import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDate, formatDateTime, formatRelative,
  formatNoContactDays, cn,
} from '@/lib/utils'

// ─── formatDate ──────────────────────────────────────────────
describe('formatDate', () => {
  it('null/undefined 입력 시 — 반환', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })

  it('유효한 날짜 문자열 파싱 성공', () => {
    const result = formatDate('2024-01-15T00:00:00Z')
    expect(result).not.toBe('—')
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/01/)
    expect(result).toMatch(/15/)
  })
})

// ─── formatDateTime ───────────────────────────────────────────
describe('formatDateTime', () => {
  it('null 입력 시 — 반환', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('날짜+시간 문자열 포함', () => {
    const result = formatDateTime('2024-06-20T14:30:00Z')
    expect(result).not.toBe('—')
    expect(result).toMatch(/2024/)
  })
})

// ─── formatRelative ───────────────────────────────────────────
describe('formatRelative', () => {
  const BASE_TIME = new Date('2024-06-01T12:00:00Z').getTime()

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(BASE_TIME) })
  afterEach(() => { vi.useRealTimers() })

  it('null 입력 시 — 반환', () => {
    expect(formatRelative(null)).toBe('—')
    expect(formatRelative(undefined)).toBe('—')
  })

  it('30초 전 → 방금 전', () => {
    expect(formatRelative(new Date(BASE_TIME - 30_000).toISOString())).toBe('방금 전')
  })

  it('5분 전 → 5분 전', () => {
    expect(formatRelative(new Date(BASE_TIME - 5 * 60_000).toISOString())).toBe('5분 전')
  })

  it('3시간 전 → 3시간 전', () => {
    expect(formatRelative(new Date(BASE_TIME - 3 * 60 * 60_000).toISOString())).toBe('3시간 전')
  })

  it('2일 전 → 2일 전', () => {
    expect(formatRelative(new Date(BASE_TIME - 2 * 24 * 60 * 60_000).toISOString())).toBe('2일 전')
  })

  it('8일 전 → 날짜 형식', () => {
    const result = formatRelative(new Date(BASE_TIME - 8 * 24 * 60 * 60_000).toISOString())
    expect(result).toMatch(/2024/)
  })
})

// ─── formatNoContactDays ──────────────────────────────────────
describe('formatNoContactDays', () => {
  const BASE_TIME = new Date('2024-06-01T12:00:00Z').getTime()
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(BASE_TIME) })
  afterEach(() => { vi.useRealTimers() })

  it('null → 연락 이력 없음', () => {
    expect(formatNoContactDays(null)).toBe('연락 이력 없음')
    expect(formatNoContactDays(undefined)).toBe('연락 이력 없음')
  })

  it('오늘 → 오늘', () => {
    expect(formatNoContactDays(new Date(BASE_TIME - 1000).toISOString())).toBe('오늘')
  })

  it('5일 전 → 5일 전', () => {
    expect(formatNoContactDays(new Date(BASE_TIME - 5 * 24 * 60 * 60_000).toISOString())).toBe('5일 전')
  })
})

// ─── cn ───────────────────────────────────────────────────────
describe('cn (tailwind merge)', () => {
  it('단순 클래스 병합', () => {
    expect(cn('px-2', 'py-2')).toBe('px-2 py-2')
  })

  it('충돌하는 tailwind 클래스 마지막 우선', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('falsy 값 무시', () => {
    expect(cn('px-2', false && 'py-2', null, undefined)).toBe('px-2')
  })

  it('조건부 클래스', () => {
    const active = true
    expect(cn('base', active && 'active')).toBe('base active')
  })
})
