# PostgreSQL 완전 마이그레이션 가이드

**작성일**: 2024-12-19
**작성자**: AI Assistant
**목적**: KV Store 사용을 PostgreSQL 테이블로 완전 마이그레이션

---

## 📋 목차

1. [마이그레이션 개요](#1-마이그레이션-개요)
2. [현재 KV Store 사용 현황](#2-현재-kv-store-사용-현황)
3. [현재 DB 상태 확인](#3-현재-db-상태-확인) ⭐ 추가
4. [새로운 DB 스키마 설계](#4-새로운-db-스키마-설계)
5. [마이그레이션 SQL 스크립트](#5-마이그레이션-sql-스크립트)
6. [코드 수정 가이드](#6-코드-수정-가이드)
7. [마이그레이션 절차](#7-마이그레이션-절차)
8. [검증 방법](#8-검증-방법)

---

## 1. 마이그레이션 개요

### 1.1 마이그레이션 목적

**기존 문제점**:
- KV Store는 휘발성 데이터로 서버 재시작 시 손실
- 검색 및 필터링 기능 제한
- 관계형 데이터 무결성 보장 어려움
- Audit 추적 불가능

**마이그레이션 후 장점**:
- ✅ 영구적인 데이터 저장
- ✅ SQL 쿼리로 강력한 검색/필터링
- ✅ Foreign Key로 참조 무결성 보장
- ✅ 인덱스로 성능 최적화
- ✅ 백업 및 복구 용이
- ✅ 실증 증빙 자료로 활용 가능

### 1.2 마이그레이션 범위

| 기능 | 현재 (KV Store) | 변경 후 (PostgreSQL) |
|------|----------------|---------------------|
| 스케줄 관리 | ❌ KV Store | ✅ schedules 테이블 |
| 스케줄 실행 이력 | ❌ KV Store | ✅ schedule_executions 테이블 |
| 현재 송출 템플릿 | ❌ KV Store | ✅ display_current_state 테이블 |
| 디스플레이 설정 | ❌ KV Store | ✅ display_settings 테이블 |

### 1.3 마이그레이션 원칙

1. **하위 호환성**: 기존 초기 마이그레이션 스키마와 호환
2. **점진적 마이그레이션**: 단계별로 테이블 추가
3. **제약 조건 강화**: CHECK, FK로 데이터 무결성 보장
4. **성능 최적화**: 인덱스 전략 수립

---

## 2. 현재 KV Store 사용 현황

### 2.1 스케줄 관련

```typescript
// KV Store 키 구조
schedule:{id}                    // 스케줄 데이터
schedules:all                    // 전체 스케줄 ID 배열
schedules:active                 // 활성 스케줄 ID 배열
schedule:{id}:last_executed_at   // 마지막 실행 시간
```

**데이터 예시**:
```json
{
  "schedule:abc-123": {
    "id": "abc-123",
    "name": "긴급 공지",
    "template_id": "template-1",
    "start_datetime": "2024-12-19T14:00:00Z",
    "end_datetime": "2024-12-19T14:05:00Z",
    "repeat_type": "none",
    "is_active": true,
    "priority": 5
  },
  "schedules:all": ["abc-123", "def-456"],
  "schedules:active": ["abc-123"],
  "schedule:abc-123:last_executed_at": "2024-12-19T14:00:00Z"
}
```

### 2.2 실행 이력 관련

```typescript
// KV Store 키 구조
schedule_execution:{execution_id}           // 개별 실행 이력
schedule_executions:{schedule_id}           // 스케줄별 실행 ID 배열
schedule_executions:recent                  // 최근 100개 실행 이력
```

**데이터 예시**:
```json
{
  "schedule_execution:exec-1": {
    "id": "exec-1",
    "schedule_id": "abc-123",
    "template_id": "template-1",
    "executed_at": "2024-12-19T14:00:00Z",
    "status": "success"
  },
  "schedule_executions:abc-123": ["exec-1", "exec-2"],
  "schedule_executions:recent": [/* 100개 이력 */]
}
```

### 2.3 디스플레이 관련

```typescript
// KV Store 키 구조
display:current_template         // 현재 송출 중인 템플릿 ID
display:last_updated             // 마지막 업데이트 시간
display:settings                 // 디스플레이 설정 (위치, 크기)
```

**데이터 예시**:
```json
{
  "display:current_template": "template-123",
  "display:last_updated": "2024-12-19T14:00:00Z",
  "display:settings": {
    "position": { "x": 0, "y": 0 },
    "scaleX": 1,
    "scaleY": 1,
    "showBorder": true
  }
}
```

---

## 3. 현재 DB 상태 확인

### 3.1 테이블 존재 여부 확인

```sql
-- 테이블 존재 여부 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('schedules', 'schedule_executions', 'display_current_state', 'display_settings');

-- 테이블 목록 확인
SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('schedules', 'schedule_executions', 'display_current_state', 'display_settings')
ORDER BY table_name;
```

### 3.2 테이블 구조 확인

```sql
-- schedules 테이블 구조 확인
\d schedules

-- schedule_executions 테이블 구조 확인
\d schedule_executions

-- display_current_state 테이블 구조 확인
\d display_current_state

-- display_settings 테이블 구조 확인
\d display_settings
```

---

## 4. 새로운 DB 스키마 설계

### 4.1 schedules 테이블 (통합 설계)

**목적**: 기존 초기 마이그레이션과 새로운 요구사항 통합

```sql
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 기본 정보
  name TEXT,
  template_id UUID REFERENCES message_templates(id) ON DELETE RESTRICT,
  content_type TEXT NOT NULL CHECK (content_type IN ('NOTICE', 'EMERGENCY')),
  
  -- 시간 정보 (두 방식 모두 지원)
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  
  -- 반복 설정
  recurrence_rule JSONB,
  
  -- 상태 및 우선순위
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 200,
  last_executed_at TIMESTAMPTZ,
  
  -- 대상 전광판
  display_ids JSONB NOT NULL DEFAULT '["*"]'::jsonb,
  
  -- 메타데이터
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- 제약 조건
  CONSTRAINT valid_time_range CHECK (end_at > start_at),
  CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 1000)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_schedules_is_active ON schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedules_start_end ON schedules(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_schedules_priority ON schedules(priority);
CREATE INDEX IF NOT EXISTS idx_schedules_last_executed ON schedules(last_executed_at);
CREATE INDEX IF NOT EXISTS idx_schedules_display_ids ON schedules USING GIN(display_ids);

-- 코멘트
COMMENT ON TABLE schedules IS '전광판 스케줄 (예약/반복 송출)';
COMMENT ON COLUMN schedules.name IS '스케줄 이름';
COMMENT ON COLUMN schedules.start_at IS '시작 시간 (KST)';
COMMENT ON COLUMN schedules.end_at IS '종료 시간 (KST)';
COMMENT ON COLUMN schedules.recurrence_rule IS '반복 규칙 (JSONB)';
COMMENT ON COLUMN schedules.is_active IS '활성화 상태';
COMMENT ON COLUMN schedules.priority IS '우선순위 (낮을수록 높음: EMERGENCY=100, NOTICE=200, WEATHER=300)';
COMMENT ON COLUMN schedules.last_executed_at IS '마지막 실행 시간';
```

**recurrence_rule 예시**:
```json
{
  "freq": "DAILY",
  "interval": 1,
  "byweekday": [1, 3, 5]
}
```

---

### 4.2 schedule_executions 테이블

**목적**: 스케줄 실행 이력 추적

```sql
CREATE TABLE IF NOT EXISTS schedule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 관계
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE RESTRICT,
  
  -- 실행 정보
  executed_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  
  -- 실행 컨텍스트
  execution_context JSONB,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- 제약 조건
  CONSTRAINT check_error_message CHECK (
    (status = 'failed' AND error_message IS NOT NULL) OR
    (status = 'success')
  )
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_schedule_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_executed_at ON schedule_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_status ON schedule_executions(status);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_composite ON schedule_executions(schedule_id, executed_at DESC);

-- 코멘트
COMMENT ON TABLE schedule_executions IS '스케줄 실행 이력';
COMMENT ON COLUMN schedule_executions.executed_at IS '실행 시간';
COMMENT ON COLUMN schedule_executions.status IS '실행 결과 (success, failed)';
COMMENT ON COLUMN schedule_executions.execution_context IS '실행 당시의 추가 정보 (JSONB)';
```

**execution_context 예시**:
```json
{
  "schedule_name": "긴급 공지",
  "template_name": "방역 안내",
  "priority": 100,
  "display_count": 2
}
```

---

### 4.3 display_current_state 테이블

**목적**: 전광판별 현재 송출 상태 관리

```sql
CREATE TABLE IF NOT EXISTS display_current_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 현재 송출 정보
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'schedule', 'weather')),
  source_id UUID,  -- schedule_id or NULL
  
  -- 우선순위 및 타입
  content_type TEXT NOT NULL CHECK (content_type IN ('EMERGENCY', 'NOTICE', 'WEATHER')),
  priority INTEGER NOT NULL,
  
  -- 시간 정보
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  -- 메타데이터
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- 제약 조건
  CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > activated_at)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_display_current_state_template ON display_current_state(template_id);
CREATE INDEX IF NOT EXISTS idx_display_current_state_source ON display_current_state(source, source_id);
CREATE INDEX IF NOT EXISTS idx_display_current_state_active ON display_current_state(activated_at, expires_at);

-- 코멘트
COMMENT ON TABLE display_current_state IS '현재 송출 상태 (단일 레코드 유지)';
COMMENT ON COLUMN display_current_state.source IS '송출 방식 (manual=수동, schedule=스케줄, weather=날씨)';
COMMENT ON COLUMN display_current_state.source_id IS '출처 ID (schedule_id 등)';
COMMENT ON COLUMN display_current_state.activated_at IS '송출 시작 시간';
COMMENT ON COLUMN display_current_state.expires_at IS '송출 종료 시간 (NULL=무제한)';
```

---

### 4.4 display_settings 테이블

**목적**: 전광판 UI 설정 관리

```sql
CREATE TABLE IF NOT EXISTS display_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 위치 및 크기
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  scale_x DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
  scale_y DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
  
  -- 표시 옵션
  show_border BOOLEAN NOT NULL DEFAULT true,
  
  -- 메타데이터
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- 제약 조건
  CONSTRAINT valid_scale CHECK (scale_x > 0 AND scale_y > 0 AND scale_x <= 5 AND scale_y <= 5)
);

-- 단일 레코드 보장 (싱글톤)
CREATE UNIQUE INDEX IF NOT EXISTS idx_display_settings_singleton ON display_settings((id IS NOT NULL));

-- 코멘트
COMMENT ON TABLE display_settings IS '전광판 UI 설정 (싱글톤)';
COMMENT ON COLUMN display_settings.position_x IS 'X 좌표 (px)';
COMMENT ON COLUMN display_settings.position_y IS 'Y 좌표 (px)';
COMMENT ON COLUMN display_settings.scale_x IS 'X축 배율 (0.01 ~ 5.00)';
COMMENT ON COLUMN display_settings.scale_y IS 'Y축 배율 (0.01 ~ 5.00)';
```

---

## 5. 마이그레이션 SQL 스크립트

### 5.1 완전한 마이그레이션 스크립트

**파일**: `/docs/05_development/POSTGRESQL_MIGRATION_COMPLETE.sql`

```sql
-- ================================================================
-- PostgreSQL 완전 마이그레이션 스크립트
-- 고양 스마트시티 리빙랩 - 전광판 송출 시스템
-- ================================================================

-- ================================================================
-- Step 1: schedules 테이블 확인 및 컬럼 추가
-- ================================================================

-- schedules 테이블 존재 확인 후 생성
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  content_type TEXT NOT NULL,
  display_ids JSONB NOT NULL DEFAULT '["*"]'::jsonb,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  recurrence_rule JSONB,
  priority INTEGER DEFAULT 200,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- name 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'name'
  ) THEN
    ALTER TABLE schedules ADD COLUMN name TEXT;
  END IF;
END $$;

-- is_active 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE schedules ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- last_executed_at 컬럼 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedules' AND column_name = 'last_executed_at'
  ) THEN
    ALTER TABLE schedules ADD COLUMN last_executed_at TIMESTAMPTZ;
  END IF;
END $$;

-- 제약 조건 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_time_range'
  ) THEN
    ALTER TABLE schedules 
    ADD CONSTRAINT valid_time_range CHECK (end_at > start_at);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_priority'
  ) THEN
    ALTER TABLE schedules 
    ADD CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 1000);
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_schedules_is_active ON schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedules_start_end ON schedules(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_schedules_priority ON schedules(priority);
CREATE INDEX IF NOT EXISTS idx_schedules_last_executed ON schedules(last_executed_at);
CREATE INDEX IF NOT EXISTS idx_schedules_display_ids ON schedules USING GIN(display_ids);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign Key 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_schedule_executions_schedule'
  ) THEN
    ALTER TABLE schedule_executions 
    ADD CONSTRAINT fk_schedule_executions_schedule 
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_schedule_executions_template'
  ) THEN
    ALTER TABLE schedule_executions 
    ADD CONSTRAINT fk_schedule_executions_template 
    FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_schedule_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_executed_at ON schedule_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_status ON schedule_executions(status);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_composite ON schedule_executions(schedule_id, executed_at DESC);

-- ================================================================
-- Step 3: display_current_state 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS display_current_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  source TEXT NOT NULL CHECK (source IN ('manual', 'schedule', 'weather')),
  source_id UUID,
  content_type TEXT NOT NULL CHECK (content_type IN ('EMERGENCY', 'NOTICE', 'WEATHER')),
  priority INTEGER NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > activated_at)
);

-- Foreign Key 추가
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_display_current_state_template'
  ) THEN
    ALTER TABLE display_current_state 
    ADD CONSTRAINT fk_display_current_state_template 
    FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_display_current_state_template ON display_current_state(template_id);
CREATE INDEX IF NOT EXISTS idx_display_current_state_source ON display_current_state(source, source_id);
CREATE INDEX IF NOT EXISTS idx_display_current_state_active ON display_current_state(activated_at, expires_at);

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

-- 싱글톤 보장 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_display_settings_singleton ON display_settings((id IS NOT NULL));

-- 초기 데이터 삽입 (없을 경우)
INSERT INTO display_settings (position_x, position_y, scale_x, scale_y, show_border)
SELECT 0, 0, 1.00, 1.00, true
WHERE NOT EXISTS (SELECT 1 FROM display_settings);

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

-- schedules 트리거
DROP TRIGGER IF EXISTS trg_schedules_updated_at ON schedules;
CREATE TRIGGER trg_schedules_updated_at
BEFORE UPDATE ON schedules
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- display_current_state 트리거
DROP TRIGGER IF EXISTS trg_display_current_state_updated_at ON display_current_state;
CREATE TRIGGER trg_display_current_state_updated_at
BEFORE UPDATE ON display_current_state
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- display_settings 트리거
DROP TRIGGER IF EXISTS trg_display_settings_updated_at ON display_settings;
CREATE TRIGGER trg_display_settings_updated_at
BEFORE UPDATE ON display_settings
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ================================================================
-- Step 6: 코멘트 추가
-- ================================================================

COMMENT ON TABLE schedules IS '전광판 스케줄 (예약/반복 송출)';
COMMENT ON TABLE schedule_executions IS '스케줄 실행 이력';
COMMENT ON TABLE display_current_state IS '현재 송출 상태 (단일 레코드)';
COMMENT ON TABLE display_settings IS '전광판 UI 설정 (싱글톤)';

-- ================================================================
-- 마이그레이션 완료
-- ================================================================

-- 테이블 목록 확인
SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('schedules', 'schedule_executions', 'display_current_state', 'display_settings')
ORDER BY table_name;
```

---

## 6. 코드 수정 가이드

### 6.1 schedule_db_helpers.ts 전체 교체

**변경 전**: KV Store 사용
**변경 후**: PostgreSQL 사용

주요 변경사항:
1. `kv.set()` → `supabase.from().insert()`
2. `kv.get()` → `supabase.from().select()`
3. `kv.del()` → `supabase.from().delete()`
4. 배열 인덱스 관리 제거 (schedules:all, schedules:active 불필요)

### 6.2 schedule_executor.ts 수정

**변경 내용**:
1. `sendTemplateToDisplay()` 함수 수정
   - KV Store → `display_current_state` 테이블
2. 실행 이력 저장 로직 단순화
   - try-catch 제거 (DB 사용 보장)
3. last_executed_at 업데이트 보장

### 6.3 server/index.tsx 디스플레이 관련 수정

**변경 내용**:
1. `POST /display/send` → `display_current_state` 테이블
2. `GET /display/current` → `display_current_state` 테이블
3. `PUT /display/settings` → `display_settings` 테이블

---

## 7. 마이그레이션 절차

### Step 1: DB 마이그레이션 실행

```bash
# Supabase Dashboard에서 SQL Editor 열기
# /docs/05_development/POSTGRESQL_MIGRATION_COMPLETE.sql 내용 복사
# 실행 후 결과 확인
```

### Step 2: 코드 수정 및 배포

1. `/supabase/functions/server/schedule_db_helpers.ts` 교체
2. `/supabase/functions/server/schedule_executor.ts` 수정
3. `/supabase/functions/server/index.tsx` 수정

### Step 3: 기존 KV Store 데이터 이관 (선택사항)

```typescript
// 데이터 마이그레이션 스크립트 (서버에서 1회 실행)
async function migrateKVToPostgresql() {
  // 스케줄 마이그레이션
  const scheduleIds = await kv.get<string[]>('schedules:all') || [];
  for (const id of scheduleIds) {
    const schedule = await kv.get(`schedule:${id}`);
    if (schedule) {
      await supabase.from('schedules').insert(schedule);
    }
  }
  
  // 실행 이력 마이그레이션
  const recentExecutions = await kv.get('schedule_executions:recent') || [];
  for (const execution of recentExecutions) {
    await supabase.from('schedule_executions').insert(execution);
  }
  
  // 현재 송출 상태 마이그레이션
  const currentTemplate = await kv.get('display:current_template');
  if (currentTemplate) {
    await supabase.from('display_current_state').insert({
      template_id: currentTemplate,
      source: 'manual',
      content_type: 'NOTICE',
      priority: 200
    });
  }
  
  // 디스플레이 설정 마이그레이션
  const settings = await kv.get('display:settings');
  if (settings) {
    await supabase.from('display_settings').update({
      position_x: settings.position.x,
      position_y: settings.position.y,
      scale_x: settings.scaleX,
      scale_y: settings.scaleY,
      show_border: settings.showBorder
    }).eq('id', (await supabase.from('display_settings').select('id').single()).data.id);
  }
}
```

### Step 4: 검증

1. 스케줄 생성/수정/삭제 테스트
2. 스케줄 자동 실행 테스트
3. 실행 이력 조회 테스트
4. Audit Log 생성 확인

---

## 8. 검증 방법

### 8.1 테이블 확인

```sql
-- 테이블 존재 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('schedules', 'schedule_executions', 'display_current_state', 'display_settings');

-- 스케줄 개수 확인
SELECT COUNT(*) as schedule_count FROM schedules;

-- 실행 이력 개수 확인
SELECT COUNT(*) as execution_count FROM schedule_executions;

-- 최근 실행 이력 확인
SELECT * FROM schedule_executions 
ORDER BY executed_at DESC 
LIMIT 10;
```

### 8.2 데이터 무결성 확인

```sql
-- Foreign Key 제약 확인
SELECT conname, contype, confupdtype, confdeltype
FROM pg_constraint
WHERE conrelid = 'schedule_executions'::regclass;

-- 인덱스 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'schedules';
```

### 8.3 성능 테스트

```sql
-- 활성 스케줄 조회 (인덱스 사용 확인)
EXPLAIN ANALYZE
SELECT * FROM schedules 
WHERE is_active = true 
ORDER BY priority, start_at;

-- 실행 이력 조회 (인덱스 사용 확인)
EXPLAIN ANALYZE
SELECT * FROM schedule_executions 
WHERE schedule_id = 'abc-123' 
ORDER BY executed_at DESC 
LIMIT 50;
```

---

## 9. 롤백 계획

### 9.1 코드 롤백

```bash
# Git을 사용하여 이전 버전으로 복구
git checkout <previous_commit_hash>
```

### 9.2 DB 롤백 (필요시)

```sql
-- 새로운 테이블 삭제 (주의: 데이터 손실)
DROP TABLE IF EXISTS display_settings CASCADE;
DROP TABLE IF EXISTS display_current_state CASCADE;
DROP TABLE IF EXISTS schedule_executions CASCADE;

-- schedules 테이블 컬럼 제거 (주의: 데이터 손실)
ALTER TABLE schedules DROP COLUMN IF EXISTS name;
ALTER TABLE schedules DROP COLUMN IF EXISTS is_active;
ALTER TABLE schedules DROP COLUMN IF EXISTS last_executed_at;
```

---

## 10. 문서 히스토리

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0.0 | 2024-12-19 | AI Assistant | 초안 작성 |

---

**참고 문서**:
- [02_erd.md](../02_design/02_erd.md)
- [SUPABASE_FIX_ALL.sql](../SUPABASE_FIX_ALL.sql)
- [SCHEDULE_EXECUTION_INSPECTION.md](../00_meta/SCHEDULE_EXECUTION_INSPECTION.md)