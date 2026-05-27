-- 명함 이미지 저장 URL 컬럼 추가 (rros.contacts)
-- Supabase Storage 경로: rros-business-cards/{tenant_id}/{contact_id}.{ext}

ALTER TABLE rros.contacts
  ADD COLUMN IF NOT EXISTS business_card_url TEXT DEFAULT NULL;

COMMENT ON COLUMN rros.contacts.business_card_url
  IS 'Supabase Storage 내 명함 이미지 경로 (예: rros-business-cards/{tenant_id}/{contact_id}.jpg)';
