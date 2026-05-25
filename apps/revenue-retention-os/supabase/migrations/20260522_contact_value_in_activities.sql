-- ============================================================
-- activities.contact_value
-- 활동(통화/이메일) 발생 시 실제 사용된 연락처 값(전화번호 또는 이메일)을 보존.
-- contact_id가 가리키는 담당자 정보가 이후 변경/삭제되어도 당시 사용 값은 남도록 한다.
-- ============================================================

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS contact_value text;

COMMENT ON COLUMN activities.contact_value IS
  '활동에서 실제 사용된 담당자 연락처 (call=전화번호, email=이메일). 당시 시점 보존.';
