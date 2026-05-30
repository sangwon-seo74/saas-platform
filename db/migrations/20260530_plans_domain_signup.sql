-- =====================================================================
-- 도메인별 요금제 + 셀프 가입 + 팀 초대 링크 인프라
-- =====================================================================

-- 1. core.plans에 domain 컬럼 추가
ALTER TABLE core.plans ADD COLUMN IF NOT EXISTS domain TEXT;

-- 2. 기존 플랜을 RROS 도메인으로 설정
UPDATE core.plans SET domain = 'rros' WHERE domain IS NULL;

-- 3. 기존 플랜 정리 (재삽입을 위해 비활성화 또는 삭제)
-- 기존 플랜 code를 도메인-코드로 재정의하기 위해 삭제 후 재삽입
-- (tenant_subscriptions 외래키 없으면 삭제 가능, 있으면 UPDATE)
UPDATE core.plans SET
  code = 'rros_free',
  domain = 'rros'
WHERE code = 'free';

UPDATE core.plans SET
  code = 'rros_standard',
  domain = 'rros'
WHERE code = 'standard';

UPDATE core.plans SET
  code = 'rros_pro',
  domain = 'rros'
WHERE code = 'pro';

-- 4. LSO 플랜 삽입
INSERT INTO core.plans (name, code, domain, max_users, max_companies, max_messages, monthly_price, yearly_price, is_active)
VALUES
  ('무료', 'lso_free', 'lso', 3, 30, 0, 0, 0, true),
  ('스탠다드', 'lso_standard', 'lso', 10, 200, 500, 49000, 490000, true),
  ('프로', 'lso_pro', 'lso', 0, 0, 0, 99000, 990000, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  max_users = EXCLUDED.max_users,
  max_companies = EXCLUDED.max_companies,
  max_messages = EXCLUDED.max_messages,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  is_active = EXCLUDED.is_active;

-- 5. NCM 플랜 삽입
INSERT INTO core.plans (name, code, domain, max_users, max_companies, max_messages, monthly_price, yearly_price, is_active)
VALUES
  ('무료', 'ncm_free', 'ncm', 2, 200, 0, 0, 0, true),
  ('스탠다드', 'ncm_standard', 'ncm', 10, 5000, 200, 39000, 390000, true),
  ('프로', 'ncm_pro', 'ncm', 0, 0, 0, 89000, 890000, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  max_users = EXCLUDED.max_users,
  max_companies = EXCLUDED.max_companies,
  max_messages = EXCLUDED.max_messages,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  is_active = EXCLUDED.is_active;

-- 6. RROS 플랜 재삽입 (신규 코드 체계)
INSERT INTO core.plans (name, code, domain, max_users, max_companies, max_messages, monthly_price, yearly_price, is_active)
VALUES
  ('무료', 'rros_free', 'rros', 5, 50, 100, 0, 0, true),
  ('스탠다드', 'rros_standard', 'rros', 20, 500, 2000, 79000, 790000, true),
  ('프로', 'rros_pro', 'rros', 0, 0, 0, 199000, 1990000, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  max_users = EXCLUDED.max_users,
  max_companies = EXCLUDED.max_companies,
  max_messages = EXCLUDED.max_messages,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  is_active = EXCLUDED.is_active;

-- 7. core.plans에 unique constraint (code) 추가 (없으면)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plans_code_key' AND conrelid = 'core.plans'::regclass
  ) THEN
    ALTER TABLE core.plans ADD CONSTRAINT plans_code_key UNIQUE (code);
  END IF;
END$$;

-- 8. 팀 초대 링크 테이블 생성
CREATE TABLE IF NOT EXISTS core.team_invite_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'sales',
  label       TEXT,                     -- 링크 식별 이름 (선택)
  max_uses    INT,                      -- NULL = 무제한
  use_count   INT NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES core.users(id),
  expires_at  TIMESTAMPTZ,              -- NULL = 영구
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invite_links_tenant ON core.team_invite_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invite_links_token  ON core.team_invite_links(token);

-- RLS
ALTER TABLE core.team_invite_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_invite_links_tenant_isolation ON core.team_invite_links;
CREATE POLICY team_invite_links_tenant_isolation ON core.team_invite_links
  USING (tenant_id = public.fn_my_tenant_id());

-- 9. core.tenants에 signup_domain 컬럼 추가 (어느 앱으로 가입했는지 추적)
ALTER TABLE core.tenants ADD COLUMN IF NOT EXISTS signup_domain TEXT;
ALTER TABLE core.tenants ADD COLUMN IF NOT EXISTS signup_plan_code TEXT;
