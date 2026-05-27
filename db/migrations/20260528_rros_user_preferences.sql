-- ============================================================
-- rros.user_preferences — 사용자별 데이터 조회 범위 설정
-- view_scope: 'own' (본인 담당만) | 'all' (전체)
-- ============================================================

CREATE TABLE IF NOT EXISTS rros.user_preferences (
  user_id    UUID        NOT NULL PRIMARY KEY,
  view_scope TEXT        NOT NULL DEFAULT 'own'
               CHECK (view_scope IN ('own', 'all')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: admin/manager만 전체 관리, 본인은 자기 행 읽기
ALTER TABLE rros.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences_admin_manage"
  ON rros.user_preferences
  FOR ALL
  TO authenticated
  USING (
    fn_my_role() IN ('admin', 'manager')
    AND EXISTS (
      SELECT 1 FROM core.users
      WHERE id = user_preferences.user_id
        AND tenant_id = fn_my_tenant_id()
    )
  );

CREATE POLICY "user_preferences_own_read"
  ON rros.user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
