'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, Shield, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND } from '@/constants/colors'
import { logAccess } from '@saas/core-client'

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

  const redirect = searchParams?.get('redirect') ?? '/app/dashboard'
  const type     = searchParams?.get('type')       // 'super_admin' 이면 SA 모드
  const isSA     = type === 'super_admin'

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
        // 로그인 실패도 audit_logs에 기록 (fire-and-forget)
        logAccess({ email, action: 'login', result: 'fail' })

        // Supabase 에러 메시지 한국어 변환
        const msg = error.message.includes('Invalid login credentials')
          ? '이메일 또는 비밀번호가 올바르지 않습니다'
          : error.message.includes('Email not confirmed')
          ? '이메일 인증이 필요합니다. 받은편지함을 확인해 주세요'
          : error.message
        throw new Error(msg)
      }

      if (!supaSession) throw new Error('로그인 중 오류가 발생했습니다')

      // 로그인 성공 기록 (fire-and-forget) — 실패해도 페이지 이동은 진행
      logAccess({ email, action: 'login', result: 'success' })

      router.push(redirect)
      router.refresh()
    } catch (err: unknown) {
      setState('error')
      setErrMsg(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* 배경 그라디언트 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            {isSA
              ? <Shield className="w-6 h-6 text-white" />
              : <span className="text-white font-bold text-lg">R</span>
            }
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isSA ? 'Super Admin' : 'Revenue Retention OS'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSA ? '운영자 전용 접근입니다' : '로그인하여 시작하세요'}
          </p>
        </div>

        {/* 카드 */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm shadow-2xl">
          {/* SA 모드 뱃지 */}
          {isSA && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-2.5 mb-5">
              <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <p className="text-xs text-blue-300">운영자 계정으로 로그인합니다</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이메일 */}
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
                  'bg-gray-700/60 border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                  state === 'error'
                    ? 'border-red-500/50'
                    : 'border-gray-600 hover:border-gray-500'
                )}
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-400">비밀번호</label>
                <button
                  type="button"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  비밀번호 찾기
                </button>
              </div>
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
                    'bg-gray-700/60 border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                    state === 'error'
                      ? 'border-red-500/50'
                      : 'border-gray-600 hover:border-gray-500'
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

            {/* 에러 메시지 */}
            {state === 'error' && errMsg && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-xs text-red-300">{errMsg}</p>
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={state === 'loading' || !email || !password}
              className={cn(
                'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
                'bg-blue-600 hover:bg-blue-500 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2',
                'shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30'
              )}
            >
              {state === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          {/* 구분선 */}
          {!isSA && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-xs text-gray-600">또는</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>

              {/* SSO 버튼 (향후 구현) */}
              <button
                type="button"
                className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-300 border border-gray-600 hover:border-gray-500 hover:bg-gray-700/40 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill={BRAND.googleBlue} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill={BRAND.googleGreen} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill={BRAND.googleYellow} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill={BRAND.googleRed} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google로 로그인
              </button>
            </>
          )}
        </div>

        {/* 하단 안내 */}
        {!isSA && (
          <p className="text-center text-xs text-gray-600 mt-5">
            초대 이메일을 받지 못하셨나요?{' '}
            <span className="text-gray-400">관리자에게 문의하세요</span>
          </p>
        )}

        {/* 개발 힌트 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center">
            <p className="text-xs text-yellow-400/70">개발 모드 — 비밀번호: <code className="font-mono">password123</code></p>
          </div>
        )}
      </div>
    </div>
  )
}
