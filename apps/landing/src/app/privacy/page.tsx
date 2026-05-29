import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보처리방침 | SaaS Platform',
  description: 'SaaS Platform 개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <div className="bg-[#020209] min-h-screen text-white">
      <header className="border-b border-white/[0.06] sticky top-0 z-50 backdrop-blur-xl bg-[#020209]/80">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="text-white font-semibold">SaaS Platform</span>
          </Link>
          <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
            ← 홈으로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">개인정보처리방침</h1>
        <p className="text-slate-500 text-sm mb-12">최종 수정일: 2026년 5월 30일 &middot; 시행일: 2026년 5월 30일</p>

        <div className="mb-10 p-5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-sm text-slate-300 leading-relaxed">
          SaaS Platform(이하 &ldquo;회사&rdquo;)은 개인정보보호법, 정보통신망 이용촉진 및 정보보호 등에 관한 법률 등
          관련 법령에 따라 이용자의 개인정보를 보호하고, 이와 관련한 고충을 신속하고 원활하게 처리하기 위해
          다음과 같이 개인정보처리방침을 수립·공개합니다.
        </div>

        <div className="space-y-12 text-slate-300 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-white mb-3">1. 수집하는 개인정보 항목</h2>
            <p className="mb-3">회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-2.5 pr-4 text-slate-400 font-medium w-32">수집 시점</th>
                    <th className="text-left py-2.5 text-slate-400 font-medium">수집 항목</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  <tr>
                    <td className="py-2.5 pr-4 text-slate-400 align-top">회원 가입</td>
                    <td className="py-2.5">이름, 이메일 주소, 비밀번호(암호화 저장), 회사명</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-slate-400 align-top">유료 결제</td>
                    <td className="py-2.5">결제 수단 정보(카드번호 일부, 유효기간 — 결제대행사에서 처리), 사업자등록번호(세금계산서 발행 시)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-slate-400 align-top">서비스 이용</td>
                    <td className="py-2.5">서비스 이용 기록, 접속 로그, 접속 IP, 브라우저 정보, 쿠키</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-slate-400 align-top">고객 지원</td>
                    <td className="py-2.5">문의 내용, 전화번호(선택)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">2. 개인정보 수집 및 이용 목적</h2>
            <ul className="space-y-2">
              <li>① <span className="text-slate-200">서비스 제공:</span> 회원 가입, 본인 확인, 서비스 이용 및 관리</li>
              <li>② <span className="text-slate-200">계약 이행:</span> 요금 청구, 결제 처리, 세금계산서 발행</li>
              <li>③ <span className="text-slate-200">고객 지원:</span> 문의 응대, 불만 처리, 공지사항 전달</li>
              <li>④ <span className="text-slate-200">서비스 개선:</span> 이용 통계 분석, 신규 기능 개발, 맞춤형 서비스 제공</li>
              <li>⑤ <span className="text-slate-200">마케팅 및 광고:</span> 이용자가 별도로 동의한 경우에 한해 신규 서비스·이벤트 안내</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">3. 개인정보 보유 및 이용 기간</h2>
            <p className="mb-3">회사는 원칙적으로 개인정보 수집 목적이 달성된 후 해당 정보를 지체 없이 파기합니다. 단, 다음의 정보는 관련 법령에 따라 아래 기간 동안 보존합니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-2.5 pr-4 text-slate-400 font-medium">보존 항목</th>
                    <th className="text-left py-2.5 pr-4 text-slate-400 font-medium">보존 기간</th>
                    <th className="text-left py-2.5 text-slate-400 font-medium">근거</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  <tr>
                    <td className="py-2.5 pr-4 align-top">계약 또는 청약철회 기록</td>
                    <td className="py-2.5 pr-4 align-top">5년</td>
                    <td className="py-2.5 text-slate-400">전자상거래법</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 align-top">대금 결제 및 재화 공급 기록</td>
                    <td className="py-2.5 pr-4 align-top">5년</td>
                    <td className="py-2.5 text-slate-400">전자상거래법</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 align-top">소비자 불만·분쟁 처리 기록</td>
                    <td className="py-2.5 pr-4 align-top">3년</td>
                    <td className="py-2.5 text-slate-400">전자상거래법</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 align-top">접속 로그, IP 정보</td>
                    <td className="py-2.5 pr-4 align-top">3개월</td>
                    <td className="py-2.5 text-slate-400">통신비밀보호법</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">4. 개인정보의 제3자 제공</h2>
            <p className="mb-3">회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외입니다.</p>
            <ul className="space-y-2">
              <li>① 이용자가 사전에 동의한 경우</li>
              <li>② 법령의 규정에 의거하거나, 수사·조사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관 등이 요구하는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">5. 개인정보 처리 위탁</h2>
            <p className="mb-3">회사는 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁합니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-2.5 pr-4 text-slate-400 font-medium">수탁 업체</th>
                    <th className="text-left py-2.5 text-slate-400 font-medium">위탁 업무</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  <tr>
                    <td className="py-2.5 pr-4 align-top">Supabase Inc.</td>
                    <td className="py-2.5">인증 및 데이터베이스 서비스</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 align-top">Vercel Inc.</td>
                    <td className="py-2.5">서버 호스팅 및 CDN 서비스</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 align-top">Resend Inc.</td>
                    <td className="py-2.5">이메일 발송 서비스</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 align-top">결제대행사(PG)</td>
                    <td className="py-2.5">결제 처리 및 정산</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">6. 정보주체의 권리·의무 및 행사 방법</h2>
            <ul className="space-y-2">
              <li>① 이용자는 언제든지 다음의 개인정보 보호 관련 권리를 행사할 수 있습니다.
                <ul className="mt-2 ml-4 space-y-1 text-slate-400">
                  <li>- 개인정보 열람 요구</li>
                  <li>- 오류 등이 있는 경우 정정 요구</li>
                  <li>- 삭제 요구</li>
                  <li>- 처리 정지 요구</li>
                </ul>
              </li>
              <li>② 권리 행사는 서비스 내 설정 메뉴 또는 <a href="mailto:contact@saas-platform.io" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">contact@saas-platform.io</a>로 이메일을 통해 요청하실 수 있으며, 회사는 지체 없이 조치합니다.</li>
              <li>③ 이용자가 개인정보 오류 정정을 요청한 경우, 정정 완료 전까지 해당 개인정보를 이용 또는 제공하지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">7. 개인정보 안전성 확보 조치</h2>
            <p className="mb-3">회사는 개인정보보호법 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적·관리적·물리적 조치를 하고 있습니다.</p>
            <ul className="space-y-2">
              <li>① <span className="text-slate-200">비밀번호 암호화:</span> 비밀번호는 단방향 암호화(bcrypt)되어 저장되며, 회사 내부에서도 확인이 불가능합니다.</li>
              <li>② <span className="text-slate-200">통신 암호화:</span> 모든 데이터 전송은 TLS/SSL을 통해 암호화됩니다.</li>
              <li>③ <span className="text-slate-200">접근 제어:</span> 개인정보 처리 시스템에 대한 접근 권한을 최소한의 인원으로 제한하고, Row Level Security(RLS)를 적용합니다.</li>
              <li>④ <span className="text-slate-200">접속 기록 관리:</span> 개인정보 처리 시스템에 대한 접속 기록을 보관하고 위·변조 방지 조치를 합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">8. 쿠키(Cookie) 사용 안내</h2>
            <ul className="space-y-2">
              <li>① 회사는 서비스 개선 및 로그인 상태 유지를 위해 쿠키를 사용합니다.</li>
              <li>② 사용 쿠키 종류:
                <ul className="mt-2 ml-4 space-y-1 text-slate-400">
                  <li>- <span className="text-slate-300">필수 쿠키:</span> 서비스 이용에 반드시 필요한 쿠키 (세션 유지, 보안)</li>
                  <li>- <span className="text-slate-300">분석 쿠키:</span> 서비스 이용 통계 수집 (동의 시에만 사용)</li>
                </ul>
              </li>
              <li>③ 브라우저 설정을 통해 쿠키 허용 여부를 선택할 수 있습니다. 단, 필수 쿠키를 거부하면 서비스 이용에 제한이 생길 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">9. 개인정보 보호책임자</h2>
            <p className="mb-3">회사는 개인정보 처리에 관한 업무를 총괄하고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해 구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.07] text-sm space-y-1">
              <p><span className="text-slate-400">책임자:</span> SaaS Platform 개인정보 보호팀</p>
              <p><span className="text-slate-400">이메일:</span> <a href="mailto:contact@saas-platform.io" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">contact@saas-platform.io</a></p>
            </div>
            <p className="mt-3 text-slate-400 text-sm">
              기타 개인정보 침해에 대한 신고나 상담은 아래 기관에 문의하실 수 있습니다.<br />
              <a href="https://privacy.go.kr" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">개인정보 보호위원회</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">개인정보 분쟁조정위원회</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.cybercrime.go.kr" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">사이버범죄 신고시스템</a>
            </p>
          </section>

          <section className="border-t border-white/[0.06] pt-10">
            <h2 className="text-base font-semibold text-white mb-3">10. 개인정보처리방침의 변경</h2>
            <p>이 개인정보처리방침은 2026년 5월 30일부터 시행됩니다. 내용 추가·삭제 및 수정이 있을 경우에는 시행일 최소 7일 전부터 서비스 내 공지사항을 통해 고지합니다.</p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">
            문의: <a href="mailto:contact@saas-platform.io" className="text-indigo-400 hover:text-indigo-300 transition-colors">contact@saas-platform.io</a>
          </p>
          <Link href="/terms" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
            ← 이용약관
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-700 text-sm">© 2026 SaaS Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-slate-700 hover:text-slate-400 text-xs transition-colors">이용약관</Link>
            <Link href="/privacy" className="text-slate-700 text-xs">개인정보처리방침</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
