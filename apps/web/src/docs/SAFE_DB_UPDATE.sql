-- ================================================================
-- 고양 스마트시티 전광판 시스템 - 안전한 DB 업데이트
-- 기존 테이블 구조를 유지하면서 필요한 컬럼만 추가
-- ================================================================

-- ================================================================
-- STEP 1: schedules 테이블에 필요한 컬럼 추가
-- ================================================================

-- name 컬럼 추가 (스케줄 이름)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'name'
  ) THEN
    ALTER TABLE schedules ADD COLUMN name TEXT;
    RAISE NOTICE '✅ Added name column to schedules';
  ELSE
    RAISE NOTICE 'ℹ️  name column already exists in schedules';
  END IF;
END $$;

-- is_active 컬럼 추가 (활성화 상태)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE schedules ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    RAISE NOTICE '✅ Added is_active column to schedules';
  ELSE
    RAISE NOTICE 'ℹ️  is_active column already exists in schedules';
  END IF;
END $$;

-- last_executed_at 컬럼 추가 (마지막 실행 시간)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'last_executed_at'
  ) THEN
    ALTER TABLE schedules ADD COLUMN last_executed_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added last_executed_at column to schedules';
  ELSE
    RAISE NOTICE 'ℹ️  last_executed_at column already exists in schedules';
  END IF;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_schedules_is_active ON schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedules_priority ON schedules(priority);

-- ================================================================
-- STEP 2: schedule_executions 테이블 생성 (실행 이력)
-- ================================================================

CREATE TABLE IF NOT EXISTS schedule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL,
  template_id UUID,
  executed_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Foreign Key to schedules
  CONSTRAINT fk_schedule_execution
    FOREIGN KEY (schedule_id)
    REFERENCES schedules(id)
    ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_schedule_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_executed_at ON schedule_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_status ON schedule_executions(status);

COMMENT ON TABLE schedule_executions IS '스케줄 실행 이력';

-- ================================================================
-- STEP 3: 최종 확인
-- ================================================================

-- schedules 테이블 구조 확인
SELECT 
  '✅ schedules columns' as check_type,
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;

-- schedule_executions 테이블 확인
SELECT 
  '✅ schedule_executions table' as check_type,
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'schedule_executions'
ORDER BY ordinal_position;

-- 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 안전한 DB 업데이트 완료!';
  RAISE NOTICE '   - schedules 테이블: name, is_active, last_executed_at 추가';
  RAISE NOTICE '   - schedule_executions 테이블: 생성';
  RAISE NOTICE '   - 기존 데이터 보존됨';
  RAISE NOTICE '========================================';
END $$;
