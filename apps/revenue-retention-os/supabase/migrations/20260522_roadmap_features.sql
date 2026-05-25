-- ============================================================
-- Revenue Retention OS
-- Migration: 슈퍼어드민 로드맵 기능 통합 마이그레이션
-- ============================================================

-- ─── 1. tenants: 우선순위/태그/대상 사용자 이메일(자동 발행용) ───
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'standard',  -- vip / standard / risk
  ADD COLUMN IF NOT EXISTS tags     JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS tenants_priority ON tenants (priority);

-- ─── 2. tenant_notes: 슈퍼어드민의 자유 운영 메모 ───
CREATE TABLE IF NOT EXISTS tenant_notes (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content          TEXT        NOT NULL,
  created_by_email TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tenant_notes_tenant ON tenant_notes (tenant_id, created_at DESC);

-- ─── 3. usage_snapshots: 일별 사용량 스냅샷 ───
CREATE TABLE IF NOT EXISTS usage_snapshots (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  snapshot_date       DATE    NOT NULL,
  user_count          INT     DEFAULT 0,
  company_count       INT     DEFAULT 0,
  message_count       INT     DEFAULT 0,
  active_subscription BOOLEAN DEFAULT false,
  mrr                 NUMERIC DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS usage_snapshots_date ON usage_snapshots (snapshot_date DESC);

-- ─── 4. tenant_invoices: 크레딧/세금계산서/사용자 노출 메모 ───
ALTER TABLE tenant_invoices
  ADD COLUMN IF NOT EXISTS credit_amount      NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_invoice_status TEXT,                -- not_required / pending / issued
  ADD COLUMN IF NOT EXISTS tax_invoice_no     TEXT,
  ADD COLUMN IF NOT EXISTS public_memo        TEXT,                -- 일반 사용자에게도 노출되는 메모
  ADD COLUMN IF NOT EXISTS retry_count        INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at      TIMESTAMPTZ;

-- ─── 5. tenant_subscriptions: 무료→유료 전환 추적용 ───
ALTER TABLE tenant_subscriptions
  ADD COLUMN IF NOT EXISTS converted_from_trial_at TIMESTAMPTZ;

-- ─── 6. audit_logs: metadata에 슈퍼어드민 액션 기록 ───
-- (이미 metadata jsonb 존재. 스키마 변경 불필요)

-- ─── 7. cron 작업 등록 ───────────────────────────────

-- 매일 자정: 일별 사용량 스냅샷
SELECT cron.schedule(
  'daily-usage-snapshot',
  '0 0 * * *',
  $$
    INSERT INTO usage_snapshots (tenant_id, snapshot_date, user_count, company_count, message_count, active_subscription, mrr)
    SELECT
      t.id,
      CURRENT_DATE,
      COALESCE((SELECT COUNT(*) FROM users     WHERE tenant_id = t.id AND is_active = true), 0),
      COALESCE((SELECT COUNT(*) FROM companies WHERE tenant_id = t.id), 0),
      COALESCE((SELECT COUNT(*) FROM messages  WHERE tenant_id = t.id AND sent_at >= date_trunc('month', CURRENT_DATE)), 0),
      EXISTS (SELECT 1 FROM tenant_subscriptions WHERE tenant_id = t.id AND status IN ('active', 'trialing')),
      COALESCE((
        SELECT CASE WHEN ts.billing_cycle = 'yearly' THEN ROUND(p.yearly_price / 12.0) ELSE p.monthly_price END
        FROM tenant_subscriptions ts JOIN plans p ON p.id = ts.plan_id
        WHERE ts.tenant_id = t.id AND ts.status = 'active' LIMIT 1
      ), 0)
    FROM tenants t
    ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;
  $$
);

-- 6개월 비활성 사용자 자동 비활성화 (매일 새벽 2시)
SELECT cron.schedule(
  'deactivate-inactive-users',
  '0 2 * * *',
  $$
    UPDATE users
    SET is_active = false
    WHERE is_active = true
      AND last_login_at IS NOT NULL
      AND last_login_at < NOW() - INTERVAL '6 months'
  $$
);

-- 결제 실패 자동 재시도 (시간당 1회): retry_count < 3 이고 next_retry_at 도래
SELECT cron.schedule(
  'retry-failed-invoices',
  '0 * * * *',
  $$
    UPDATE tenant_invoices
    SET status = 'pending', next_retry_at = NULL, retry_count = retry_count + 1
    WHERE status = 'failed'
      AND retry_count < 3
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
  $$
);

-- 매월 1일: 활성 구독에 대한 인보이스 자동 발행
SELECT cron.schedule(
  'monthly-invoice-generation',
  '0 1 1 * *',  -- 매월 1일 01:00
  $$
    INSERT INTO tenant_invoices (
      tenant_id, subscription_id, plan_id, invoice_no, billing_cycle,
      period_start, period_end, amount, status, due_at
    )
    SELECT
      ts.tenant_id, ts.id, ts.plan_id,
      'INV-' || to_char(CURRENT_DATE, 'YYYY-MM') || '-' || lpad(row_number() OVER (ORDER BY ts.tenant_id)::text, 4, '0'),
      ts.billing_cycle,
      date_trunc('month', CURRENT_DATE),
      (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'),
      CASE WHEN ts.billing_cycle = 'yearly' THEN p.yearly_price ELSE p.monthly_price END,
      'pending',
      CURRENT_DATE + INTERVAL '10 days'
    FROM tenant_subscriptions ts
    JOIN plans p ON p.id = ts.plan_id
    WHERE ts.status = 'active'
      AND p.monthly_price > 0
      AND NOT EXISTS (
        SELECT 1 FROM tenant_invoices i
        WHERE i.subscription_id = ts.id
          AND date_trunc('month', i.period_start) = date_trunc('month', CURRENT_DATE)
      );
  $$
);
