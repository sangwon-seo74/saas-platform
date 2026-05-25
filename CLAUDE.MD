# Claude Code 전용 지침

프로젝트 공통 규칙은 **AGENTS.md가 단일 출처(SSOT)**다. 아래에서 import하며,
공통 규칙을 이 파일에 중복으로 적지 않는다. 이 파일에는 Claude Code 전용 보조 지침만 둔다.

@AGENTS.md

## 권한 우회 예외 — 정지 게이트 (최우선)
`--dangerously-skip-permissions` / `"defaultMode": "bypassPermissions"` 가 켜져 있어도,
아래에 해당하는 결정의 근거가 문서(AGENTS.md, 각 앱 AGENTS.md/CLAUDE.md, core-api/SCHEMA.md·
apps/*/SCHEMA.md, docs/, .env.example, 코드 주석 등)에 명시되어 있지 않으면 **자동 진행하지 말고
AskUserQuestion 으로 먼저 질문한다.**
- 도메인 정책: 어떤 SaaS/스키마/테넌트에 속하는지, 데이터 소유·접근 경계
- 수정 방향: 되돌리기 어렵거나 공개 영향이 있는 변경의 방향성
  (스키마 변경, 공통 기능 수정, 결제·인증 흐름 변경, 비가역 마이그레이션)
- 비즈니스 규칙: 요금/한도/권한/정산 등 코드·문서에 명시되지 않은 규칙

원칙: "문서에 근거 없음 → 질문" 을 기본값으로 한다. 문서에 근거가 있으면 그대로 진행한다.
이 규칙은 권한 모드보다 우선하며, bypass 모드에서도 질문은 정상 동작한다.
(AGENTS.md의 "추정 금지" 원칙을 Claude Code 권한 모델에서 강제하는 장치다.)
