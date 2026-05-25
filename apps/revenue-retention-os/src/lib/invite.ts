// 초대 토큰 생성·저장·이메일 발송 공유 로직
// auth/invite/route.ts 와 settings/users/route.ts 에서 공통 사용

import { createInviteToken } from '@/lib/invite-token'
import type { UserRole } from '@/types/domain'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

export interface InviteParams {
  email:       string
  name:        string
  role:        UserRole
  tenantId:    string
  userId:      string | null
  tenantName:  string
  inviterName: string
}

export interface InviteResult {
  token:     string
  inviteUrl: string
  expiresAt: string
}

async function sendInviteEmail(params: {
  to:          string
  name:        string
  tenantName:  string
  inviterName: string
  role:        UserRole
  inviteUrl:   string
}): Promise<void> {
  // 실제 발송하려면: npm i resend + RESEND_API_KEY 환경변수 설정 후 아래 주석 해제
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'noreply@revenue-os.com',
  //   to: params.to,
  //   subject: `[Revenue OS] ${params.tenantName} 팀에 초대되었습니다`,
  //   html: [
  //     `<p>${params.inviterName}님이 ${params.tenantName}의 <strong>${params.role}</strong> 역할로 초대했습니다.</p>`,
  //     `<p><a href="${params.inviteUrl}">초대 수락하기</a> (7일 이내)</p>`,
  //   ].join(''),
  // })
  console.log('[Invite Email]', { to: params.to, inviteUrl: params.inviteUrl })
}

export async function sendInvite(
  supabase: SupabaseLike,
  params: InviteParams,
): Promise<InviteResult> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const token = createInviteToken({
    email:     params.email,
    tenantId:  params.tenantId,
    role:      params.role,
    invitedBy: params.userId ?? '',
    expiresAt,
  })

  const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/invite/${token}`

  // 기존 토큰 무효화 후 신규 토큰 저장
  await supabase.from('invite_tokens')
    .delete()
    .eq('email', params.email)
    .eq('tenant_id', params.tenantId)

  await supabase.from('invite_tokens').insert({
    token,
    email:      params.email,
    tenant_id:  params.tenantId,
    role:       params.role,
    invited_by: params.userId,
    expires_at: expiresAt,
  })

  await sendInviteEmail({
    to:          params.email,
    name:        params.name,
    tenantName:  params.tenantName,
    inviterName: params.inviterName,
    role:        params.role,
    inviteUrl,
  })

  return { token, inviteUrl, expiresAt }
}
