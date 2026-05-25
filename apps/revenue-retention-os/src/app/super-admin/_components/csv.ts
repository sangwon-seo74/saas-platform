// 클라이언트 사이드 CSV 다운로드 헬퍼

/** 객체 배열을 CSV 텍스트로 직렬화 후 브라우저에서 다운로드.
 *  - 값이 쉼표/따옴표/줄바꿈 포함 시 큰따옴표로 감싸고 내부 큰따옴표는 두 번 반복으로 escape.
 *  - 한글 깨짐 방지를 위해 BOM 추가. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) {
    alert('내보낼 데이터가 없습니다')
    return
  }
  const headers = Object.keys(rows[0])
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ]
  const csv = '﻿' + lines.join('\n')  // UTF-8 BOM
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
