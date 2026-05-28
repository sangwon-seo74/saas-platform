'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-dk-bg flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <p className="text-dk-red font-medium">오류가 발생했습니다</p>
        <p className="text-sm text-dk-muted">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm bg-dk-surface border border-dk-border rounded-lg text-dk-text hover:bg-dk-surface2 transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
