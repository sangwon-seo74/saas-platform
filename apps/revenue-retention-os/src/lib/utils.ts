// ============================================================
// Revenue Retention OS — 공통 유틸
// ============================================================

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── 날짜 포맷 ───────────────────────────────────────────
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}

// ─── D-day 계산 ───────────────────────────────────────────
export function calcDday(expiresAt: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(expiresAt)
  target.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDday(days: number): string {
  if (days < 0) return `D+${Math.abs(days)}`
  if (days === 0) return 'D-Day'
  return `D-${days}`
}

export function getDdayClass(days: number): string {
  if (days < 0)  return 'text-[#FF7B72]'
  if (days <= 7)  return 'text-[#FF7B72]'
  if (days <= 14) return 'text-[#E3B341]'
  if (days <= 30) return 'text-[#E3B341]'
  return 'text-dk-muted'
}

export function getRenewalBucket(expiresAt: string): string {
  const days = calcDday(expiresAt)
  if (days <= 7) return 'D-7'
  if (days <= 14) return 'D-14'
  if (days <= 30) return 'D-30'
  if (days <= 60) return 'D-60'
  return 'D-90'
}

// ─── 금액 포맷 ───────────────────────────────────────────
export function formatAmount(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('ko-KR') + '원'
}

export function formatAmountShort(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return formatAmount(n)
}

// ─── 통화 시간 포맷 ──────────────────────────────────────
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}분 ${s}초`
}

// ─── 상대 시간 ───────────────────────────────────────────
export function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const now = new Date()
  const target = new Date(dateStr)
  const diffMs = now.getTime() - target.getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return formatDate(dateStr)
}

// ─── API 응답 헬퍼 ────────────────────────────────────────
export function ok<T>(data: T): Response {
  return Response.json({ data, error: null })
}

export function err(code: string, message: string, status = 400): Response {
  return Response.json({ data: null, error: { code, message } }, { status })
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
