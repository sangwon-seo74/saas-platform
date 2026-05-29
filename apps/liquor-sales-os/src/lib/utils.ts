import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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

export function formatNoVisitDays(dateStr: string | null | undefined): string {
  if (!dateStr) return '방문 이력 없음'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  return `${diff}일 전`
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

export function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function ok<T>(data: T): Response {
  return Response.json({ data, error: null })
}

export function err(code: string, message: string, status = 400): Response {
  return Response.json({ data: null, error: { code, message } }, { status })
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export const CLIENT_TYPE_LABEL: Record<string, string> = {
  restaurant: '음식점',
  bar: '주점',
  wholesale: '도매',
  retail: '소매',
  other: '기타',
}

export const VISIT_STATUS_LABEL: Record<string, string> = {
  planned: '예정',
  checked_in: '방문중',
  completed: '완료',
  cancelled: '취소',
}

export const VISIT_TYPE_LABEL: Record<string, string> = {
  sales: '영업',
  delivery: '배송',
  collection: '수금',
  other: '기타',
}
