-- ============================================================
-- Revenue Retention OS
-- Migration: invite_tokens 테이블 — 초대 토큰 DB 저장/무효화
-- ============================================================

CREATE TABLE IF NOT EXISTS invite_tokens (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  token      TEXT        NOT NULL UNIQUE,
  email      TEXT        NOT NULL,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL,
  invited_by UUID        REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invite_tokens_email_tenant ON invite_tokens (email, tenant_id);
CREATE INDEX IF NOT EXISTS invite_tokens_expires_at   ON invite_tokens (expires_at);

-- 만료된 토큰 자동 정리 (매일 새벽 3시)
SELECT cron.schedule(
  'cleanup-expired-invite-tokens',
  '0 3 * * *',
  $$DELETE FROM invite_tokens WHERE expires_at < NOW()$$
);
