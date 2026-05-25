import type { NextPageContext } from 'next'

function ErrorPage({ statusCode }: { statusCode: number }) {
  return (
    <html>
      <body style={{ background: '#0D1117', color: '#E6EDF3', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#58A6FF', marginBottom: 8 }}>{statusCode}</p>
          <p style={{ fontSize: 14, color: '#8B949E' }}>
            {statusCode === 404 ? '페이지를 찾을 수 없습니다' : '서버 오류가 발생했습니다'}
          </p>
          <a href="/app/dashboard" style={{ display: 'inline-block', marginTop: 24, padding: '8px 20px', background: '#1f6feb', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13 }}>
            대시보드로
          </a>
        </div>
      </body>
    </html>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? (err as NodeJS.ErrnoException & { statusCode?: number }).statusCode ?? 500 : 404
  return { statusCode }
}

export default ErrorPage
