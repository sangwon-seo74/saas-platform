import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@saas/core-client'],

  // 실험적 기능
  experimental: {
    // Server Actions 활성화 (Next.js 15 기본값)
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },

  // 이미지 최적화 도메인
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // 보안 헤더
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',         value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection',        value: '1; mode=block' },
        ],
      },
    ]
  },
}

export default nextConfig
