# ncm 스키마 (namecard-crm 도메인)

> 명함 CRM 도메인 테이블의 **현재 상태** 단일 출처(SSOT).
> 스키마 변경은 Supabase SQL Editor에서 적용하고 이 문서를 함께 갱신한다.
> 공통 인프라(테넌트/사용자/구독 등)는 `core` 스키마 → [../../core-api/SCHEMA.md](../../core-api/SCHEMA.md).

## 테이블 (6)

| 테이블 | 역할 | RLS |
|--------|------|-----|
| `companies` | 명함 상의 회사 정보 (명, 주소, 홈페이지, 대표번호) | `ncm_tenant_isolation` |
| `contacts` | 담당자 (companies 참조, 이름·직책·연락처·VIP) | `ncm_tenant_isolation` |
| `business_cards` | 명함 이미지 + Claude 인식 원본 (contacts 참조) | `ncm_tenant_isolation` |
| `activities` | 활동 이력 (메모/전화/방문/상담) | `ncm_tenant_isolation` |
| `tags` | 테넌트별 태그 정의 | `ncm_tenant_isolation` |
| `contact_tags` | contacts ↔ tags 연결 | `ncm_tenant_isolation` |

## DDL (초기 생성 기준)

```sql
-- 스키마 생성
CREATE SCHEMA IF NOT EXISTS ncm;

-- ── companies ──────────────────────────────────────────────
CREATE TABLE ncm.companies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  address     TEXT,
  website     TEXT,
  main_phone  TEXT,
  created_by  UUID        REFERENCES core.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── contacts ───────────────────────────────────────────────
CREATE TABLE ncm.contacts (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  company_id         UUID        REFERENCES ncm.companies(id) ON DELETE SET NULL,
  name               TEXT        NOT NULL,
  department         TEXT,
  title              TEXT,
  mobile             TEXT,        -- 중복 감지 Hard 키
  fax                TEXT,
  email              TEXT,        -- 중복 감지 Hard 키
  is_vip             BOOLEAN     NOT NULL DEFAULT FALSE,
  last_contacted_at  TIMESTAMPTZ, -- activities 트리거로 자동 갱신
  notes              TEXT,        -- 빠른 메모 (활동 이력과 별도)
  created_by         UUID        REFERENCES core.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── business_cards ─────────────────────────────────────────
CREATE TABLE ncm.business_cards (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  contact_id          UUID        REFERENCES ncm.contacts(id) ON DELETE CASCADE,
  front_image_url     TEXT,
  back_image_url      TEXT,
  thumbnail_url       TEXT,
  recognized_data     JSONB,      -- core-client.scanBusinessCard() 원본 응답
  recognition_status  TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (recognition_status IN ('pending', 'completed', 'failed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── activities ─────────────────────────────────────────────
CREATE TABLE ncm.activities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  contact_id  UUID        NOT NULL REFERENCES ncm.contacts(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL
                CHECK (type IN ('memo', 'call', 'visit', 'consultation')),
  content     TEXT,
  attachments JSONB       NOT NULL DEFAULT '[]', -- [{url, name, size}]
  created_by  UUID        REFERENCES core.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── tags ───────────────────────────────────────────────────
CREATE TABLE ncm.tags (
  id        UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID  NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  name      TEXT  NOT NULL,
  color     TEXT  NOT NULL DEFAULT '#6B7280',
  UNIQUE (tenant_id, name)
);

-- ── contact_tags ───────────────────────────────────────────
CREATE TABLE ncm.contact_tags (
  contact_id  UUID NOT NULL REFERENCES ncm.contacts(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES ncm.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);
```

## 역할 · RLS 패턴

- 역할: `owner` / `member`. (`core.users.role`에 저장)
- 테넌트 격리: 모든 테이블에 `tenant_id = fn_my_tenant_id()` 정책 적용.
- owner/member 모두 동일 테넌트 내 데이터를 읽고 쓸 수 있다.
  팀 관리(초대·역할 변경) 기능만 API 레이어에서 `owner` 여부 확인.

```sql
-- companies RLS 예시 (나머지 테이블도 동일 패턴)
ALTER TABLE ncm.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY ncm_companies_tenant ON ncm.companies
  USING  (tenant_id = fn_my_tenant_id())
  WITH CHECK (tenant_id = fn_my_tenant_id());
```

## 트리거

| 트리거 | 테이블 | 시점 | 동작 |
|--------|--------|------|------|
| `trg_ncm_update_last_contacted` | `activities` | INSERT/UPDATE | `contacts.last_contacted_at` = `NOW()` |
| `trg_ncm_updated_at_*` | companies, contacts, activities | UPDATE | `updated_at` = `NOW()` |

## Supabase Storage 버킷

| 버킷 | 공개 여부 | 경로 패턴 | 용도 |
|------|----------|-----------|------|
| `ncm-business-cards` | private | `{tenant_id}/{contact_id}/front.{ext}` | 명함 앞면 이미지 |
| `ncm-business-cards` | private | `{tenant_id}/{contact_id}/back.{ext}` | 명함 뒷면 이미지 |

> ⚠️ 버킷은 Supabase 대시보드 Storage > New bucket 에서 수동 생성 필요.
> RLS: `(storage.foldername(name))[1] = fn_my_tenant_id()::text` 패턴으로 테넌트 격리.

## 외부 연동

- 명함 OCR — `core-client.scanBusinessCard()`. `ANTHROPIC_API_KEY`는 core-api 환경변수에만 존재.
- 이메일 — `core-client.sendEmail()`. 자격증명은 core-api `RESEND_API_KEY`.
- SMS / 카카오 — `core-client.sendSms()` / `core-client.sendKakao()` (필요 시 사용).
- 연락처 내보내기(CSV/vCard) — Route Handler에서 직접 생성, 외부 서비스 미사용.
```
