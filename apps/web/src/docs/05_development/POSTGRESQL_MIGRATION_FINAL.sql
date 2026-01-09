-- ================================================================
-- PostgreSQL 마이그레이션 스크립트 (최종)
-- 고양 스마트시티 리빙랩 - 전광판 송출 시스템
-- 현재 스키마 기반 업데이트
-- ================================================================
-- 작성일: 2024-12-19
-- 목적: 누락된 컬럼 및 테이블만 추가
-- ================================================================

-- ================================================================
-- Step 1: schedule_executions 테이블에 execution_context 컬럼 추가
-- ================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedule_executions' AND column_name = 'execution_context'
  ) THEN
    ALTER TABLE schedule_executions ADD COLUMN execution_context JSONB;
    RAISE NOTICE '[✓] schedule_executions.execution_context 컬럼 추가됨';
  ELSE
    RAISE NOTICE '[i] schedule_executions.execution_context 컬럼 이미 존재';
  END IF;
END $$;

-- execution_context 인덱스 추가 (선택사항)
CREATE INDEX IF NOT EXISTS idx_schedule_executions_context ON schedule_executions USING GIN(execution_context);

-- ================================================================
-- Step 2: display_current_state 테이블 생성
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

DO $$
BEGIN
  RAISE NOTICE '[✓] display_current_state 테이블 생성 및 인덱스 완료';
END $$;

-- ================================================================
-- Step 3: display_settings 테이블 생성
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

DO $$
BEGIN
  RAISE NOTICE '[✓] display_settings 테이블 생성됨';
END $$;

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
-- Step 4: updated_at 트리거 추가
-- ================================================================

-- 트리거 함수 생성 (이미 있어도 재생성)
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE '[✓] update_timestamp() 함수 생성됨';
END $$;

-- display_current_state 트리거
DROP TRIGGER IF EXISTS trg_display_current_state_updated_at ON display_current_state;
CREATE TRIGGER trg_display_current_state_updated_at
BEFORE UPDATE ON display_current_state
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DO $$
BEGIN
  RAISE NOTICE '[✓] display_current_state 트리거 생성됨';
END $$;

-- display_settings 트리거
DROP TRIGGER IF EXISTS trg_display_settings_updated_at ON display_settings;
CREATE TRIGGER trg_display_settings_updated_at
BEFORE UPDATE ON display_settings
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DO $$
BEGIN
  RAISE NOTICE '[✓] display_settings 트리거 생성됨';
END $$;

-- ================================================================
-- Step 5: 코멘트 추가
-- ================================================================

COMMENT ON TABLE schedule_executions IS '스케줄 실행 이력 - PostgreSQL 완전 전환';
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

DO $$
BEGIN
  RAISE NOTICE '[✓] 코멘트 추가 완료';
END $$;

-- ================================================================
-- Step 6: schedules 테이블 추가 제약 조건 (있으면 무시)
-- ================================================================

-- valid_time_range 제약 조건
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

-- valid_priority 제약 조건
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

-- valid_content_type 제약 조건
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

-- 추가 인덱스 생성 (last_executed_at, content_type)
CREATE INDEX IF NOT EXISTS idx_schedules_last_executed ON schedules(last_executed_at);
CREATE INDEX IF NOT EXISTS idx_schedules_content_type ON schedules(content_type);

DO $$
BEGIN
  RAISE NOTICE '[✓] schedules 테이블 추가 인덱스 생성 완료';
END $$;

-- ================================================================
-- Step 7: schedule_executions 추가 제약 조건
-- ================================================================

-- check_error_message 제약 조건
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_error_message' AND conrelid = 'schedule_executions'::regclass
  ) THEN
    ALTER TABLE schedule_executions 
    ADD CONSTRAINT check_error_message CHECK (
      (status = 'failed' AND error_message IS NOT NULL) OR
      (status = 'success')
    );
    RAISE NOTICE '[✓] schedule_executions.check_error_message 제약 조건 추가됨';
  ELSE
    RAISE NOTICE '[i] schedule_executions.check_error_message 제약 조건 이미 존재';
  END IF;
END $$;

-- 추가 인덱스 생성 (template_id, composite)
CREATE INDEX IF NOT EXISTS idx_schedule_executions_template_id ON schedule_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_composite ON schedule_executions(schedule_id, executed_at DESC);

DO $$
BEGIN
  RAISE NOTICE '[✓] schedule_executions 테이블 추가 인덱스 생성 완료';
END $$;

-- ================================================================
-- 마이그레이션 완료 - 검증 쿼리
-- ================================================================

DO $$
DECLARE
  table_count INTEGER;
  column_count INTEGER;
BEGIN
  -- 새로 생성된 테이블 개수
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' 
    AND table_name IN ('display_current_state', 'display_settings');
  
  -- execution_context 컬럼 존재 확인
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'schedule_executions' AND column_name = 'execution_context';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '마이그레이션 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '새로 생성된 테이블: %', table_count;
  RAISE NOTICE 'execution_context 컬럼 추가: %', column_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. 서버 코드는 이미 업데이트됨 (schedule_db_helpers.ts, schedule_executor.ts)';
  RAISE NOTICE '2. 서버가 자동으로 재배포되면 PostgreSQL 사용 시작';
  RAISE NOTICE '3. 스케줄 생성 후 자동 실행 테스트';
  RAISE NOTICE '4. 실행 이력 확인: SELECT * FROM schedule_executions ORDER BY executed_at DESC LIMIT 10;';
  RAISE NOTICE '5. 현재 송출 확인: SELECT * FROM display_current_state;';
  RAISE NOTICE '========================================';
END $$;

-- 전체 테이블 상태 확인
SELECT 
  table_name, 
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
  (SELECT count(*) FROM pg_indexes WHERE tablename = t.table_name) as index_count,
  (SELECT count(*) FROM pg_constraint WHERE conrelid = t.table_name::regclass) as constraint_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('schedules', 'schedule_executions', 'display_current_state', 'display_settings')
ORDER BY table_name;
