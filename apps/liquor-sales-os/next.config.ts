import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  transpilePackages: ['@saas/core-client'],

  webpack(config) {
    config.resolve.alias['@saas/core-client'] = path.resolve(__dirname, '../../packages/core-client/src')
    return config
  },

  experimental: {
    serverActions: { allowedOrigins: ['localhost:3002'] },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection',        value: '1; mode=block' },
        ],
      },
    ]
  },
}

export default nextConfig
