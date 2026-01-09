-- ================================================================
-- 테이블 구조 확인 쿼리
-- 이 쿼리를 Supabase SQL Editor에서 실행하여 현재 상태를 확인하세요
-- ================================================================

-- 1. 현재 존재하는 테이블 목록 확인
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('message_templates', 'schedules', 'schedule_executions')
ORDER BY table_name;

-- 2. message_templates 테이블의 컬럼 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'message_templates'
ORDER BY ordinal_position;

-- 3. schedules 테이블의 컬럼 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;

-- 4. schedule_executions 테이블의 컬럼 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'schedule_executions'
ORDER BY ordinal_position;
