'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { RefreshCw, Check, ArrowRight, Loader2, AlertCircle, CreditCard, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { signup, preparePayment, RROS_PRICING, formatPrice } from '@saas/core-client'
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

  const planCode = searchParams?.get('plan') ?? 'rros_free'
  const plan = RROS_PRICING.plans.find(p => p.code === planCode) ?? RROS_PRICING.plans[0]
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
  const tossInstanceRef = useRef<unknown>(null)

  const setField = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.passwordConfirm) { setError('비밀번호가 일치하지 않습니다'); return }
    setError('')
    setLoading(true)
    try {
      const result = await signup({
        company_name: form.companyName,
        admin_name: form.adminName,
        email: form.email,
        password: form.password,
        plan_code: planCode,
        domain: 'rros',
      })
      if (!result.ok || !result.data) throw new Error(result.error?.message ?? '가입 중 오류가 발생했습니다')
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
    if (step !== 3 || isFree || !tossInstanceRef.current) return
    const { toss, data } = tossInstanceRef.current as {
      toss: ReturnType<typeof window.TossPayments>
      data: { order_id: string; amount: number; order_name: string }
    }
    const payment = toss.payment({ customerKey: tenantId })
    const origin = window.location.origin
    payment.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: data.amount },
      orderId: data.order_id,
      orderName: data.order_name,
      successUrl: `${origin}/signup/payment-result?order_id=${data.order_id}&status=success`,
      failUrl:    `${origin}/signup/payment-result?order_id=${data.order_id}&status=fail`,
    }).catch(() => setPaymentDone(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-600/30">
            <RefreshCw className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Revenue Retention OS</h1>
          <p className="text-sm text-slate-500 mt-1">새 계정을 만들어 시작하세요</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(isFree ? [1, 3] : [1, 2, 3]).map((n, i, arr) => (
            <div key={n} className="flex items-center gap-2">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                step >= n ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-500'
              )}>
                {step > n ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={cn('text-xs', step >= n ? 'text-indigo-400' : 'text-slate-600')}>
                {n === 1 ? '계정 정보' : n === 2 ? '결제' : '완료'}
              </span>
              {i < arr.length - 1 && <div className="w-8 h-px bg-slate-700 mx-1" />}
            </div>
          ))}
        </div>

        {/* Plan badge */}
        <div className="mb-4 flex items-center justify-between px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
          <span className="text-sm text-indigo-300 font-medium">{plan.name} 플랜 선택됨</span>
          <span className="text-sm font-bold text-white">
            {isFree ? '무료' : `${formatPrice(plan.monthlyPrice)}/월`}
          </span>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <form onSubmit={handleStep1} className="space-y-4">
              {[
                { key: 'companyName' as const, label: '회사명', placeholder: '(주)우리회사', type: 'text' },
                { key: 'adminName' as const, label: '관리자 이름', placeholder: '홍길동', type: 'text' },
                { key: 'email' as const, label: '이메일', placeholder: 'admin@company.com', type: 'email' },
                { key: 'password' as const, label: '비밀번호 (8자 이상)', placeholder: '••••••••', type: 'password' },
                { key: 'passwordConfirm' as const, label: '비밀번호 확인', placeholder: '••••••••', type: 'password' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">{f.label} *</label>
                  <input
                    type={f.type} value={form[f.key]} onChange={setField(f.key)}
                    placeholder={f.placeholder} required minLength={f.key === 'password' ? 8 : undefined}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 bg-slate-700/60 border border-slate-600 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />처리 중...</> : <>다음 <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && !isFree && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div className="p-4 bg-slate-700/40 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">플랜</span>
                <span className="text-white font-medium">{plan.name}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-600 pt-2">
                <span className="text-slate-400">결제 금액</span>
                <span className="text-indigo-400 font-bold">{formatPrice(plan.monthlyPrice)}/월</span>
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
              className="w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />결제 준비 중...</> : <><CreditCard className="w-4 h-4" />Toss로 결제하기</>}
            </button>
            <p className="text-center text-xs text-slate-600">Toss Payments 보안 결제 · SSL 암호화</p>
          </div>
        )}

        {/* Step 3: Done */}
        {(step === 3 || paymentDone) && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm text-center space-y-5">
            <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-white mb-2">가입 완료!</h2>
              <p className="text-sm text-slate-400">
                <span className="text-white font-medium">{form.companyName}</span>의 관리자 계정이 생성되었습니다.
              </p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2"
            >
              로그인하기 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-5">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">로그인</Link>
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
