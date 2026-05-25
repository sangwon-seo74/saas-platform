-- ============================================================
-- Revenue Retention OS
-- Migration: tenants 테이블 추가 컬럼 (idempotent)
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ceo_name TEXT,
  ADD COLUMN IF NOT EXISTS email    TEXT,
  ADD COLUMN IF NOT EXISTS phone    TEXT,
  ADD COLUMN IF NOT EXISTS address  TEXT;
