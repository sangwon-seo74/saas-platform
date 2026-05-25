'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[App Error]', error)
    }
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-sm text-dk-muted">페이지를 불러오는 중 오류가 발생했습니다</p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="text-xs text-dk-red bg-tint-red border border-tint-red-border rounded-lg p-3 max-w-lg whitespace-pre-wrap">
          {error.message}
        </pre>
      )}
      <button
        onClick={reset}
        className="px-4 py-2 text-sm text-white bg-dk-accent rounded-lg hover:bg-dk-accentHover transition-colors"
      >
        다시 시도
      </button>
    </div>
  )
}
