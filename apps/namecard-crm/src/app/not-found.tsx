import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dk-bg flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <p className="text-5xl font-bold text-dk-dim">404</p>
        <p className="text-dk-muted">페이지를 찾을 수 없습니다</p>
        <Link
          href="/app/dashboard"
          className="inline-block px-4 py-2 text-sm bg-dk-accent text-white rounded-lg hover:bg-dk-accentHover transition-colors"
        >
          대시보드로 이동
        </Link>
      </div>
    </div>
  )
}
