-- platform_settings: 플랫폼 전역 설정 (key-value)
-- 자격증명 포함. core-api service role만 접근. RLS 없음.
CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 기본 키 삽입 (이미 존재하면 무시)
INSERT INTO platform_settings (key, value) VALUES
  -- SMS (Solapi)
  ('solapi.api_key',       ''),
  ('solapi.api_secret',    ''),
  ('solapi.sender_phone',  ''),
  -- 카카오 알림톡 (Solapi ATA)
  ('kakao.sender_key',     ''),
  -- 이메일 (Resend)
  ('email.from_name',      'SaaS Platform'),
  ('email.from_email',     'noreply@saas-foundry.io')
ON CONFLICT (key) DO NOTHING;
