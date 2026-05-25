-- ============================================================
-- DB Inventory: public 스키마 테이블 + RLS 정책 덤프
-- 실행 방법: Supabase 대시보드 > SQL Editor > 실행 후 결과를 docs/migration/inventory.md에 붙여넣기
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. public 스키마 테이블 목록
--    테이블명 / 유형 / 컬럼 수 / RLS 활성화 여부
-- ────────────────────────────────────────────────────────────
SELECT
  t.table_name,
  t.table_type,
  (
    SELECT COUNT(*)
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = t.table_name
  ) AS column_count,
  obj.relrowsecurity      AS rls_enabled,
  obj.relforcerowsecurity AS rls_forced
FROM information_schema.tables t
JOIN pg_class obj
  ON obj.relname = t.table_name
  AND obj.relnamespace = (
    SELECT oid FROM pg_namespace WHERE nspname = 'public'
  )
WHERE t.table_schema = 'public'
  AND t.table_type IN ('BASE TABLE', 'VIEW')
ORDER BY t.table_name;


-- ────────────────────────────────────────────────────────────
-- 2. RLS 정책 목록
--    테이블 / 정책명 / permissive 여부 / 적용 역할 / 커맨드 / using / with_check
-- ────────────────────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual       AS using_expr,
  with_check AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ────────────────────────────────────────────────────────────
-- 3. 테이블별 row 건수 (데이터가 있는 테이블 우선 확인용)
-- ────────────────────────────────────────────────────────────
SELECT
  relname          AS table_name,
  n_live_tup       AS estimated_row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;


-- ────────────────────────────────────────────────────────────
-- 4. 외래 키 목록 (마이그레이션 순서 결정용)
-- ────────────────────────────────────────────────────────────
SELECT
  tc.table_name          AS from_table,
  kcu.column_name        AS from_column,
  ccu.table_name         AS to_table,
  ccu.column_name        AS to_column,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema   = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;


-- ────────────────────────────────────────────────────────────
-- 5. DB 함수 목록 (RLS 정책에서 사용하는 helper 포함)
-- ────────────────────────────────────────────────────────────
SELECT
  routine_name,
  routine_type,
  security_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;


-- ────────────────────────────────────────────────────────────
-- 6. pg_cron 등록 작업 확인 (pg_cron 확장이 활성화된 경우)
-- ────────────────────────────────────────────────────────────
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
ORDER BY jobname;
