import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SaaS Platform — 비즈니스 성장을 위한 올인원 솔루션',
  description:
    'B2B 운영의 모든 영역을 자동화하는 검증된 SaaS 솔루션. 고객 갱신부터 팀 업무 관리까지, 하나의 플랫폼에서.',
  keywords: ['SaaS', 'B2B', '갱신관리', '리텐션', '영업자동화', 'Revenue Retention'],
  openGraph: {
    title: 'SaaS Platform',
    description: '비즈니스 성장을 가속화하는 올인원 SaaS 플랫폼',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SaaS Platform',
    description: '비즈니스 성장을 가속화하는 올인원 SaaS 플랫폼',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="scroll-smooth">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased bg-[#020209] text-white">{children}</body>
    </html>
  )
}
