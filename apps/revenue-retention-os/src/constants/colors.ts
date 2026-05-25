// ============================================================
// 차트/데이터 시각화 · 외부 브랜드 색상 상수
//
// 여기 색은 Tailwind 클래스가 아니라 recharts fill/stroke, SVG, style={{}} 등
// "값"으로 들어가는 색이다. (UI 토큰은 tailwind.config의 dk.* / tint.* 사용)
// 디자인 정책 SSOT: ../../DESIGN.md
// ============================================================

// ─── 차트·데이터 시각화 팔레트 (GitHub 다크 계열) ───────────
// reports/* 의 recharts·SVG에서 사용. 전환(Task #4) 시 변형 추가.
export const CHART = {
  green:      '#2ea043',
  greenDark:  '#238636',
  greenLight: '#56d364',
  greenMuted: '#2d6a3f',
  red:        '#f85149',
  redDark:    '#da3633',
} as const

// ─── 외부 브랜드 색 (디자인 토큰 아님 — 원본 hex 유지) ───────
// 구글 OAuth 버튼 등 브랜드 가이드가 고정한 색.
export const BRAND = {
  googleBlue:   '#4285f4',
  googleRed:    '#ea4335',
  googleYellow: '#fbbc05',
  googleGreen:  '#34a853',
} as const
