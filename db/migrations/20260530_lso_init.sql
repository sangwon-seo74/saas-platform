-- ============================================================
-- liquor-sales-os (lso) 도메인 초기 스키마
-- 실행: Supabase SQL Editor에서 한 번 실행
-- 선행 조건: core 스키마, core.users, core.tenants 존재
-- ============================================================

CREATE SCHEMA IF NOT EXISTS lso;

-- ─── 1. clients ──────────────────────────────────────────────
CREATE TABLE lso.clients (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  name           text NOT NULL,
  client_type    text NOT NULL DEFAULT 'other'
                   CHECK (client_type IN ('restaurant','bar','wholesale','retail','other')),
  biz_no         text,
  owner_name     text,
  phone          text,
  mobile         text,
  address        text,
  address_detail text,
  lat            double precision,
  lng            double precision,
  region         text,
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','inactive','suspended')),
  notes          text,
  last_visited_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON lso.clients (tenant_id, status);
CREATE INDEX ON lso.clients (tenant_id, lat, lng);

-- ─── 2. products ─────────────────────────────────────────────
CREATE TABLE lso.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  category    text,
  unit        text NOT NULL DEFAULT '병',
  price       numeric(12,2),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON lso.products (tenant_id, is_active);

-- ─── 3. sales_assignments ────────────────────────────────────
CREATE TABLE lso.sales_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  rep_user_id  uuid NOT NULL REFERENCES core.users(id)   ON DELETE CASCADE,
  client_id    uuid NOT NULL REFERENCES lso.clients(id)  ON DELETE CASCADE,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  assigned_by  uuid REFERENCES core.users(id),
  is_active    boolean NOT NULL DEFAULT true,
  UNIQUE (tenant_id, rep_user_id, client_id)
);

CREATE INDEX ON lso.sales_assignments (tenant_id, rep_user_id) WHERE is_active;
CREATE INDEX ON lso.sales_assignments (tenant_id, client_id)   WHERE is_active;

-- ─── 4. visits ───────────────────────────────────────────────
CREATE TABLE lso.visits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  client_id    uuid NOT NULL REFERENCES lso.clients(id)  ON DELETE CASCADE,
  rep_user_id  uuid NOT NULL REFERENCES core.users(id)   ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'checked_in'
                 CHECK (status IN ('planned','checked_in','completed','cancelled')),
  visit_type   text NOT NULL DEFAULT 'sales'
                 CHECK (visit_type IN ('sales','delivery','collection','other')),
  purpose      text,
  result       text,
  check_in_at  timestamptz,
  check_out_at timestamptz,
  lat          double precision,
  lng          double precision,
  photos       text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON lso.visits (tenant_id, rep_user_id, check_in_at DESC);
CREATE INDEX ON lso.visits (tenant_id, client_id,   check_in_at DESC);
CREATE INDEX ON lso.visits (tenant_id, status);

-- ─── 5. visit_items ──────────────────────────────────────────
CREATE TABLE lso.visit_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     uuid NOT NULL REFERENCES lso.visits(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES lso.products(id),
  product_name text NOT NULL,
  quantity     integer NOT NULL DEFAULT 1,
  unit_price   numeric(12,2),
  memo         text
);

CREATE INDEX ON lso.visit_items (visit_id);

-- ─── 6. orders ───────────────────────────────────────────────
CREATE TABLE lso.orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
  visit_id     uuid REFERENCES lso.visits(id),
  client_id    uuid NOT NULL REFERENCES lso.clients(id)  ON DELETE CASCADE,
  rep_user_id  uuid NOT NULL REFERENCES core.users(id)   ON DELETE CASCADE,
  order_no     text,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','delivered','cancelled')),
  total_amount numeric(12,2),
  ordered_at   timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  notes        text
);

CREATE INDEX ON lso.orders (tenant_id, status);
CREATE INDEX ON lso.orders (tenant_id, client_id);

-- ─── 7. rep_locations ────────────────────────────────────────
CREATE TABLE lso.rep_locations (
  rep_user_id uuid PRIMARY KEY REFERENCES core.users(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES core.tenants(id)  ON DELETE CASCADE,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  accuracy    double precision,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON lso.rep_locations (tenant_id);

-- ─── 트리거: visits → clients.last_visited_at ────────────────
CREATE OR REPLACE FUNCTION lso.trg_update_client_last_visited()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.check_in_at IS NOT NULL THEN
    UPDATE lso.clients
       SET last_visited_at = NEW.check_in_at,
           updated_at      = now()
     WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_client_last_visited
AFTER INSERT OR UPDATE OF status, check_in_at ON lso.visits
FOR EACH ROW
WHEN (NEW.status IN ('checked_in', 'completed') AND NEW.check_in_at IS NOT NULL)
EXECUTE FUNCTION lso.trg_update_client_last_visited();

-- ─── RLS 활성화 ──────────────────────────────────────────────
ALTER TABLE lso.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lso.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lso.sales_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lso.visits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lso.visit_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lso.orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lso.rep_locations    ENABLE ROW LEVEL SECURITY;

-- ─── RLS 정책: clients ───────────────────────────────────────
-- admin/manager: 테넌트 내 전체
-- rep: 자기 배정 거래처만
CREATE POLICY "clients_select" ON lso.clients
  FOR SELECT USING (
    tenant_id = core.fn_my_tenant_id()
    AND (
      core.fn_my_role() IN ('admin','manager')
      OR EXISTS (
        SELECT 1 FROM lso.sales_assignments sa
         WHERE sa.client_id = lso.clients.id
           AND sa.rep_user_id = auth.uid()
           AND sa.is_active = true
      )
    )
  );

CREATE POLICY "clients_write" ON lso.clients
  FOR ALL USING (
    tenant_id = core.fn_my_tenant_id()
    AND core.fn_my_role() IN ('admin','manager')
  );

-- ─── RLS 정책: sales_assignments ─────────────────────────────
CREATE POLICY "assignments_select" ON lso.sales_assignments
  FOR SELECT USING (tenant_id = core.fn_my_tenant_id());

CREATE POLICY "assignments_write" ON lso.sales_assignments
  FOR ALL USING (
    tenant_id = core.fn_my_tenant_id()
    AND core.fn_my_role() IN ('admin','manager')
  );

-- ─── RLS 정책: visits ─────────────────────────────────────────
CREATE POLICY "visits_select" ON lso.visits
  FOR SELECT USING (
    tenant_id = core.fn_my_tenant_id()
    AND (
      core.fn_my_role() IN ('admin','manager')
      OR rep_user_id = auth.uid()
    )
  );

CREATE POLICY "visits_insert" ON lso.visits
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_my_tenant_id()
    AND rep_user_id = auth.uid()
  );

CREATE POLICY "visits_update" ON lso.visits
  FOR UPDATE USING (
    tenant_id = core.fn_my_tenant_id()
    AND (core.fn_my_role() IN ('admin','manager') OR rep_user_id = auth.uid())
  );

-- ─── RLS 정책: visit_items ───────────────────────────────────
CREATE POLICY "visit_items_select" ON lso.visit_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lso.visits v
       WHERE v.id = lso.visit_items.visit_id
         AND v.tenant_id = core.fn_my_tenant_id()
         AND (core.fn_my_role() IN ('admin','manager') OR v.rep_user_id = auth.uid())
    )
  );

CREATE POLICY "visit_items_insert" ON lso.visit_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM lso.visits v
       WHERE v.id = lso.visit_items.visit_id
         AND v.tenant_id = core.fn_my_tenant_id()
         AND v.rep_user_id = auth.uid()
    )
  );

-- ─── RLS 정책: products ──────────────────────────────────────
CREATE POLICY "products_select" ON lso.products
  FOR SELECT USING (tenant_id = core.fn_my_tenant_id());

CREATE POLICY "products_write" ON lso.products
  FOR ALL USING (
    tenant_id = core.fn_my_tenant_id()
    AND core.fn_my_role() = 'admin'
  );

-- ─── RLS 정책: rep_locations ──────────────────────────────────
CREATE POLICY "rep_locations_select" ON lso.rep_locations
  FOR SELECT USING (
    tenant_id = core.fn_my_tenant_id()
    AND (core.fn_my_role() IN ('admin','manager') OR rep_user_id = auth.uid())
  );

CREATE POLICY "rep_locations_upsert" ON lso.rep_locations
  FOR ALL USING (
    tenant_id = core.fn_my_tenant_id()
    AND rep_user_id = auth.uid()
  );

-- ─── RLS 정책: orders ─────────────────────────────────────────
CREATE POLICY "orders_select" ON lso.orders
  FOR SELECT USING (
    tenant_id = core.fn_my_tenant_id()
    AND (core.fn_my_role() IN ('admin','manager') OR rep_user_id = auth.uid())
  );

CREATE POLICY "orders_insert" ON lso.orders
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_my_tenant_id()
    AND rep_user_id = auth.uid()
  );

CREATE POLICY "orders_update" ON lso.orders
  FOR UPDATE USING (
    tenant_id = core.fn_my_tenant_id()
    AND core.fn_my_role() IN ('admin','manager')
  );
