// ============================================================
// 외부 브랜드 색상 상수
//
// Tailwind 클래스가 아니라 SVG fill 등 "값"으로 들어가는 브랜드 색.
// (UI 색은 tailwind.config의 dk.* / tint.* 토큰 사용. 차트는 컴포넌트에
//  토큰 클래스명을 props로 전달.)
// 디자인 정책 SSOT: ../../DESIGN.md
// ============================================================

// ─── 외부 브랜드 색 (디자인 토큰 아님 — 원본 hex 유지) ───────
// 구글 OAuth 버튼 등 브랜드 가이드가 고정한 색.
export const BRAND = {
  googleBlue:   '#4285f4',
  googleRed:    '#ea4335',
  googleYellow: '#fbbc05',
  googleGreen:  '#34a853',
} as const
