import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dk-bg flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-dk-orange mb-4">404</p>
        <p className="text-dk-text text-lg mb-2">페이지를 찾을 수 없습니다</p>
        <p className="text-dk-muted text-sm mb-8">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
        <Link href="/app/dashboard" className="px-4 py-2 bg-dk-accent text-white rounded-lg text-sm hover:bg-dk-accentHover transition-colors">
          대시보드로
        </Link>
      </div>
    </div>
  )
}
