'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Check, ArrowRight, Loader2, AlertCircle, CreditCard, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { signup, preparePayment, NCM_PRICING, formatPrice } from '@saas/core-client'
import { cn } from '@/lib/utils'

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  )
}

type Step = 1 | 2 | 3

interface FormData {
  companyName: string
  adminName: string
  email: string
  password: string
  passwordConfirm: string
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TossPayments: (clientKey: string) => any
  }
}

function SignupContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const planCode = searchParams?.get('plan') ?? 'ncm_free'
  const plan = NCM_PRICING.plans.find(p => p.code === planCode) ?? NCM_PRICING.plans[0]
  const isFree = plan.monthlyPrice === 0

  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>({
    companyName: '', adminName: '', email: '', password: '', passwordConfirm: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [paymentDone, setPaymentDone] = useState(false)
  const tossWidgetRef = useRef<HTMLDivElement>(null)
  const tossInstanceRef = useRef<unknown>(null)

  const setField = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await signup({
        company_name: form.companyName,
        admin_name: form.adminName,
        email: form.email,
        password: form.password,
        plan_code: planCode,
        domain: 'ncm',
      })
      if (!result.ok || !result.data) {
        throw new Error(result.error?.message ?? '가입 중 오류가 발생했습니다')
      }
      setTenantId(result.data.tenant_id)

      const { signIn } = await import('@/lib/supabase/auth-client')
      const { session } = await signIn(form.email, form.password)
      if (session?.access_token) setAuthToken(session.access_token)

      setStep(isFree ? 3 : 2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '가입 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleStep2 = async () => {
    if (!authToken || !tenantId) { setStep(3); return }
    setLoading(true)
    setError('')
    try {
      const res = await preparePayment(
        { plan_code: planCode, billing_cycle: 'monthly', tenant_id: tenantId },
        authToken,
      )
      if (!res.ok || !res.data) throw new Error(res.error?.message ?? '결제 준비 실패')

      await loadTossScript()
      const toss = window.TossPayments(res.data.client_key)
      tossInstanceRef.current = { toss, data: res.data }
      setStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '결제 준비 중 오류')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (step !== 3 || isFree || !tossWidgetRef.current || !tossInstanceRef.current) return

    const { toss, data } = tossInstanceRef.current as { toss: ReturnType<typeof window.TossPayments>, data: { order_id: string; amount: number; order_name: string; client_key: string } }

    const payment = toss.payment({ customerKey: tenantId })
    const origin = window.location.origin
    payment.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: data.amount },
      orderId: data.order_id,
      orderName: data.order_name,
      successUrl: `${origin}/signup/payment-result?order_id=${data.order_id}&status=success`,
      failUrl:    `${origin}/signup/payment-result?order_id=${data.order_id}&status=fail`,
    }).catch(() => {
      setPaymentDone(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const steps = [
    { n: 1, label: '계정 정보' },
    { n: 2, label: '결제' },
    { n: 3, label: '완료' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Namecard CRM</h1>
          <p className="text-sm text-gray-500 mt-1">새 계정을 만들어 시작하세요</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {(isFree ? [{ n: 1, label: '계정 정보' }, { n: 3, label: '완료' }] : steps).map((s, i, arr) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                step >= s.n ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-500'
              )}>
                {step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n === 3 ? '3' : s.n}
              </div>
              <span className={cn('text-xs', step >= s.n ? 'text-blue-400' : 'text-gray-600')}>{s.label}</span>
              {i < arr.length - 1 && <div className="w-8 h-px bg-gray-700 mx-1" />}
            </div>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-between px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <span className="text-sm text-blue-300 font-medium">{plan.name} 플랜 선택됨</span>
          <span className="text-sm font-bold text-white">
            {isFree ? '무료' : `${formatPrice(plan.monthlyPrice)}/월`}
          </span>
        </div>

        {step === 1 && (
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">회사명 *</label>
                <input
                  value={form.companyName} onChange={setField('companyName')}
                  placeholder="(주)우리회사" required
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 bg-gray-700/60 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">관리자 이름 *</label>
                <input
                  value={form.adminName} onChange={setField('adminName')}
                  placeholder="홍길동" required
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 bg-gray-700/60 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">이메일 *</label>
                <input
                  type="email" value={form.email} onChange={setField('email')}
                  placeholder="admin@company.com" required
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 bg-gray-700/60 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">비밀번호 * (8자 이상)</label>
                <input
                  type="password" value={form.password} onChange={setField('password')}
                  placeholder="••••••••" required minLength={8}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 bg-gray-700/60 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">비밀번호 확인 *</label>
                <input
                  type="password" value={form.passwordConfirm} onChange={setField('passwordConfirm')}
                  placeholder="••••••••" required
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 bg-gray-700/60 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />처리 중...</> : <>다음 <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        )}

        {step === 2 && !isFree && (
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div className="p-4 bg-gray-700/40 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">플랜</span>
                <span className="text-white font-medium">{plan.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">결제 주기</span>
                <span className="text-white">월간</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-600 pt-2">
                <span className="text-gray-400">결제 금액</span>
                <span className="text-blue-400 font-bold">{formatPrice(plan.monthlyPrice)}</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <button
              onClick={handleStep2} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />결제 준비 중...</> : <><CreditCard className="w-4 h-4" />Toss로 결제하기</>}
            </button>
            <p className="text-center text-xs text-gray-600">Toss Payments 보안 결제 · SSL 암호화</p>

            <div ref={tossWidgetRef} id="toss-payment-widget" />
          </div>
        )}

        {(step === 3 || paymentDone) && (
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-sm text-center space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">가입 완료!</h2>
              <p className="text-sm text-gray-400">
                <span className="text-white font-medium">{form.companyName}</span>의 관리자 계정이 생성되었습니다.
                {!isFree && ' 구독이 활성화되었습니다.'}
              </p>
            </div>
            {isFree && (
              <button
                onClick={() => router.push('/login?signup=done')}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2"
              >
                로그인하기 <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-5">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">로그인</Link>
        </p>
        <p className="text-center text-xs text-gray-700 mt-2">
          <Link href="/pricing/ncm" className="hover:text-gray-500">다른 플랜 보기</Link>
        </p>
      </div>
    </div>
  )
}

async function loadTossScript(): Promise<void> {
  if (typeof window.TossPayments !== 'undefined') return
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://js.tosspayments.com/v2/standard'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Toss SDK 로드 실패'))
    document.head.appendChild(script)
  })
}
