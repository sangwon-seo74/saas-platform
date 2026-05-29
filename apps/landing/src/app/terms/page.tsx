import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이용약관 | SaaS Platform',
  description: 'SaaS Platform 서비스 이용약관',
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">이용약관</h1>
        <p className="text-slate-500 text-sm mb-12">최종 수정일: 2026년 5월 30일 &middot; 시행일: 2026년 5월 30일</p>

        <div className="space-y-12 text-slate-300 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-white mb-3">제1조 (목적)</h2>
            <p>
              이 약관은 SaaS Platform(이하 &ldquo;회사&rdquo;)이 제공하는 Revenue Retention OS, Namecard CRM 등
              제반 서비스(이하 &ldquo;서비스&rdquo;)의 이용 조건 및 절차, 회사와 이용자의 권리·의무 및
              책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">제2조 (정의)</h2>
            <ul className="space-y-2">
              <li>① &ldquo;서비스&rdquo;란 회사가 제공하는 모든 SaaS 소프트웨어 및 관련 기능을 말합니다.</li>
              <li>② &ldquo;회원&rdquo;이란 이 약관에 동의하고 서비스 이용계약을 체결한 법인 또는 개인을 말합니다.</li>
              <li>③ &ldquo;계정&rdquo;이란 서비스 이용을 위해 회원이 생성한 아이디와 비밀번호의 조합을 말합니다.</li>
              <li>④ &ldquo;테넌트&rdquo;란 회원이 생성한 독립적인 서비스 이용 단위(조직)를 말합니다.</li>
              <li>⑤ &ldquo;콘텐츠&rdquo;란 회원이 서비스 내에서 등록·업로드한 데이터, 문서, 이미지 등 일체의 정보를 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ul className="space-y-2">
              <li>① 이 약관은 서비스 화면에 게시하거나 이메일 등의 방법으로 공지함으로써 효력이 발생합니다.</li>
              <li>② 회사는 합리적인 사유가 있는 경우 관련 법령을 위배하지 않는 범위 내에서 약관을 변경할 수 있으며, 변경 시 최소 7일 전에 서비스 내 공지 또는 이메일로 고지합니다.</li>
              <li>③ 변경된 약관에 동의하지 않는 회원은 서비스 이용을 중단하고 탈퇴할 수 있습니다. 변경 고지 후 계속 서비스를 이용하는 경우 변경 약관에 동의한 것으로 간주합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">제4조 (서비스의 내용)</h2>
            <ul className="space-y-2">
              <li>① 회사는 다음의 서비스를 제공합니다.
                <ul className="mt-2 ml-4 space-y-1 text-slate-400">
                  <li>- Revenue Retention OS: B2B 고객 갱신·리텐션 운영 관리</li>
                  <li>- Namecard CRM: AI 명함 인식 및 고객 연락처·관계 관리</li>
                  <li>- 주류영업 관리: 영업담당자 방문·거래처 관리 및 지도 기반 영업 현황 파악</li>
                  <li>- 기타 회사가 추가 개발하거나 제휴를 통해 제공하는 서비스</li>
                </ul>
              </li>
              <li>② 서비스는 연중무휴 24시간 제공함을 원칙으로 하나, 시스템 점검·장애·기술적 사유로 일시 중단될 수 있습니다.</li>
              <li>③ 회사는 서비스 내용을 변경할 수 있으며, 중요한 변경이 있는 경우 사전에 고지합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">제5조 (이용계약 체결)</h2>
            <ul className="space-y-2">
              <li>① 이용계약은 회원이 회사의 이용약관 및 개인정보처리방침에 동의하고 계정을 생성함으로써 체결됩니다.</li>
              <li>② 만 14세 미만 또는 법령상 계약 체결 능력이 없는 자는 회원이 될 수 없습니다.</li>
              <li>③ 회사는 다음의 경우 이용계약 체결을 거절하거나 사후에 이용계약을 해지할 수 있습니다.
                <ul className="mt-2 ml-4 space-y-1 text-slate-400">
                  <li>- 허위 정보를 제공한 경우</li>
                  <li>- 타인의 명의를 도용한 경우</li>
                  <li>- 서비스 운영을 방해하거나 법령에 위반되는 목적으로 이용하는 경우</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">제6조 (회원의 의무)</h2>
            <ul className="space-y-2">
              <li>① 회원은 계정 정보를 최신으로 유지하고, 계정 보안에 책임을 집니다.</li>
              <li>② 회원은 다음 행위를 해서는 안 됩니다.
                <ul className="mt-2 ml-4 space-y-1 text-slate-400">
                  <li>- 타인의 계정을 무단으로 사용하는 행위</li>
                  <li>- 서비스의 소스코드를 역공학·역컴파일·역어셈블하는 행위</li>
                  <li>- 서비스의 정상 운영을 방해하는 행위(과부하 유발, 악성코드 유포 등)</li>
                  <li>- 타인의 개인정보를 무단으로 수집·이용하는 행위</li>
                  <li>- 관련 법령 및 이 약관에서 금지하는 행위</li>
                </ul>
              </li>
              <li>③ 회원은 서비스를 통해 처리하는 데이터의 적법성에 대한 책임을 집니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">제7조 (요금 및 결제)</h2>
            <ul className="space-y-2">
              <li>① 서비스 요금은 서비스 내 가격 페이지에 게시된 요금제를 따릅니다.</li>
              <li>② 유료 서비스는 결제 시점부터 이용이 가능하며, 요금은 선납을 원칙으로 합니다.</li>
              <li>③ 회사는 합리적인 사유가 있는 경우 요금을 변경할 수 있으며, 변경 시 최소 30일 전에 고지합니다.</li>
              <li>④ 미납 요금이 발생한 경우 서비스 이용이 제한될 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">제8조 (환불 정책)</h2>
            <ul className="space-y-2">
              <li>① 월 구독 요금은 원칙적으로 환불되지 않습니다.</li>
              <li>② 단, 다음의 경우 예외적으로 환불이 가능합니다.
                <ul className="mt-2 ml-4 space-y-1 text-slate-400">
                  <li>- 회사의 귀책사유로 서비스가 연속 48시간 이상 중단된 경우: 해당 기간 일할 계산 환불</li>
                  <li>- 결제 후 7일 이내이고 서비스를 실질적으로 이용하지 않은 경우</li>
                </ul>
              </li>
              <li>③ 환불을 원하는 경우 <a href="mailto:contact@saas-platform.io" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">contact@saas-platform.io</a>로 문의하시기 바랍니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">제9조 (서비스 중단 및 해지)</h2>
            <ul className="space-y-2">
              <li>① 회원은 언제든지 서비스 내 설정 메뉴를 통해 탈퇴할 수 있습니다.</li>
              <li>② 회사는 회원이 이 약관을 위반한 경우 사전 통보 없이 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.</li>
              <li>③ 계약 해지 시 회원의 콘텐츠는 해지일로부터 30일 후 삭제됩니다. 단, 법령에 의해 보존이 필요한 정보는 예외입니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">제10조 (지식재산권)</h2>
            <ul className="space-y-2">
              <li>① 서비스 및 서비스 내 모든 콘텐츠(소프트웨어, 디자인, 텍스트 등)에 대한 저작권 및 지식재산권은 회사에 귀속됩니다.</li>
              <li>② 회원이 서비스에 등록한 콘텐츠의 지식재산권은 해당 회원에게 귀속됩니다. 단, 회원은 서비스 제공을 위해 필요한 범위 내에서 회사가 해당 콘텐츠를 이용할 수 있음에 동의합니다.</li>
              <li>③ 회원은 회사의 사전 서면 동의 없이 서비스를 복제·수정·배포·상업적으로 이용할 수 없습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">제11조 (책임의 한계)</h2>
            <ul className="space-y-2">
              <li>① 회사는 천재지변, 전쟁, 테러, 정부의 처분, 통신장애 등 불가항력적 사유로 인한 서비스 장애에 대해 책임을 지지 않습니다.</li>
              <li>② 회사는 회원의 귀책사유로 발생한 손해에 대해 책임을 지지 않습니다.</li>
              <li>③ 회사의 서비스 관련 손해배상 책임은 직전 3개월 동안 해당 회원이 납부한 이용요금을 초과하지 않습니다.</li>
              <li>④ 회사는 서비스 이용으로 인한 간접 손해, 특별 손해, 결과적 손해에 대해 책임을 지지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">제12조 (준거법 및 관할법원)</h2>
            <ul className="space-y-2">
              <li>① 이 약관의 해석 및 회사와 회원 사이의 분쟁에는 대한민국 법률이 적용됩니다.</li>
              <li>② 서비스 이용과 관련하여 분쟁이 발생한 경우, 당사자 간 성실한 협의를 통해 해결함을 원칙으로 합니다.</li>
              <li>③ 협의가 이루어지지 않을 경우 서울중앙지방법원을 제1심 관할법원으로 합니다.</li>
            </ul>
          </section>

          <section className="border-t border-white/[0.06] pt-10">
            <h2 className="text-base font-semibold text-white mb-3">부칙</h2>
            <p>이 약관은 2026년 5월 30일부터 시행합니다.</p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">
            문의: <a href="mailto:contact@saas-platform.io" className="text-indigo-400 hover:text-indigo-300 transition-colors">contact@saas-platform.io</a>
          </p>
          <Link href="/privacy" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
            개인정보처리방침 →
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-700 text-sm">© 2026 SaaS Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-slate-700 text-xs">이용약관</Link>
            <Link href="/privacy" className="text-slate-700 hover:text-slate-400 text-xs transition-colors">개인정보처리방침</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
