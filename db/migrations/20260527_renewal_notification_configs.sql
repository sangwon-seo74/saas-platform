-- 테넌트별 갱신 자동 알림 설정
-- 갱신 만료 D-N일 전에 어떤 채널/템플릿으로 자동 발송할지 설정
CREATE TABLE IF NOT EXISTS rros.renewal_notification_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  days_before INT  NOT NULL,                  -- 몇 일 전 (예: 30, 14, 7)
  template_id UUID REFERENCES rros.message_templates(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, days_before)
);

-- RLS: admin만 읽기/쓰기
ALTER TABLE rros.renewal_notification_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY renewal_notif_cfg_admin ON rros.renewal_notification_configs
  USING (tenant_id = fn_my_tenant_id() AND fn_my_role() = 'admin')
  WITH CHECK (tenant_id = fn_my_tenant_id() AND fn_my_role() = 'admin');

-- 기본 3개 행 생성용 함수 대신 각 테넌트가 처음 설정 페이지 열 때 upsert로 생성
