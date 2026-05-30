'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Wine, AlertCircle, Loader2, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { verifyTeamInviteLink, joinWithTeamLink } from '@saas/core-client'
import { cn } from '@/lib/utils'

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  )
}

type State = 'loading' | 'valid' | 'invalid' | 'submitting' | 'done'

function JoinContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get('token') ?? ''

  const [state, setState] = useState<State>('loading')
  const [tenantName, setTenantName] = useState('')
  const [role, setRole] = useState('')
  const [label, setLabel] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  useEffect(() => {
    if (!token) { setState('invalid'); setErrorMsg('유효하지 않은 초대 링크입니다'); return }
    verifyTeamInviteLink(token).then(res => {
      if (!res.ok || !res.data) {
        setState('invalid')
        setErrorMsg(res.error?.message ?? '유효하지 않은 초대 링크입니다')
      } else {
        setTenantName(res.data.tenant_name)
        setRole(res.data.role)
        setLabel(res.data.label ?? '')
        setState('valid')
      }
    })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== passwordConfirm) { setErrorMsg('비밀번호가 일치하지 않습니다'); return }
    setState('submitting')
    setErrorMsg('')
    try {
      const res = await joinWithTeamLink({ token, name, email, password })
      if (!res.ok || !res.data) throw new Error(res.error?.message ?? '가입 중 오류가 발생했습니다')
      setState('done')
    } catch (err: unknown) {
      setState('valid')
      setErrorMsg(err instanceof Error ? err.message : '가입 중 오류가 발생했습니다')
    }
  }

  const ROLE_LABEL: Record<string, string> = {
    admin: '관리자', manager: '매니저', sales: '영업담당자', rep: '영업담당자',
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-orange-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-600 mb-4 shadow-lg shadow-orange-600/30">
            <Wine className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">팀 합류</h1>
          <p className="text-sm text-gray-500 mt-1">초대 링크로 계정을 만드세요</p>
        </div>

        {state === 'loading' && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
          </div>
        )}

        {state === 'invalid' && (
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <p className="text-white font-semibold">유효하지 않은 초대 링크</p>
            <p className="text-sm text-gray-400">{errorMsg}</p>
            <Link href="/login" className="text-sm text-orange-400 hover:text-orange-300">로그인 페이지로</Link>
          </div>
        )}

        {(state === 'valid' || state === 'submitting') && (
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="mb-5 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <p className="text-sm text-orange-300 font-medium">{tenantName}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                역할: {ROLE_LABEL[role] ?? role}
                {label && ` · ${label}`}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">이름 *</label>
                <input
                  value={name} onChange={e => setName(e.target.value)} required
                  placeholder="홍길동"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 bg-gray-700/60 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">이메일 *</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 bg-gray-700/60 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">비밀번호 * (8자 이상)</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 bg-gray-700/60 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">비밀번호 확인 *</label>
                <input
                  type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 bg-gray-700/60 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{errorMsg}</p>
                </div>
              )}

              <button
                type="submit" disabled={state === 'submitting'}
                className={cn(
                  'w-full py-2.5 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-500 text-white',
                  'disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20',
                )}
              >
                {state === 'submitting' ? <><Loader2 className="w-4 h-4 animate-spin" />처리 중...</> : '계정 만들기'}
              </button>
            </form>
          </div>
        )}

        {state === 'done' && (
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-sm text-center space-y-5">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-white mb-2">가입 완료!</h2>
              <p className="text-sm text-gray-400">{tenantName} 팀에 합류했습니다.</p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center gap-2"
            >
              로그인하기 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
