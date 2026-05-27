-- rros.message_templates: 카카오 알림톡 Solapi 템플릿 코드 컬럼 추가
-- 알림톡 발송 시 매번 수동 입력하지 않고 템플릿에 저장해 자동 주입
ALTER TABLE rros.message_templates
  ADD COLUMN IF NOT EXISTS kakao_template_code TEXT;
