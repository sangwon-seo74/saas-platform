-- ============================================================
-- Revenue Retention OS
-- Migration: RLS 정책 전체 적용 + pg_cron 스케줄 등록
-- schema.sql v0.2 이후 추가 마이그레이션
-- ============================================================

-- ============================================================
-- 1. RLS 정책 전체 적용
--    companies 외 나머지 도메인 테이블에도 동일 패턴 적용
-- ============================================================

-- ── contacts ─────────────────────────────────────────────
CREATE POLICY "contacts_tenant_isolation" ON contacts
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND fn_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "contacts_sales_own" ON contacts
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND fn_my_role() = 'sales'
    AND company_id IN (
      SELECT id FROM companies WHERE assigned_user_id = auth.uid()
    )
  );

-- ── contracts ────────────────────────────────────────────
CREATE POLICY "contracts_tenant_isolation" ON contracts
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND fn_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "contracts_sales_own" ON contracts
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND fn_my_role() = 'sales'
    AND assigned_user_id = auth.uid()
  );

-- ── renewals ─────────────────────────────────────────────
CREATE POLICY "renewals_tenant_isolation" ON renewals
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND fn_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "renewals_sales_own" ON renewals
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND fn_my_role() = 'sales'
    AND assigned_user_id = auth.uid()
  );

-- ── activities ───────────────────────────────────────────
CREATE POLICY "activities_tenant_isolation" ON activities
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND fn_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "activities_sales_own" ON activities
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND fn_my_role() = 'sales'
    AND user_id = auth.uid()
  );

-- ── tasks ────────────────────────────────────────────────
CREATE POLICY "tasks_tenant_isolation" ON tasks
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND fn_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "tasks_sales_own" ON tasks
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND fn_my_role() = 'sales'
    AND assigned_user_id = auth.uid()
  );

-- ── messages ─────────────────────────────────────────────
CREATE POLICY "messages_tenant_isolation" ON messages
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND fn_my_role() IN ('admin', 'manager')
  );

CREATE POLICY "messages_sales_own" ON messages
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND fn_my_role() = 'sales'
    AND user_id = auth.uid()
  );

-- ── message_templates (admin 전용 쓰기, 전체 읽기) ──────
CREATE POLICY "message_templates_read" ON message_templates
  FOR SELECT USING (tenant_id = fn_my_tenant_id());

CREATE POLICY "message_templates_write" ON message_templates
  FOR INSERT WITH CHECK (
    tenant_id = fn_my_tenant_id() AND fn_my_role() = 'admin'
  );

CREATE POLICY "message_templates_update" ON message_templates
  FOR UPDATE USING (
    tenant_id = fn_my_tenant_id() AND fn_my_role() = 'admin'
  );

CREATE POLICY "message_templates_delete" ON message_templates
  FOR DELETE USING (
    tenant_id = fn_my_tenant_id() AND fn_my_role() = 'admin'
  );

-- ── api_integrations (admin 전용) ────────────────────────
CREATE POLICY "api_integrations_admin" ON api_integrations
  FOR ALL USING (
    tenant_id = fn_my_tenant_id() AND fn_my_role() = 'admin'
  );

-- ── products (전체 읽기, admin 쓰기) ────────────────────
CREATE POLICY "products_read" ON products
  FOR SELECT USING (tenant_id = fn_my_tenant_id());

CREATE POLICY "products_write" ON products
  FOR INSERT WITH CHECK (
    tenant_id = fn_my_tenant_id() AND fn_my_role() = 'admin'
  );

CREATE POLICY "products_update" ON products
  FOR UPDATE USING (
    tenant_id = fn_my_tenant_id() AND fn_my_role() = 'admin'
  );

-- ── users (테넌트 내 전체 읽기, admin 쓰기) ─────────────
CREATE POLICY "users_read" ON users
  FOR SELECT USING (tenant_id = fn_my_tenant_id());

CREATE POLICY "users_write" ON users
  FOR INSERT WITH CHECK (
    tenant_id = fn_my_tenant_id() AND fn_my_role() = 'admin'
  );

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    tenant_id = fn_my_tenant_id()
    AND (fn_my_role() = 'admin' OR id = auth.uid())
  );

-- ── teams (전체 읽기, admin 쓰기) ────────────────────────
CREATE POLICY "teams_read" ON teams
  FOR SELECT USING (tenant_id = fn_my_tenant_id());

CREATE POLICY "teams_write" ON teams
  FOR ALL USING (
    tenant_id = fn_my_tenant_id() AND fn_my_role() = 'admin'
  );

-- ── tenant_subscriptions / invoices (admin 읽기) ────────
CREATE POLICY "tenant_subscriptions_admin" ON tenant_subscriptions
  FOR SELECT USING (
    tenant_id = fn_my_tenant_id() AND fn_my_role() = 'admin'
  );

CREATE POLICY "tenant_invoices_admin" ON tenant_invoices
  FOR SELECT USING (
    tenant_id = fn_my_tenant_id() AND fn_my_role() = 'admin'
  );

-- contract_accounts (계약과 동일 접근)
CREATE POLICY "contract_accounts_tenant" ON contract_accounts
  FOR ALL USING (
    tenant_id = fn_my_tenant_id()
    AND (
      fn_my_role() IN ('admin', 'manager')
      OR EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.id = contract_accounts.contract_id
          AND c.assigned_user_id = auth.uid()
      )
    )
  );


-- ============================================================
-- 2. pg_cron 스케줄 등록
--    Supabase 대시보드 > Database > Extensions 에서
--    pg_cron 활성화 필요
-- ============================================================

-- pg_cron 확장 (이미 활성화된 경우 무시됨)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── 갱신 위험도 매일 새벽 2시 업데이트 ─────────────────
SELECT cron.schedule(
  'refresh-renewal-risk',       -- job name
  '0 2 * * *',                  -- 매일 02:00 KST (= 17:00 UTC)
  $$CALL pr_refresh_renewal_risk()$$
);

-- ── 갱신 D-30/D-14/D-7 Task 매일 새벽 2시 30분 생성 ──
SELECT cron.schedule(
  'create-renewal-tasks',
  '30 2 * * *',                 -- 매일 02:30 KST (= 17:30 UTC)
  $$CALL pr_create_renewal_tasks()$$
);

-- ── 만료된 계약 상태 자동 변경 ──────────────────────────
SELECT cron.schedule(
  'expire-contracts',
  '0 1 * * *',                  -- 매일 01:00 KST (= 16:00 UTC)
  $$
    UPDATE contracts
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
      AND expires_at < CURRENT_DATE;
  $$
);

-- ── 스케줄 확인 쿼리 ────────────────────────────────────
-- SELECT * FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;


-- ============================================================
-- 3. Supabase Auth 트리거
--    신규 사용자 가입 시 users 테이블 자동 동기화
--    (초대 수락 후 Supabase Auth 계정 생성 시 트리거)
-- ============================================================

CREATE OR REPLACE FUNCTION fn_handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- app_metadata에 tenant_id, role이 있는 경우만 처리 (초대 플로우)
  IF NEW.raw_app_meta_data->>'tenant_id' IS NOT NULL THEN
    INSERT INTO public.users (
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
    ON CONFLICT (id) DO NOTHING;  -- 이미 존재하면 무시
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users INSERT 시 트리거
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_auth_user();

-- ── last_login_at 자동 갱신 ──────────────────────────────
CREATE OR REPLACE FUNCTION fn_update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.users
    SET last_login_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_update_last_login();
