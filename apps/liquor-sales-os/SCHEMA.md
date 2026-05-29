# liquor-sales-os DB 스키마 (lso)

> 이 파일이 lso 도메인 스키마의 SSOT다. 마이그레이션 파일(`db/migrations/20260530_lso_init.sql`)과
> 항상 동기화한다.

## 스키마 개요

```
lso
├── clients           — 거래처 (주류 판매처)
├── products          — 주류 제품 목록
├── sales_assignments — 영업담당자 ↔ 거래처 배정
├── visits            — 방문 기록 (체크인 로그)
├── visit_items       — 방문 시 상담·주문 내역
├── orders            — 발주 내역
└── rep_locations     — 영업담당자 마지막 위치
```

공통 스키마 참조:
- `core.users` — 사용자 (auth.users 미러)
- `core.tenants` — 테넌트

---

## 테이블 정의

### lso.clients — 거래처

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK default gen_random_uuid() | |
| tenant_id | uuid NOT NULL FK core.tenants | 테넌트 격리 |
| name | text NOT NULL | 업체명 |
| client_type | text NOT NULL DEFAULT 'other' | restaurant/bar/wholesale/retail/other |
| biz_no | text | 사업자등록번호 (중복 감지 soft key) |
| owner_name | text | 대표자명 |
| phone | text | 대표 전화 |
| mobile | text | 담당자 휴대폰 |
| address | text | 주소 |
| address_detail | text | 상세주소 |
| lat | double precision | GPS 위도 |
| lng | double precision | GPS 경도 |
| region | text | 지역 (시/구 단위, 필터용) |
| status | text NOT NULL DEFAULT 'active' | active/inactive/suspended |
| notes | text | 메모 |
| last_visited_at | timestamptz | 마지막 방문일 (트리거 갱신) |
| created_at | timestamptz NOT NULL DEFAULT now() | |
| updated_at | timestamptz NOT NULL DEFAULT now() | |

RLS:
- SELECT: 같은 tenant_id + (admin/manager: 전체, rep: sales_assignments에서 본인 배정된 것만)
- INSERT/UPDATE/DELETE: admin/manager only

---

### lso.products — 제품

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| tenant_id | uuid NOT NULL FK core.tenants | |
| name | text NOT NULL | 제품명 (예: 참이슬 360ml) |
| category | text | 소주/맥주/와인/막걸리/기타 |
| unit | text NOT NULL DEFAULT '병' | 단위 |
| price | numeric(12,2) | 단가 |
| is_active | boolean NOT NULL DEFAULT true | |
| created_at | timestamptz NOT NULL DEFAULT now() | |

RLS: 같은 tenant_id. INSERT/UPDATE/DELETE: admin only.

---

### lso.sales_assignments — 담당 배정

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| tenant_id | uuid NOT NULL FK core.tenants | |
| rep_user_id | uuid NOT NULL FK core.users | 영업담당자 |
| client_id | uuid NOT NULL FK lso.clients | 담당 거래처 |
| assigned_at | timestamptz NOT NULL DEFAULT now() | |
| assigned_by | uuid FK core.users | 배정한 관리자 |
| is_active | boolean NOT NULL DEFAULT true | |
| UNIQUE (tenant_id, rep_user_id, client_id) | | |

RLS: 같은 tenant_id. INSERT/UPDATE: admin/manager. SELECT: 전체(본인 포함).

---

### lso.visits — 방문 기록

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| tenant_id | uuid NOT NULL FK core.tenants | |
| client_id | uuid NOT NULL FK lso.clients | |
| rep_user_id | uuid NOT NULL FK core.users | 방문한 영업담당자 |
| status | text NOT NULL DEFAULT 'checked_in' | planned/checked_in/completed/cancelled |
| visit_type | text NOT NULL DEFAULT 'sales' | sales(영업)/delivery(배송)/collection(수금)/other |
| purpose | text | 방문 목적 메모 |
| result | text | 상담 결과 메모 |
| check_in_at | timestamptz | 체크인 시각 |
| check_out_at | timestamptz | 체크아웃 시각 |
| lat | double precision | 체크인 GPS 위도 |
| lng | double precision | 체크인 GPS 경도 |
| photos | text[] | 사진 스토리지 경로 배열 |
| created_at | timestamptz NOT NULL DEFAULT now() | |
| updated_at | timestamptz NOT NULL DEFAULT now() | |

RLS:
- SELECT: 같은 tenant_id + (admin/manager: 전체, rep: rep_user_id = auth.uid())
- INSERT: rep 본인 (자기 방문만 생성)
- UPDATE: rep 본인(status, result 수정) + admin/manager(전체)

---

### lso.visit_items — 방문 상담·주문 내역

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| visit_id | uuid NOT NULL FK lso.visits | |
| product_id | uuid FK lso.products | null = 직접 입력 품목 |
| product_name | text NOT NULL | 제품명 (비정형 입력 허용) |
| quantity | integer NOT NULL DEFAULT 1 | 수량 |
| unit_price | numeric(12,2) | 단가 |
| total_price | numeric(12,2) GENERATED AS (quantity * unit_price) | |
| memo | text | 비고 |

RLS: visits 테이블과 동일 정책 (visits JOIN).

---

### lso.orders — 발주

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| tenant_id | uuid NOT NULL FK core.tenants | |
| visit_id | uuid FK lso.visits | 연결된 방문 (nullable) |
| client_id | uuid NOT NULL FK lso.clients | |
| rep_user_id | uuid NOT NULL FK core.users | |
| order_no | text | 발주 번호 (자동 생성) |
| status | text NOT NULL DEFAULT 'pending' | pending/confirmed/delivered/cancelled |
| total_amount | numeric(12,2) | 총금액 |
| ordered_at | timestamptz NOT NULL DEFAULT now() | |
| delivered_at | timestamptz | |
| notes | text | |

RLS: visits와 동일 패턴.

---

### lso.rep_locations — 담당자 위치

| 컬럼 | 타입 | 설명 |
|------|------|------|
| rep_user_id | uuid PK FK core.users | |
| tenant_id | uuid NOT NULL FK core.tenants | |
| lat | double precision NOT NULL | |
| lng | double precision NOT NULL | |
| accuracy | double precision | GPS 정확도(m) |
| updated_at | timestamptz NOT NULL DEFAULT now() | |

RLS: SELECT admin/manager only (또는 본인). UPSERT: rep 본인만.

---

## 트리거

```sql
-- visits INSERT/UPDATE 후 clients.last_visited_at 갱신
CREATE OR REPLACE FUNCTION lso.trg_update_client_last_visited()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE lso.clients SET last_visited_at = NEW.check_in_at, updated_at = now()
  WHERE id = NEW.client_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_client_last_visited
AFTER INSERT OR UPDATE OF status ON lso.visits
FOR EACH ROW WHEN (NEW.status = 'checked_in' OR NEW.status = 'completed')
EXECUTE FUNCTION lso.trg_update_client_last_visited();
```

## RLS 공통 함수 (core 스키마 재사용)

```sql
-- fn_my_tenant_id(): 현재 사용자의 tenant_id 반환 (core 스키마)
-- fn_my_role(): 현재 사용자의 role 반환 (core 스키마)
```

## 인덱스 주요 항목

```sql
CREATE INDEX ON lso.clients (tenant_id, status);
CREATE INDEX ON lso.clients (tenant_id, lat, lng);   -- 지도 쿼리용
CREATE INDEX ON lso.visits (tenant_id, rep_user_id, check_in_at DESC);
CREATE INDEX ON lso.visits (tenant_id, client_id, check_in_at DESC);
CREATE INDEX ON lso.sales_assignments (tenant_id, rep_user_id) WHERE is_active;
CREATE INDEX ON lso.rep_locations (tenant_id);
```
