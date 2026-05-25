-- ============================================================
-- Phase 1: DB 스키마 분리 + RLS 정책 재작성
-- 실행 환경: Supabase SQL Editor (superuser 권한)
-- 대상 DB: revenue-retention-os (PostgreSQL 15)
-- 작성일: 2026-05-25
--
-- 분리 전략:
--   core  : SaaS 플랫폼 공통 테이블 (11개)
--   rros  : revenue-retention-os 도메인 테이블 (11개)
--   public: 기존 앱 코드 호환을 위한 AUTO-UPDATABLE VIEW 유지
--
-- 실행 순서대로 트랜잭션 단위 구분:
--   BLOCK A: 스키마 생성 (idempotent)
--   BLOCK B: core 테이블 이동
--   BLOCK C: rros 테이블 이동
--   BLOCK D: public 호환 뷰 생성
--   BLOCK E: 저장 프로시저 업데이트
--   BLOCK F: pg_cron 작업 업데이트
-- ============================================================


-- ============================================================
-- BLOCK A: 스키마 생성
-- ============================================================

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS rros;


-- ============================================================
-- BLOCK B: core 스키마 테이블 이동
--   (FK 제약은 OID 기반이므로 이동 순서에 무관하게 유지됨)
--   논리 순서: 부모 테이블 → 자식 테이블
-- ============================================================

-- 최상위 부모 테이블
ALTER TABLE public.tenants              SET SCHEMA core;
ALTER TABLE public.plans                SET SCHEMA core;

-- tenants, plans 참조 테이블
ALTER TABLE public.users                SET SCHEMA core;
ALTER TABLE public.teams                SET SCHEMA core;
ALTER TABLE public.announcements        SET SCHEMA core;
ALTER TABLE public.tenant_notes         SET SCHEMA core;
ALTER TABLE public.usage_snapshots      SET SCHEMA core;
ALTER TABLE public.tenant_subscriptions SET SCHEMA core;

-- users, tenants 참조 테이블
ALTER TABLE public.invite_tokens        SET SCHEMA core;
ALTER TABLE public.audit_logs           SET SCHEMA core;

-- tenant_subscriptions 참조 테이블
ALTER TABLE public.tenant_invoices      SET SCHEMA core;


-- ============================================================
-- BLOCK C: rros 스키마 테이블 이동
--   (core 테이블 이동 완료 후 실행)
-- ============================================================

-- tenants 참조 (도메인 루트 테이블)
ALTER TABLE public.products             SET SCHEMA rros;
ALTER TABLE public.message_templates    SET SCHEMA rros;
ALTER TABLE public.api_integrations     SET SCHEMA rros;

-- products, users, tenants 참조
ALTER TABLE public.companies            SET SCHEMA rros;

-- companies 참조
ALTER TABLE public.contacts             SET SCHEMA rros;
ALTER TABLE public.activities           SET SCHEMA rros;
ALTER TABLE public.messages             SET SCHEMA rros;

-- companies, users 참조
ALTER TABLE public.contracts            SET SCHEMA rros;

-- contracts 참조
ALTER TABLE public.contract_accounts    SET SCHEMA rros;
ALTER TABLE public.renewals             SET SCHEMA rros;
ALTER TABLE public.tasks                SET SCHEMA rros;


-- ============================================================
-- BLOCK D: public 호환 뷰 생성
--   - 단순 SELECT * → PostgreSQL auto-updatable view
--   - INSERT / UPDATE / DELETE 모두 기반 테이블로 위임됨
--   - RLS는 기반 테이블(core.*, rros.*)에서 적용됨
--   - 기존 app 코드의 supabase.from('tablename') 호환 유지
-- ============================================================

-- ── core 테이블 뷰 ────────────────────────────────────────
CREATE VIEW public.tenants              AS SELECT * FROM core.tenants;
CREATE VIEW public.plans                AS SELECT * FROM core.plans;
CREATE VIEW public.users                AS SELECT * FROM core.users;
CREATE VIEW public.teams                AS SELECT * FROM core.teams;
CREATE VIEW public.announcements        AS SELECT * FROM core.announcements;
CREATE VIEW public.tenant_notes         AS SELECT * FROM core.tenant_notes;
CREATE VIEW public.usage_snapshots      AS SELECT * FROM core.usage_snapshots;
CREATE VIEW public.tenant_subscriptions AS SELECT * FROM core.tenant_subscriptions;
CREATE VIEW public.invite_tokens        AS SELECT * FROM core.invite_tokens;
CREATE VIEW public.audit_logs           AS SELECT * FROM core.audit_logs;
CREATE VIEW public.tenant_invoices      AS SELECT * FROM core.tenant_invoices;

-- ── rros 테이블 뷰 ────────────────────────────────────────
CREATE VIEW public.products             AS SELECT * FROM rros.products;
CREATE VIEW public.message_templates    AS SELECT * FROM rros.message_templates;
CREATE VIEW public.api_integrations     AS SELECT * FROM rros.api_integrations;
CREATE VIEW public.companies            AS SELECT * FROM rros.companies;
CREATE VIEW public.contacts             AS SELECT * FROM rros.contacts;
CREATE VIEW public.activities           AS SELECT * FROM rros.activities;
CREATE VIEW public.messages             AS SELECT * FROM rros.messages;
CREATE VIEW public.contracts            AS SELECT * FROM rros.contracts;
CREATE VIEW public.contract_accounts    AS SELECT * FROM rros.contract_accounts;
CREATE VIEW public.renewals             AS SELECT * FROM rros.renewals;
CREATE VIEW public.tasks                AS SELECT * FROM rros.tasks;


-- ============================================================
-- BLOCK E: 저장 프로시저 업데이트
--   fn_handle_new_auth_user: auth.users INSERT 트리거
--   fn_update_last_login:    auth.users UPDATE 트리거
--
--   변경 내용:
--   - INSERT/UPDATE 대상을 core.users로 명시
--   - SET search_path 추가 (SECURITY DEFINER 함수 보안 강화)
-- ============================================================

CREATE OR REPLACE FUNCTION fn_handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_app_meta_data->>'tenant_id' IS NOT NULL THEN
    INSERT INTO core.users (
      id,
      tenant_id,
      email,
      name,
      role,
      is_active
    ) VALUES (
      NEW.id,
      (NEW.raw_app_meta_data->>'tenant_id')::UUID,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_app_meta_data->>'role', 'sales'),
      true
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, core, rros;


CREATE OR REPLACE FUNCTION fn_update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE core.users
    SET last_login_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, core, rros;


-- ============================================================
-- BLOCK F: pg_cron 작업 업데이트
--   직접 SQL을 실행하는 4개 job의 테이블 참조를 스키마 한정으로 변경
--   프로시저 호출 job(refresh-renewal-risk, create-renewal-tasks)은
--   해당 프로시저 자체의 search_path 설정 시 별도 처리
-- ============================================================

-- ── expire-contracts ──────────────────────────────────────
SELECT cron.unschedule('expire-contracts');
SELECT cron.schedule(
  'expire-contracts',
  '0 1 * * *',
  $$
    UPDATE rros.contracts
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
      AND expires_at < CURRENT_DATE;
  $$
);

-- ── deactivate-inactive-users ─────────────────────────────
SELECT cron.unschedule('deactivate-inactive-users');
SELECT cron.schedule(
  'deactivate-inactive-users',
  '0 2 * * *',
  $$
    UPDATE core.users
    SET is_active = false
    WHERE is_active = true
      AND last_login_at IS NOT NULL
      AND last_login_at < NOW() - INTERVAL '6 months'
  $$
);

-- ── retry-failed-invoices ─────────────────────────────────
SELECT cron.unschedule('retry-failed-invoices');
SELECT cron.schedule(
  'retry-failed-invoices',
  '0 * * * *',
  $$
    UPDATE core.tenant_invoices
    SET status = 'pending', next_retry_at = NULL, retry_count = retry_count + 1
    WHERE status = 'failed'
      AND retry_count < 3
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
  $$
);

-- ── daily-usage-snapshot ──────────────────────────────────
SELECT cron.unschedule('daily-usage-snapshot');
SELECT cron.schedule(
  'daily-usage-snapshot',
  '0 0 * * *',
  $$
    INSERT INTO core.usage_snapshots (
      tenant_id, snapshot_date,
      user_count, company_count, message_count,
      active_subscription, mrr
    )
    SELECT
      t.id,
      CURRENT_DATE,
      COALESCE((SELECT COUNT(*) FROM core.users        WHERE tenant_id = t.id AND is_active = true), 0),
      COALESCE((SELECT COUNT(*) FROM rros.companies    WHERE tenant_id = t.id), 0),
      COALESCE((SELECT COUNT(*) FROM rros.messages     WHERE tenant_id = t.id
                  AND sent_at >= date_trunc('month', CURRENT_DATE)), 0),
      EXISTS (SELECT 1 FROM core.tenant_subscriptions  WHERE tenant_id = t.id
                AND status IN ('active', 'trialing')),
      COALESCE((
        SELECT CASE
          WHEN ts.billing_cycle = 'yearly' THEN ROUND(p.yearly_price / 12.0)
          ELSE p.monthly_price
        END
        FROM core.tenant_subscriptions ts
        JOIN core.plans p ON p.id = ts.plan_id
        WHERE ts.tenant_id = t.id AND ts.status = 'active'
        LIMIT 1
      ), 0)
    FROM core.tenants t
    ON CONFLICT (tenant_id, snapshot_date) DO NOTHING;
  $$
);

-- ── cleanup-expired-invite-tokens ────────────────────────
SELECT cron.unschedule('cleanup-expired-invite-tokens');
SELECT cron.schedule(
  'cleanup-expired-invite-tokens',
  '0 3 * * *',
  $$DELETE FROM core.invite_tokens WHERE expires_at < NOW()$$
);

-- ── cleanup-old-audit-logs ────────────────────────────────
SELECT cron.unschedule('cleanup-old-audit-logs');
SELECT cron.schedule(
  'cleanup-old-audit-logs',
  '0 4 * * *',
  $$DELETE FROM core.audit_logs WHERE created_at < NOW() - INTERVAL '6 months'$$
);

-- ── monthly-invoice-generation ────────────────────────────
SELECT cron.unschedule('monthly-invoice-generation');
SELECT cron.schedule(
  'monthly-invoice-generation',
  '0 1 1 * *',
  $$
    INSERT INTO core.tenant_invoices (
      tenant_id, subscription_id, plan_id, invoice_no, billing_cycle,
      period_start, period_end, amount, status, due_at
    )
    SELECT
      ts.tenant_id, ts.id, ts.plan_id,
      'INV-' || to_char(CURRENT_DATE, 'YYYY-MM') || '-'
        || lpad(row_number() OVER (ORDER BY ts.tenant_id)::text, 4, '0'),
      ts.billing_cycle,
      date_trunc('month', CURRENT_DATE),
      (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'),
      CASE WHEN ts.billing_cycle = 'yearly' THEN p.yearly_price ELSE p.monthly_price END,
      'pending',
      CURRENT_DATE + INTERVAL '10 days'
    FROM core.tenant_subscriptions ts
    JOIN core.plans p ON p.id = ts.plan_id
    WHERE ts.status = 'active'
      AND p.monthly_price > 0
      AND NOT EXISTS (
        SELECT 1 FROM core.tenant_invoices i
        WHERE i.subscription_id = ts.id
          AND date_trunc('month', i.period_start) = date_trunc('month', CURRENT_DATE)
      );
  $$
);


-- ============================================================
-- 검증 쿼리 (실행 후 결과 확인)
-- ============================================================

-- 1. 스키마별 테이블 분포 확인
SELECT table_schema, COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema IN ('core', 'rros', 'public')
  AND table_type = 'BASE TABLE'
GROUP BY table_schema
ORDER BY table_schema;

-- 2. public 뷰 자동 업데이트 가능 여부 확인 (is_updatable = YES 이어야 함)
SELECT table_name, is_updatable
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. pg_cron 작업 목록 확인
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
