'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { verifyInvite, acceptInvite } from '@saas/core-client'

interface InvitePayload {
  email: string
  role: string
  tenant_name: string
  expires_at: string
}

type TokenState = 'loading' | 'valid' | 'expired' | 'used'
type SubmitState = 'idle' | 'loading' | 'done' | 'error'

const ROLE_LABEL: Record<string, string> = { owner: '관리자', member: '팀원' }

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8자 이상', ok: password.length >= 8 },
    { label: '영문 포함', ok: /[a-zA-Z]/.test(password) },
    { label: '숫자 포함', ok: /[0-9]/.test(password) },
    { label: '특수문자 포함', ok: /[!@#$%^&*]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length
  const barColor = score <= 1 ? 'bg-red-500' : score <= 2 ? 'bg-amber-400' : score <= 3 ? 'bg-blue-400' : 'bg-green-500'
  if (!password) return null
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-all duration-300', i < score ? barColor : 'bg-gray-700')} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {checks.map(c => (
          <div key={c.label} className={cn('flex items-center gap-1 text-[10px]', c.ok ? 'text-green-400' : 'text-gray-600')}>
            <span className="w-2.5 h-2.5 flex items-center justify-center">{c.ok ? '✓' : '·'}</span>
            {c.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  const params   = useParams()
  const router   = useRouter()
  const token    = (params?.token ?? '') as string

  const [tokenState,  setTokenState]  = useState<TokenState>('loading')
  const [invite,      setInvite]      = useState<InvitePayload | null>(null)
  const [name,        setName]        = useState('')
  const [password,    setPassword]    = useState('')
  const [passwordCf,  setPasswordCf]  = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errMsg,      setErrMsg]      = useState('')

  useEffect(() => {
    const verify = async () => {
      if (!token) { setTokenState('expired'); return }
      const res = await verifyInvite(token)
      if (!res.ok || !res.data) { setTokenState('expired'); return }
      setInvite(res.data)
      setTokenState('valid')
    }
    verify()
  }, [token])

  const canSubmit = name.trim().length > 0 && password.length >= 8 && password === passwordCf && submitState === 'idle'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || password !== passwordCf) { setErrMsg('비밀번호가 일치하지 않습니다'); return }
    setSubmitState('loading')
    setErrMsg('')
    try {
      const res = await acceptInvite({ token, name, password })
      if (!res.ok || res.error) throw new Error(res.error?.message ?? '계정 설정 중 오류가 발생했습니다')
      setSubmitState('done')
    } catch (err: unknown) {
      setSubmitState('error')
      setErrMsg(err instanceof Error ? err.message : '계정 설정 중 오류가 발생했습니다')
    }
  }

  if (tokenState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm text-gray-400">초대 링크 확인 중...</p>
        </div>
      </div>
    )
  }

  if (tokenState === 'expired' || tokenState === 'used') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            {tokenState === 'expired' ? '초대 링크가 만료됐습니다' : '이미 사용된 링크입니다'}
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            {tokenState === 'expired' ? '관리자에게 재초대를 요청하세요.' : '로그인 페이지로 이동하세요.'}
          </p>
          <button onClick={() => router.push('/login')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors">
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    )
  }

  if (submitState === 'done') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">계정이 준비됐습니다</h1>
          <p className="text-sm text-gray-400 mb-1"><span className="text-white font-medium">{invite?.tenant_name}</span>에 합류했습니다</p>
          <p className="text-sm text-gray-500 mb-6">{invite?.email} · {ROLE_LABEL[invite?.role ?? 'member']}</p>
          <button onClick={() => router.push('/login')} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20">
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <h1 className="text-xl font-bold text-white">팀 초대를 수락했습니다</h1>
          <p className="text-sm text-gray-400 mt-1">계정 정보를 설정해 주세요</p>
        </div>

        {invite && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3.5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 text-sm font-bold shrink-0">
                {invite.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{invite.tenant_name}</p>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded-full">
                    {ROLE_LABEL[invite.role] ?? invite.role}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{invite.email}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">이름</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="홍길동" required
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 bg-gray-700/60 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">비밀번호 설정</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="8자 이상" required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm text-white placeholder-gray-600 bg-gray-700/60 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">비밀번호 확인</label>
              <input type={showPw ? 'text' : 'password'} value={passwordCf} onChange={e => setPasswordCf(e.target.value)} autoComplete="new-password" placeholder="비밀번호 다시 입력" required
                className={cn('w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 bg-gray-700/60 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                  passwordCf && password !== passwordCf ? 'border-red-500/50' : passwordCf && password === passwordCf ? 'border-green-500/50' : 'border-gray-600 hover:border-gray-500')} />
              {passwordCf && password !== passwordCf && <p className="text-[10px] text-red-400 mt-1">비밀번호가 일치하지 않습니다</p>}
              {passwordCf && password === passwordCf && <p className="text-[10px] text-green-400 mt-1">비밀번호가 일치합니다</p>}
            </div>
            {submitState === 'error' && errMsg && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-xs text-red-300">{errMsg}</p>
              </div>
            )}
            <button type="submit" disabled={!canSubmit}
              className={cn('w-full py-2.5 rounded-xl text-sm font-semibold transition-all bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20')}>
              {submitState === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" />계정 설정 중...</> : '계정 설정 완료'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
