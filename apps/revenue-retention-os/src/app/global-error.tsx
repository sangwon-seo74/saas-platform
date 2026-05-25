'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ background: '#0D1117', color: '#E6EDF3', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#8B949E' }}>오류가 발생했습니다</p>
          {process.env.NODE_ENV === 'development' && (
            <pre style={{ fontSize: 11, color: '#FF7B72', marginTop: 8, maxWidth: 600, textAlign: 'left', whiteSpace: 'pre-wrap' }}>
              {error.message}
            </pre>
          )}
          <button onClick={reset} style={{ marginTop: 16, padding: '8px 16px', background: '#1f6feb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
