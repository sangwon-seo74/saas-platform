import type { NextConfig } from 'next'
import path from 'path'

const config: NextConfig = {
  transpilePackages: ['@saas/core-client'],

  webpack(cfg) {
    cfg.resolve.alias['@saas/core-client'] = path.resolve(__dirname, '../../packages/core-client/src')
    return cfg
  },
}

export default config
