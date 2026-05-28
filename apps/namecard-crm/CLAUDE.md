# namecard-crm 도메인 지침

## 도메인 요약
AI 기반 명함 인식·고객 연락처·관계관리 CRM SaaS.
DB 스키마: `ncm` (도메인 테이블), 공통 인프라는 `core` 스키마.

## 핵심 테이블 / 역할
- 핵심 테이블: companies, contacts, business_cards, activities, tags, contact_tags
- 역할·권한:
  - `owner`: 테넌트 전체 데이터 접근 + 팀 관리 (초대/역할 변경)
  - `member`: 테넌트 전체 데이터 읽기·쓰기, 팀 관리 불가
  - RLS = 테넌트 격리(`fn_my_tenant_id()`). owner/member 모두 같은 테넌트 데이터에 접근 가능.
    팀 설정 변경은 API 레이어에서 `x-user-role: owner` 확인으로 제한.

## 비즈니스 규칙 (SSOT)

### 명함 인식
- Claude 호출은 반드시 `core-client.scanBusinessCard()` 경유 (절대 규칙 1).
  앱 내부에 `ANTHROPIC_API_KEY`를 두지 않는다.
- 인식 결과(`recognized_data` JSONB)는 `business_cards` 테이블에 저장.
  수동 수정은 `contacts` / `companies` 테이블에 반영하고, `business_cards.recognized_data`는 원본 유지.
- 전화번호 정규화 규칙: 한국 표준 형식. Claude가 잘못 인식한 문자(예: `S`→`5`, `O`→`0`)를
  의미 기반으로 교정 후 `0##-####-####` 형식으로 반환한다.

### 중복 감지
- **Hard 기준(자동 감지)**: 동일 `mobile` 또는 동일 `email` → 저장 전 "중복 가능성 있음" 표시.
- **Soft 기준(AI 제안)**: 유사 이름 + 같은 회사 → Phase 2 구현.
- 병합 여부는 항상 사용자가 결정한다. 시스템이 자동 병합하지 않는다.
- 중복 판별 기준: `contacts.mobile` nullable이므로, null이면 중복 체크 skip.

### last_contacted_at 자동 갱신
- `activities` INSERT/UPDATE 시 트리거로 `contacts.last_contacted_at` 자동 갱신.

### 데이터 내보내기
- CSV/vCard 내보내기는 Next.js Route Handler에서 직접 생성 가능 (외부 서비스 미사용).
- 이메일 발송이 필요한 경우 `core-client.sendEmail()` 경유.

### 구독 / 사용량 한도
- TBD — 구독 플랜 확정 시 이 항목에 기재.
  설정 화면의 "Claude 사용량 / 저장소 사용량"은 Phase 2에서 구현.

### AI 자연어 검색
- Phase 2. MVP는 이름·회사명·전화번호·이메일·메모·태그 키워드 부분 일치 검색만 제공.

## 스키마 (SSOT)
- 도메인(`ncm`) 테이블 / RLS / 트리거: [./SCHEMA.md](./SCHEMA.md)
- 공통(`core`) 스키마: [../../core-api/SCHEMA.md](../../core-api/SCHEMA.md)

## Vercel 프로젝트
| 항목 | 값 |
|------|-----|
| 앱 디렉토리 | `apps/namecard-crm` |
| Vercel 프로젝트명 | `ncm` |
| 배포 URL | (별도 Vercel 프로젝트) |

@AGENTS.md
