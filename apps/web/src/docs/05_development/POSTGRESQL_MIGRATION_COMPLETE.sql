-- ================================================================
-- PostgreSQL 완전 마이그레이션 스크립트
-- 고양 스마트시티 리빙랩 - 전광판 송출 시스템
-- KV Store → PostgreSQL 완전 전환
-- ================================================================
-- 작성일: 2024-12-19
-- 목적: 모든 KV Store 데이터를 PostgreSQL 테이블로 마이그레이션
-- ================================================================

-- ================================================================
-- Step 1: schedules 테이블 확인 및 컬럼 추가
-- ================================================================

-- schedules 테이블 존재 확인 후 생성
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  content_type TEXT NOT NULL DEFAULT 'NOTICE',
  display_ids JSONB NOT NULL DEFAULT '["*"]'::jsonb,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  recurrence_rule JSONB,
  priority INTEGER DEFAULT 200,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- name 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'name'
  ) THEN
    ALTER TABLE schedules ADD COLUMN name TEXT;
    RAISE NOTICE '[✓] schedules.name 컬럼 추가됨';
  ELSE
    RAISE NOTICE '[i] schedules.name 컬럼 이미 존재';
  END IF;
END $$;

-- is_active 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE schedules ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    RAISE NOTICE '[✓] schedules.is_active 컬럼 추가됨';
  ELSE
    RAISE NOTICE '[i] schedules.is_active 컬럼 이미 존재';
  END IF;
END $$;

-- last_executed_at 컬럼 추가 (없는 경우)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'last_executed_at'
  ) THEN
    ALTER TABLE schedules ADD COLUMN last_executed_at TIMESTAMPTZ;
    RAISE NOTICE '[✓] schedules.last_executed_at 컬럼 추가됨';
  ELSE
    RAISE NOTICE '[i] schedules.last_executed_at 컬럼 이미 존재';
  END IF;
END $$;

-- 제약 조건 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_time_range' AND conrelid = 'schedules'::regclass
  ) THEN
    ALTER TABLE schedules 
    ADD CONSTRAINT valid_time_range CHECK (end_at > start_at);
    RAISE NOTICE '[✓] schedules.valid_time_range 제약 조건 추가됨';
  ELSE
    RAISE NOTICE '[i] schedules.valid_time_range 제약 조건 이미 존재';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_priority' AND conrelid = 'schedules'::regclass
  ) THEN
    ALTER TABLE schedules 
    ADD CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 1000);
    RAISE NOTICE '[✓] schedules.valid_priority 제약 조건 추가됨';
  ELSE
    RAISE NOTICE '[i] schedules.valid_priority 제약 조건 이미 존재';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_content_type' AND conrelid = 'schedules'::regclass
  ) THEN
    ALTER TABLE schedules 
    ADD CONSTRAINT valid_content_type CHECK (content_type IN ('NOTICE', 'EMERGENCY', 'WEATHER'));
    RAISE NOTICE '[✓] schedules.valid_content_type 제약 조건 추가됨';
  ELSE
    RAISE NOTICE '[i] schedules.valid_content_type 제약 조건 이미 존재';
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_schedules_is_active ON schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedules_start_end ON schedules(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_schedules_priority ON schedules(priority);
CREATE INDEX IF NOT EXISTS idx_schedules_last_executed ON schedules(last_executed_at);
CREATE INDEX IF NOT EXISTS idx_schedules_display_ids ON schedules USING GIN(display_ids);
CREATE INDEX IF NOT EXISTS idx_schedules_content_type ON schedules(content_type);

RAISE NOTICE '[✓] schedules 테이블 인덱스 생성 완료';

-- ================================================================
-- Step 2: schedule_executions 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS schedule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL,
  template_id UUID NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  execution_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT check_error_message CHECK (
    (status = 'failed' AND error_message IS NOT NULL) OR
    (status = 'success')
  )
);

RAISE NOTICE '[✓] schedule_executions 테이블 생성됨';

-- Foreign Key 추가 (schedules)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_schedule_executions_schedule'
  ) THEN
    ALTER TABLE schedule_executions 
    ADD CONSTRAINT fk_schedule_executions_schedule 
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE;
    RAISE NOTICE '[✓] schedule_executions → schedules FK 추가됨';
  ELSE
    RAISE NOTICE '[i] schedule_executions → schedules FK 이미 존재';
  END IF;
END $$;

-- Foreign Key 추가 (message_templates) - 조건부
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'message_templates'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_schedule_executions_template'
  ) THEN
    ALTER TABLE schedule_executions 
    ADD CONSTRAINT fk_schedule_executions_template 
    FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE RESTRICT;
    RAISE NOTICE '[✓] schedule_executions → message_templates FK 추가됨';
  ELSE
    RAISE NOTICE '[i] schedule_executions → message_templates FK 건너뜀 (테이블 없음 또는 이미 존재)';
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_schedule_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_executed_at ON schedule_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_status ON schedule_executions(status);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_composite ON schedule_executions(schedule_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_template_id ON schedule_executions(template_id);

RAISE NOTICE '[✓] schedule_executions 테이블 인덱스 생성 완료';

-- ================================================================
-- Step 3: display_current_state 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS display_current_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'schedule', 'weather')),
  source_id UUID,
  content_type TEXT NOT NULL CHECK (content_type IN ('EMERGENCY', 'NOTICE', 'WEATHER')),
  priority INTEGER NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > activated_at),
  CONSTRAINT valid_priority_display CHECK (priority BETWEEN 1 AND 1000)
);

RAISE NOTICE '[✓] display_current_state 테이블 생성됨';

-- Foreign Key 추가 (message_templates) - 조건부
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'message_templates'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_display_current_state_template'
  ) THEN
    ALTER TABLE display_current_state 
    ADD CONSTRAINT fk_display_current_state_template 
    FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL;
    RAISE NOTICE '[✓] display_current_state → message_templates FK 추가됨';
  ELSE
    RAISE NOTICE '[i] display_current_state → message_templates FK 건너뜀';
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_display_current_state_template ON display_current_state(template_id);
CREATE INDEX IF NOT EXISTS idx_display_current_state_source ON display_current_state(source, source_id);
CREATE INDEX IF NOT EXISTS idx_display_current_state_active ON display_current_state(activated_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_display_current_state_priority ON display_current_state(priority);

RAISE NOTICE '[✓] display_current_state 테이블 인덱스 생성 완료';

-- ================================================================
-- Step 4: display_settings 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS display_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  scale_x DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
  scale_y DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
  show_border BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_scale CHECK (scale_x > 0 AND scale_y > 0 AND scale_x <= 5 AND scale_y <= 5)
);

RAISE NOTICE '[✓] display_settings 테이블 생성됨';

-- 초기 데이터 삽입 (없을 경우)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM display_settings) THEN
    INSERT INTO display_settings (position_x, position_y, scale_x, scale_y, show_border)
    VALUES (0, 0, 1.00, 1.00, true);
    RAISE NOTICE '[✓] display_settings 초기 데이터 삽입됨';
  ELSE
    RAISE NOTICE '[i] display_settings 데이터 이미 존재';
  END IF;
END $$;

-- ================================================================
-- Step 5: updated_at 트리거 추가
-- ================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE '[✓] update_timestamp() 함수 생성됨';

-- schedules 트리거
DROP TRIGGER IF EXISTS trg_schedules_updated_at ON schedules;
CREATE TRIGGER trg_schedules_updated_at
BEFORE UPDATE ON schedules
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

RAISE NOTICE '[✓] schedules 트리거 생성됨';

-- display_current_state 트리거
DROP TRIGGER IF EXISTS trg_display_current_state_updated_at ON display_current_state;
CREATE TRIGGER trg_display_current_state_updated_at
BEFORE UPDATE ON display_current_state
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

RAISE NOTICE '[✓] display_current_state 트리거 생성됨';

-- display_settings 트리거
DROP TRIGGER IF EXISTS trg_display_settings_updated_at ON display_settings;
CREATE TRIGGER trg_display_settings_updated_at
BEFORE UPDATE ON display_settings
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

RAISE NOTICE '[✓] display_settings 트리거 생성됨';

-- ================================================================
-- Step 6: 코멘트 추가
-- ================================================================

COMMENT ON TABLE schedules IS '전광판 스케줄 (예약/반복 송출) - KV Store에서 마이그레이션';
COMMENT ON COLUMN schedules.name IS '스케줄 이름';
COMMENT ON COLUMN schedules.start_at IS '시작 시간 (KST)';
COMMENT ON COLUMN schedules.end_at IS '종료 시간 (KST)';
COMMENT ON COLUMN schedules.recurrence_rule IS '반복 규칙 (JSONB): {freq: "DAILY"|"WEEKLY", interval: 1, byweekday: [0-6]}';
COMMENT ON COLUMN schedules.is_active IS '활성화 상태';
COMMENT ON COLUMN schedules.priority IS '우선순위 (낮을수록 높음: EMERGENCY=100, NOTICE=200, WEATHER=300)';
COMMENT ON COLUMN schedules.last_executed_at IS '마지막 실행 시간';

COMMENT ON TABLE schedule_executions IS '스케줄 실행 이력 - KV Store에서 마이그레이션';
COMMENT ON COLUMN schedule_executions.executed_at IS '실행 시간';
COMMENT ON COLUMN schedule_executions.status IS '실행 결과 (success, failed)';
COMMENT ON COLUMN schedule_executions.execution_context IS '실행 당시의 추가 정보 (JSONB)';

COMMENT ON TABLE display_current_state IS '현재 송출 상태 - KV Store의 display:current_template 대체';
COMMENT ON COLUMN display_current_state.source IS '송출 방식 (manual=수동, schedule=스케줄, weather=날씨)';
COMMENT ON COLUMN display_current_state.source_id IS '출처 ID (schedule_id 등)';
COMMENT ON COLUMN display_current_state.activated_at IS '송출 시작 시간';
COMMENT ON COLUMN display_current_state.expires_at IS '송출 종료 시간 (NULL=무제한)';

COMMENT ON TABLE display_settings IS '전광판 UI 설정 - KV Store의 display:settings 대체';
COMMENT ON COLUMN display_settings.position_x IS 'X 좌표 (px)';
COMMENT ON COLUMN display_settings.position_y IS 'Y 좌표 (px)';
COMMENT ON COLUMN display_settings.scale_x IS 'X축 배율 (0.01 ~ 5.00)';
COMMENT ON COLUMN display_settings.scale_y IS 'Y축 배율 (0.01 ~ 5.00)';

RAISE NOTICE '[✓] 코멘트 추가 완료';

-- ================================================================
-- Step 7: 헬퍼 뷰 생성
-- ================================================================

-- 최근 실행 이력 뷰 (KV Store의 schedule_executions:recent 대체)
CREATE OR REPLACE VIEW v_recent_schedule_executions AS
SELECT 
  se.*,
  s.name as schedule_name,
  s.priority as schedule_priority
FROM schedule_executions se
LEFT JOIN schedules s ON se.schedule_id = s.id
ORDER BY se.executed_at DESC
LIMIT 100;

COMMENT ON VIEW v_recent_schedule_executions IS '최근 100개 스케줄 실행 이력 (KV Store 대체)';

RAISE NOTICE '[✓] 헬퍼 뷰 생성 완료';

-- ================================================================
-- Step 8: RLS (Row Level Security) 설정 - 추후 필요 시
-- ================================================================

-- 현재는 Service Role Key를 사용하므로 RLS 비활성화
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE display_current_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE display_settings DISABLE ROW LEVEL SECURITY;

RAISE NOTICE '[i] RLS 비활성화 (Service Role Key 사용)';

-- ================================================================
-- 마이그레이션 완료 - 검증 쿼리
-- ================================================================

-- 테이블 목록 확인
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' 
    AND table_name IN ('schedules', 'schedule_executions', 'display_current_state', 'display_settings');
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '마이그레이션 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '생성된 테이블 개수: %', table_count;
END $$;

-- 테이블별 컬럼 개수 출력
SELECT 
  table_name, 
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
  (SELECT count(*) FROM pg_indexes WHERE tablename = t.table_name) as index_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('schedules', 'schedule_executions', 'display_current_state', 'display_settings')
ORDER BY table_name;

-- ================================================================
-- 다음 단계 안내
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. 서버 코드 업데이트 (schedule_db_helpers.ts, schedule_executor.ts, index.tsx)';
  RAISE NOTICE '2. KV Store 사용 코드 제거';
  RAISE NOTICE '3. 애플리케이션 재시작 및 테스트';
  RAISE NOTICE '4. 실행 이력 확인: SELECT * FROM schedule_executions ORDER BY executed_at DESC LIMIT 10;';
  RAISE NOTICE '========================================';
END $$;
