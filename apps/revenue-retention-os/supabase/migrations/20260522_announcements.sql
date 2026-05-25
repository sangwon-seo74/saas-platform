-- ============================================================
-- Revenue Retention OS
-- Migration: announcements 테이블 — 시스템 공지/점검/업데이트
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  type        TEXT        NOT NULL,                      -- notice, maintenance, update
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,         -- 운영자가 명시적으로 비활성화 가능
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ,                               -- null이면 무기한
  created_by  UUID,                                      -- 슈퍼관리자(users 외부 사용자)이므로 FK 미설정
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS announcements_active  ON announcements (is_active, starts_at DESC);
CREATE INDEX IF NOT EXISTS announcements_period  ON announcements (starts_at, ends_at);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION fn_announcements_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON announcements;
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION fn_announcements_set_updated_at();
