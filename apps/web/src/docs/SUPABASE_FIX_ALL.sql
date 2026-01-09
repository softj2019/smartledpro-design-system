-- ================================================================
-- 고양 스마트시티 전광판 시스템 - Supabase 테이블 설정
-- 모든 필수 컬럼 자동 추가 스크립트
-- ================================================================

-- ================================================================
-- Step 1: message_templates 테이블 생성 및 컬럼 추가
-- ================================================================

-- 테이블이 없다면 생성
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- type 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message_templates' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE message_templates 
    ADD COLUMN type TEXT NOT NULL DEFAULT 'NOTICE';
  END IF;
END $$;

-- is_active 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message_templates' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE message_templates 
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- variables 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'message_templates' 
    AND column_name = 'variables'
  ) THEN
    ALTER TABLE message_templates 
    ADD COLUMN variables JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- type 컬럼에 CHECK 제약 추가 (이미 있으면 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_template_type'
  ) THEN
    ALTER TABLE message_templates 
    ADD CONSTRAINT check_template_type 
    CHECK (type IN ('EMERGENCY', 'NOTICE', 'WEATHER', 'SCHEDULE'));
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON message_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_type ON message_templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON message_templates(created_at DESC);

COMMENT ON TABLE message_templates IS '전광판 템플릿 정보';

-- ================================================================
-- Step 2: schedules 테이블 생성
-- ================================================================

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
  
  -- Foreign Key to message_templates
  CONSTRAINT fk_template
    FOREIGN KEY (template_id)
    REFERENCES message_templates(id)
    ON DELETE RESTRICT,
  
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedules_template_id ON schedules(template_id);
CREATE INDEX IF NOT EXISTS idx_schedules_is_active ON schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedules_start_datetime ON schedules(start_datetime);
CREATE INDEX IF NOT EXISTS idx_schedules_priority ON schedules(priority);
CREATE INDEX IF NOT EXISTS idx_schedules_created_by ON schedules(created_by);

-- Comments
COMMENT ON TABLE schedules IS '전광판 스케줄 정보';
COMMENT ON COLUMN schedules.name IS '스케줄 이름';
COMMENT ON COLUMN schedules.template_id IS '송출할 템플릿 ID';
COMMENT ON COLUMN schedules.start_datetime IS '스케줄 시작 시간';
COMMENT ON COLUMN schedules.end_datetime IS '스케줄 종료 시간 (nullable)';
COMMENT ON COLUMN schedules.display_duration_type IS '표시 시간 타입 (1min, 5min, 10min, all-day, custom)';
COMMENT ON COLUMN schedules.display_duration_minutes IS '직접입력 시 분 단위 (custom인 경우)';
COMMENT ON COLUMN schedules.repeat_type IS '반복 타입 (none, daily, weekly, custom)';
COMMENT ON COLUMN schedules.repeat_config IS '반복 설정 (JSON)';
COMMENT ON COLUMN schedules.is_active IS '활성화 상태';
COMMENT ON COLUMN schedules.priority IS '우선순위 (1-10, 낮을수록 높은 우선순위)';
COMMENT ON COLUMN schedules.last_executed_at IS '마지막 실행 시간';

-- ================================================================
-- Step 3: schedule_executions 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS schedule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL,
  template_id UUID NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Foreign Keys
  CONSTRAINT fk_schedule
    FOREIGN KEY (schedule_id)
    REFERENCES schedules(id)
    ON DELETE CASCADE,
  
  CONSTRAINT fk_template_execution
    FOREIGN KEY (template_id)
    REFERENCES message_templates(id)
    ON DELETE RESTRICT,
  
  -- Check constraint
  CONSTRAINT check_status
    CHECK (status IN ('success', 'failed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedule_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_executed_at ON schedule_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_status ON schedule_executions(status);

-- Comments
COMMENT ON TABLE schedule_executions IS '스케줄 실행 이력';
COMMENT ON COLUMN schedule_executions.schedule_id IS '스케줄 ID';
COMMENT ON COLUMN schedule_executions.template_id IS '실행된 템플릿 ID';
COMMENT ON COLUMN schedule_executions.executed_at IS '실행 시간';
COMMENT ON COLUMN schedule_executions.status IS '실행 결과 (success, failed)';
COMMENT ON COLUMN schedule_executions.error_message IS '에러 메시지 (실패 시)';

-- ================================================================
-- 완료 확인 쿼리
-- ================================================================

-- message_templates 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'message_templates'
ORDER BY ordinal_position;

-- 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('message_templates', 'schedules', 'schedule_executions')
ORDER BY table_name;
