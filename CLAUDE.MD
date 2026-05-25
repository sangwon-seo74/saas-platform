## 마이그레이션 컨텍스트 (베타 단계, 운영 사용자 없음)

### 출발 상태
- 기존: Next.js (App Router) + API Routes + Supabase (Auth/DB/Storage) 단일 앱
- 위치: apps/revenue-retention-os/ 로 이미 이동 완료 (Phase 0 시점)

### 목표 상태
- core-api(Python/FastAPI): 인증 검증, 알림, 결제 등 공통 기능
- apps/revenue-retention-os/: 도메인 로직만, 공통 기능은 packages/core-client 통해 호출
- DB: core.*, revenue-retention-os.* 스키마로 분리

### 진행 체크리스트
- [ ] Phase 0: 모노레포 구조 + revenue-retention-os 이동
- [ ] Phase 1: DB 스키마 분리 + RLS 정책 재작성
- [ ] Phase 2: core-api 골격 + Supabase JWT 검증
- [ ] Phase 3: API Routes 분류 및 공통 로직 이관
- [ ] Phase 4: core-client SDK + 프론트 호출 변경
- [ ] Phase 5: 정리

### 베타이기 때문에 적용되는 규칙
- 무중단 마이그레이션 코드는 작성하지 않는다 (feature flag, dual-write 등 불필요)
- DB 데이터는 보존하되, 기존 베타 사용자 재로그인은 허용 가능
- 기존 API Route를 즉시 삭제하지 말고 @deprecated 주석 후 Phase 5에서 일괄 제거

### 분류 규칙 (API Route 이관 판단)
- 외부 서비스 호출 (이메일/SMS/결제 API 등) → core-api 이관
- 여러 SaaS에서 공유될 가능성 있음 → core-api 이관  
- 단순 SELECT (RLS만으로 충분) → Server Component로 흡수, API Route 삭제
- 도메인 특화 비즈니스 로직 → apps/revenue-retention-os/api/ 유지 (당분간), 안정되면 별도 판단

### Supabase 관련 주의사항
- auth, storage, realtime 등 Supabase 시스템 스키마는 절대 건드리지 않는다
- RLS 정책 변경 시 반드시 db/migrations/에 SQL로 기록
- Supabase JWT는 SUPABASE_JWT_SECRET으로 HS256 검증 (Service Role Key와 혼동 금지)