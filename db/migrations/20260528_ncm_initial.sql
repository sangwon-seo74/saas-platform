-- ============================================================
-- namecard-crm (ncm) 초기 스키마
-- 실행: Supabase SQL Editor
-- ============================================================

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
  mobile             TEXT,
  fax                TEXT,
  email              TEXT,
  is_vip             BOOLEAN     NOT NULL DEFAULT FALSE,
  last_contacted_at  TIMESTAMPTZ,
  notes              TEXT,
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
  recognized_data     JSONB,
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
  attachments JSONB       NOT NULL DEFAULT '[]',
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

-- ── 인덱스 ─────────────────────────────────────────────────
CREATE INDEX idx_ncm_contacts_tenant    ON ncm.contacts(tenant_id);
CREATE INDEX idx_ncm_contacts_company   ON ncm.contacts(company_id);
CREATE INDEX idx_ncm_contacts_mobile    ON ncm.contacts(mobile) WHERE mobile IS NOT NULL;
CREATE INDEX idx_ncm_contacts_email     ON ncm.contacts(email)  WHERE email  IS NOT NULL;
CREATE INDEX idx_ncm_activities_contact ON ncm.activities(contact_id);
CREATE INDEX idx_ncm_activities_tenant  ON ncm.activities(tenant_id);

-- ── updated_at 트리거 ──────────────────────────────────────
CREATE OR REPLACE FUNCTION ncm.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_ncm_companies_updated_at
  BEFORE UPDATE ON ncm.companies
  FOR EACH ROW EXECUTE FUNCTION ncm.fn_set_updated_at();

CREATE TRIGGER trg_ncm_contacts_updated_at
  BEFORE UPDATE ON ncm.contacts
  FOR EACH ROW EXECUTE FUNCTION ncm.fn_set_updated_at();

CREATE TRIGGER trg_ncm_activities_updated_at
  BEFORE UPDATE ON ncm.activities
  FOR EACH ROW EXECUTE FUNCTION ncm.fn_set_updated_at();

-- ── last_contacted_at 자동 갱신 트리거 ─────────────────────
CREATE OR REPLACE FUNCTION ncm.fn_update_last_contacted()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE ncm.contacts SET last_contacted_at = NOW() WHERE id = NEW.contact_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ncm_update_last_contacted
  AFTER INSERT OR UPDATE ON ncm.activities
  FOR EACH ROW EXECUTE FUNCTION ncm.fn_update_last_contacted();

-- ── RLS 활성화 ─────────────────────────────────────────────
ALTER TABLE ncm.companies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncm.contacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncm.business_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncm.activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncm.tags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncm.contact_tags  ENABLE ROW LEVEL SECURITY;

-- ── RLS 정책 (테넌트 격리) ─────────────────────────────────
-- fn_my_tenant_id() 는 core 스키마 공통 헬퍼 (이미 존재)

CREATE POLICY ncm_companies_tenant ON ncm.companies
  USING  (tenant_id = fn_my_tenant_id())
  WITH CHECK (tenant_id = fn_my_tenant_id());

CREATE POLICY ncm_contacts_tenant ON ncm.contacts
  USING  (tenant_id = fn_my_tenant_id())
  WITH CHECK (tenant_id = fn_my_tenant_id());

CREATE POLICY ncm_business_cards_tenant ON ncm.business_cards
  USING  (tenant_id = fn_my_tenant_id())
  WITH CHECK (tenant_id = fn_my_tenant_id());

CREATE POLICY ncm_activities_tenant ON ncm.activities
  USING  (tenant_id = fn_my_tenant_id())
  WITH CHECK (tenant_id = fn_my_tenant_id());

CREATE POLICY ncm_tags_tenant ON ncm.tags
  USING  (tenant_id = fn_my_tenant_id())
  WITH CHECK (tenant_id = fn_my_tenant_id());

CREATE POLICY ncm_contact_tags_tenant ON ncm.contact_tags
  USING  (
    EXISTS (
      SELECT 1 FROM ncm.contacts c
      WHERE c.id = contact_id AND c.tenant_id = fn_my_tenant_id()
    )
  );

-- ── Supabase PostgREST 스키마 노출 (수동 설정 필요) ──────────
-- Supabase 대시보드 Settings > API > Exposed schemas 에서 추가:
--   ncm
-- (core, rros 스키마도 노출되어 있어야 함)
-- supabase-js 클라이언트는 db: { schema: 'ncm' } 옵션으로 ncm 스키마 접근,
-- core.* 테이블은 .schema('core').from(...) 으로 접근.

-- ── Supabase Storage 버킷 (수동 생성 필요) ─────────────────
-- Supabase 대시보드 Storage > New bucket 에서 생성:
--   Bucket name : ncm-business-cards
--   Public      : false (private)
--
-- Storage RLS (버킷 생성 후 Storage > Policies 에서 추가):
-- CREATE POLICY ncm_bc_tenant ON storage.objects
--   FOR ALL TO authenticated
--   USING  ((storage.foldername(name))[1] = fn_my_tenant_id()::text)
--   WITH CHECK ((storage.foldername(name))[1] = fn_my_tenant_id()::text);
