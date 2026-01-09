-- ================================================================
-- 고양 스마트시티 전광판 시스템 - 단계별 테이블 설정
-- 에러가 발생하면 이 파일을 사용하세요!
-- ================================================================

-- ================================================================
-- STEP 1: message_templates 테이블 확인 및 생성
-- ================================================================

-- 먼저 테이블이 존재하는지 확인
DO $$ 
BEGIN
  -- 테이블이 없으면 생성
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'message_templates') THEN
    CREATE TABLE message_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    RAISE NOTICE 'Created message_templates table';
  ELSE
    RAISE NOTICE 'message_templates table already exists';
  END IF;
END $$;

-- ================================================================
-- STEP 2: message_templates에 필수 컬럼 추가
-- ================================================================

-- type 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message_templates' AND column_name = 'type'
  ) THEN
    ALTER TABLE message_templates ADD COLUMN type TEXT NOT NULL DEFAULT 'NOTICE';
    RAISE NOTICE 'Added type column to message_templates';
  ELSE
    RAISE NOTICE 'type column already exists in message_templates';
  END IF;
END $$;

-- is_active 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message_templates' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE message_templates ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    RAISE NOTICE 'Added is_active column to message_templates';
  ELSE
    RAISE NOTICE 'is_active column already exists in message_templates';
  END IF;
END $$;

-- variables 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message_templates' AND column_name = 'variables'
  ) THEN
    ALTER TABLE message_templates ADD COLUMN variables JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added variables column to message_templates';
  ELSE
    RAISE NOTICE 'variables column already exists in message_templates';
  END IF;
END $$;

-- ================================================================
-- STEP 3: message_templates 제약 조건 및 인덱스
-- ================================================================

-- CHECK 제약 조건 추가 (이미 있으면 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_template_type'
  ) THEN
    ALTER TABLE message_templates 
    ADD CONSTRAINT check_template_type 
    CHECK (type IN ('EMERGENCY', 'NOTICE', 'WEATHER', 'SCHEDULE'));
    RAISE NOTICE 'Added check_template_type constraint';
  ELSE
    RAISE NOTICE 'check_template_type constraint already exists';
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON message_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_type ON message_templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON message_templates(created_at DESC);

-- 코멘트
COMMENT ON TABLE message_templates IS '전광판 템플릿 정보';

-- ================================================================
-- STEP 4: schedules 테이블 생성
-- ================================================================

-- 기존 schedules 테이블 삭제 (재생성하려면 주석 해제)
-- DROP TABLE IF EXISTS schedule_executions CASCADE;
-- DROP TABLE IF EXISTS schedules CASCADE;

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_id UUID NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  display_duration_type TEXT NOT NULL DEFAULT '5min',
  display_duration_minutes INTEGER,
  repeat_type TEXT NOT NULL DEFAULT 'none',
  repeat_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 5,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_executed_at TIMESTAMPTZ,
  
  -- Check constraints
  CONSTRAINT check_repeat_type 
    CHECK (repeat_type IN ('none', 'daily', 'weekly', 'custom')),
  
  CONSTRAINT check_display_duration_type
    CHECK (display_duration_type IN ('1min', '5min', '10min', 'all-day', 'custom')),
  
  CONSTRAINT check_priority_range
    CHECK (priority >= 1 AND priority <= 10),
  
  CONSTRAINT check_end_datetime
    CHECK (end_datetime IS NULL OR end_datetime > start_datetime),
  
  CONSTRAINT check_custom_duration
    CHECK (
      display_duration_type != 'custom' OR 
      (display_duration_minutes IS NOT NULL AND display_duration_minutes >= 1)
    )
);

-- 외래키는 별도로 추가 (테이블이 모두 준비된 후)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_template'
  ) THEN
    ALTER TABLE schedules
    ADD CONSTRAINT fk_template
    FOREIGN KEY (template_id)
    REFERENCES message_templates(id)
    ON DELETE RESTRICT;
    RAISE NOTICE 'Added fk_template foreign key';
  ELSE
    RAISE NOTICE 'fk_template foreign key already exists';
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_schedules_template_id ON schedules(template_id);
CREATE INDEX IF NOT EXISTS idx_schedules_is_active ON schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedules_start_datetime ON schedules(start_datetime);
CREATE INDEX IF NOT EXISTS idx_schedules_priority ON schedules(priority);
CREATE INDEX IF NOT EXISTS idx_schedules_created_by ON schedules(created_by);

-- 코멘트
COMMENT ON TABLE schedules IS '전광판 스케줄 정보';

-- ================================================================
-- STEP 5: schedule_executions 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS schedule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL,
  template_id UUID NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Check constraint
  CONSTRAINT check_status
    CHECK (status IN ('success', 'failed'))
);

-- 외래키는 별도로 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_schedule'
  ) THEN
    ALTER TABLE schedule_executions
    ADD CONSTRAINT fk_schedule
    FOREIGN KEY (schedule_id)
    REFERENCES schedules(id)
    ON DELETE CASCADE;
    RAISE NOTICE 'Added fk_schedule foreign key';
  ELSE
    RAISE NOTICE 'fk_schedule foreign key already exists';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_template_execution'
  ) THEN
    ALTER TABLE schedule_executions
    ADD CONSTRAINT fk_template_execution
    FOREIGN KEY (template_id)
    REFERENCES message_templates(id)
    ON DELETE RESTRICT;
    RAISE NOTICE 'Added fk_template_execution foreign key';
  ELSE
    RAISE NOTICE 'fk_template_execution foreign key already exists';
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_schedule_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_executed_at ON schedule_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_status ON schedule_executions(status);

-- 코멘트
COMMENT ON TABLE schedule_executions IS '스케줄 실행 이력';

-- ================================================================
-- STEP 6: 최종 확인
-- ================================================================

-- 테이블 목록
SELECT 
  '✅ Tables' as check_type,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('message_templates', 'schedules', 'schedule_executions')
ORDER BY table_name;

-- message_templates 컬럼 확인
SELECT 
  '✅ message_templates columns' as check_type,
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'message_templates'
ORDER BY ordinal_position;

-- schedules 컬럼 확인
SELECT 
  '✅ schedules columns' as check_type,
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;

-- 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 모든 테이블이 성공적으로 설정되었습니다!';
  RAISE NOTICE '========================================';
END $$;
