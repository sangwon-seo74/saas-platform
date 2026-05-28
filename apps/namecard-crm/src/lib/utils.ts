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

export function formatNoContactDays(dateStr: string | null | undefined): string {
  if (!dateStr) return '연락 이력 없음'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return '오늘'
  return `${diff}일 전`
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
