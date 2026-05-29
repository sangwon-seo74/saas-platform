'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, Wine, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type LoginState = 'idle' | 'loading' | 'error'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const redirect  = searchParams?.get('redirect') ?? '/app/dashboard'
  const errorCode = searchParams?.get('error')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [state,    setState]    = useState<LoginState>('idle')
  const [errMsg,   setErrMsg]   = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setState('loading')
    setErrMsg('')

    try {
      const { signIn } = await import('@/lib/supabase/auth-client')
      const { session: supaSession, error } = await signIn(email, password)

      if (error) {
        const msg = error.message.includes('Invalid login credentials')
          ? '이메일 또는 비밀번호가 올바르지 않습니다'
          : error.message.includes('Email not confirmed')
          ? '이메일 인증이 필요합니다. 받은편지함을 확인해 주세요'
          : error.message
        throw new Error(msg)
      }

      if (!supaSession) throw new Error('로그인 중 오류가 발생했습니다')

      router.push(redirect)
      router.refresh()
    } catch (err: unknown) {
      setState('error')
      setErrMsg(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-amber-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-600 mb-4 shadow-lg shadow-orange-600/30">
            <Wine className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">주류영업 관리</h1>
          <p className="text-sm text-gray-500 mt-1">로그인하여 시작하세요</p>
        </div>

        {errorCode === 'no_access' && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-300">계정이 등록되지 않았거나 비활성 상태입니다. 관리자에게 문의하세요.</p>
          </div>
        )}

        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">이메일</label>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600',
                  'bg-gray-700/60 border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500',
                  state === 'error' ? 'border-red-500/50' : 'border-gray-600 hover:border-gray-500'
                )}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={cn(
                    'w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm text-white placeholder-gray-600',
                    'bg-gray-700/60 border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500',
                    state === 'error' ? 'border-red-500/50' : 'border-gray-600 hover:border-gray-500'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {state === 'error' && errMsg && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-xs text-red-300">{errMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={state === 'loading' || !email || !password}
              className={cn(
                'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
                'bg-orange-600 hover:bg-orange-500 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2',
                'shadow-lg shadow-orange-600/20 hover:shadow-orange-500/30'
              )}
            >
              {state === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />로그인 중...</>
              ) : (
                '로그인'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-5">
          계정 문의:{' '}
          <span className="text-gray-400">관리자에게 연락하세요</span>
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center">
            <p className="text-xs text-yellow-400/70">개발 모드 — 비밀번호: <code className="font-mono">password123</code></p>
          </div>
        )}
      </div>
    </div>
  )
}
