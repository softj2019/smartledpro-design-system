# 📊 Supabase 테이블 설정 가이드

## 🎯 개요

고양 스마트시티 전광판 시스템은 다음 Supabase 테이블을 사용합니다:

1. **message_templates** - 템플릿 관리
2. **schedules** - 스케줄 관리 ⭐ NEW
3. **schedule_executions** - 스케줄 실행 이력 ⭐ NEW  
4. **audit_logs** - 감사 로그

---

## 🔧 테이블 생성 SQL

Supabase Dashboard → SQL Editor에서 아래 SQL을 **순서대로** 실행하세요.

### 0. Message Templates 테이블 (선행 작업)

먼저 message_templates 테이블이 있는지 확인하고, 필요한 컬럼을 추가합니다:

```sql
-- ================================================================
-- Message Templates Table - 템플릿 정보 (기존 테이블)
-- ================================================================

-- 테이블이 없다면 생성
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'NOTICE',
  variables JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT check_template_type
    CHECK (type IN ('EMERGENCY', 'NOTICE', 'WEATHER', 'SCHEDULE'))
);

-- is_active 컬럼이 없다면 추가 (기존 테이블인 경우)
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

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON message_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_type ON message_templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON message_templates(created_at DESC);

COMMENT ON TABLE message_templates IS '전광판 템플릿 정보';
```

### 1. Schedules 테이블

```sql
-- ================================================================
-- Schedules Table - 스케줄 정보
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
CREATE INDEX idx_schedules_template_id ON schedules(template_id);
CREATE INDEX idx_schedules_is_active ON schedules(is_active);
CREATE INDEX idx_schedules_start_datetime ON schedules(start_datetime);
CREATE INDEX idx_schedules_priority ON schedules(priority);
CREATE INDEX idx_schedules_created_by ON schedules(created_by);

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
```

### 2. Schedule Executions 테이블

```sql
-- ================================================================
-- Schedule Executions Table - 스케줄 실행 이력
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
CREATE INDEX idx_schedule_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX idx_schedule_executions_executed_at ON schedule_executions(executed_at DESC);
CREATE INDEX idx_schedule_executions_status ON schedule_executions(status);

-- Comments
COMMENT ON TABLE schedule_executions IS '스케줄 실행 이력';
COMMENT ON COLUMN schedule_executions.schedule_id IS '스케줄 ID';
COMMENT ON COLUMN schedule_executions.template_id IS '실행된 템플릿 ID';
COMMENT ON COLUMN schedule_executions.executed_at IS '실행 시간';
COMMENT ON COLUMN schedule_executions.status IS '실행 결과 (success, failed)';
COMMENT ON COLUMN schedule_executions.error_message IS '에러 메시지 (실패 시)';
```

---

## ✅ 테이블 생성 확인

SQL을 실행한 후 다음 쿼리로 확인하세요:

```sql
-- 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('schedules', 'schedule_executions');

-- schedules 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;

-- schedule_executions 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'schedule_executions'
ORDER BY ordinal_position;
```

---

## 🔐 Row Level Security (RLS) 설정 (선택사항)

더 강력한 보안을 원하시면 RLS를 활성화하세요:

```sql
-- RLS 활성화
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_executions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Allow read access for authenticated users" 
ON schedules FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow read access for authenticated users" 
ON schedule_executions FOR SELECT 
TO authenticated 
USING (true);

-- OPERATOR와 ADMIN만 쓰기 가능
CREATE POLICY "Allow insert for operators and admins" 
ON schedules FOR INSERT 
TO authenticated 
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('OPERATOR', 'ADMIN')
);

CREATE POLICY "Allow update for operators and admins" 
ON schedules FOR UPDATE 
TO authenticated 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('OPERATOR', 'ADMIN')
);

CREATE POLICY "Allow delete for operators and admins" 
ON schedules FOR DELETE 
TO authenticated 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('OPERATOR', 'ADMIN')
);
```

---

## 📋 샘플 데이터 (테스트용)

테스트를 위한 샘플 스케줄:

```sql
-- 먼저 템플릿 ID를 가져옵니다 (이미 생성된 템플릿 사용)
SELECT id, name FROM message_templates LIMIT 5;

-- 샘플 스케줄 삽입 (template_id를 위에서 가져온 실제 ID로 변경하세요)
INSERT INTO schedules (
  id,
  name,
  template_id,
  start_datetime,
  display_duration_type,
  repeat_type,
  is_active,
  created_by
) VALUES (
  gen_random_uuid(),
  '매일 아침 운영시간 안내',
  'YOUR_TEMPLATE_ID_HERE',  -- 실제 템플릿 ID로 변경
  '2025-12-20 09:00:00+09',
  '5min',
  'daily',
  true,
  (SELECT auth.uid())  -- 현재 로그인한 사용자 ID
);
```

---

## ⚠️ 중요 사항

### 1. **Foreign Key 제약**
- `template_id`는 `message_templates` 테이블의 유효한 ID여야 합니다
- 템플릿이 삭제되면 해당 템플릿을 사용하는 스케줄은 삭제되지 않습니다 (RESTRICT)
- 스케줄이 삭제되면 관련 실행 이력도 함께 삭제됩니다 (CASCADE)

### 2. **데이터 무결성**
- `end_datetime`은 항상 `start_datetime` 이후여야 합니다
- `priority`는 1~10 범위여야 합니다
- `display_duration_type`이 'custom'이면 `display_duration_minutes`가 필수입니다

### 3. **인덱스 최적화**
- 자주 조회되는 컬럼에 인덱스가 생성되어 성능이 최적화됩니다
- `is_active`, `start_datetime`, `priority` 등

---

## 🚀 다음 단계

1. ✅ 위 SQL을 Supabase Dashboard에서 실행
2. ✅ 테이블 생성 확인
3. ✅ 애플리케이션에서 스케줄 생성 테스트
4. ✅ 실행 이력 확인

---

## 🔍 트러블슈팅

### "relation already exists" 에러
```sql
-- 기존 테이블 삭제 (주의: 모든 데이터 삭제됨!)
DROP TABLE IF EXISTS schedule_executions CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;

-- 다시 생성
-- (위의 CREATE TABLE 문 실행)
```

### Foreign Key 에러
```sql
-- message_templates 테이블이 있는지 확인
SELECT * FROM message_templates LIMIT 1;

-- 없다면 먼저 message_templates 테이블을 생성하세요
```

---

## 📚 관련 문서

- [스케줄 시스템 가이드](/docs/SCHEDULE_SYSTEM_GUIDE.md)
- [Supabase 공식 문���](https://supabase.com/docs)