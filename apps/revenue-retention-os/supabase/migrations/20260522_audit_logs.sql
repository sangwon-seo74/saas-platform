-- ============================================================
-- Revenue Retention OS
-- Migration: audit_logs 테이블 — 사용자 접속/액션 감사 로그
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID        REFERENCES tenants(id) ON DELETE SET NULL,
  user_id     UUID        REFERENCES users(id)   ON DELETE SET NULL,
  email       TEXT,
  action      TEXT        NOT NULL,                    -- login, logout, settings_change, data_export 등
  ip          TEXT,
  user_agent  TEXT,
  result      TEXT        NOT NULL DEFAULT 'success',  -- success, fail
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_id  ON audit_logs (tenant_id);
CREATE INDEX IF NOT EXISTS audit_logs_email      ON audit_logs (email);
CREATE INDEX IF NOT EXISTS audit_logs_action     ON audit_logs (action);

-- 6개월 이상 된 로그 자동 정리 (매일 새벽 4시)
SELECT cron.schedule(
  'cleanup-old-audit-logs',
  '0 4 * * *',
  $$DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '6 months'$$
);
