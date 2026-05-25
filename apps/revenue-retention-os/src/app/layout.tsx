import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | Revenue Retention OS',
    default: 'Revenue Retention OS',
  },
  description: 'B2B SaaS 갱신(Renewal) 중심 영업관리 플랫폼',
  robots: { index: false, follow: false }, // 내부 서비스 — 검색엔진 노출 차단
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
}
