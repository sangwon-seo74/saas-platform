// HMAC-SHA256 기반 초대 토큰 서명/검증
// 환경변수 INVITE_TOKEN_SECRET 필요 (최소 32자 랜덤 문자열)

import { createHmac, timingSafeEqual } from 'crypto'
import type { UserRole } from '@/types/domain'

export interface InviteTokenPayload {
  email: string
  tenantId: string
  role: UserRole
  invitedBy: string
  expiresAt: string
}

function getSecret(): string {
  const secret = process.env.INVITE_TOKEN_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('INVITE_TOKEN_SECRET 환경변수가 설정되지 않았습니다')
  }
  return secret || 'dev-secret-change-in-production'
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url')
}

export function createInviteToken(payload: InviteTokenPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig  = sign(data)
  return `${data}.${sig}`
}

export function verifyInviteToken(token: string): InviteTokenPayload | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null

    const data     = token.slice(0, dot)
    const sig      = token.slice(dot + 1)
    const expected = sign(data)

    // 타이밍 공격 방지
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null

    const payload = JSON.parse(
      Buffer.from(data, 'base64url').toString()
    ) as InviteTokenPayload

    if (new Date(payload.expiresAt) < new Date()) return null
    return payload
  } catch {
    return null
  }
}
