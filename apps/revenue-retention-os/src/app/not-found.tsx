import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-4xl font-bold text-dk-dim">404</p>
      <p className="text-sm text-dk-muted">페이지를 찾을 수 없습니다</p>
      <Link href="/app/dashboard" className="text-sm text-dk-blue hover:underline">
        대시보드로 이동
      </Link>
    </div>
  )
}
