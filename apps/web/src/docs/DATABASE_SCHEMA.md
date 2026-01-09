# Database Schema - 전광판 관리 시스템

## 📋 목차
- [개요](#개요)
- [ERD (Entity Relationship Diagram)](#erd-entity-relationship-diagram)
- [테이블 상세](#테이블-상세)
- [인덱스](#인덱스)
- [마이그레이션 스크립트](#마이그레이션-스크립트)
- [데이터 타입 정의](#데이터-타입-정의)

---

## 개요

### 데이터베이스 타입
**PostgreSQL** (Supabase 제공)

### 네이밍 규칙
- 테이블명: `snake_case` (복수형)
- 컬럼명: `snake_case`
- Primary Key: `id` (UUID)
- Foreign Key: `{table_name}_id`
- Timestamp: `created_at`, `updated_at`

### 공통 규칙
- 모든 테이블은 `id` (UUID) Primary Key 사용
- `created_at`, `updated_at` timestamp 필드 포함
- Foreign Key는 `ON DELETE` 정책 명시
- JSONB 타입으로 유연한 데이터 구조 지원

---

## ERD (Entity Relationship Diagram)

```
┌─────────────────────┐
│   auth.users        │
│  (Supabase Auth)    │
└──────────┬──────────┘
           │
           │ created_by (FK)
           │
    ┌──────┴────────────────────┬─────────────────────┐
    │                           │                     │
    ▼                           ▼                     ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐
│ message_templates   │  │    schedules        │  │   audit_logs       │
│                     │  │                     │  │                    │
│ - id (PK)           │  │ - id (PK)           │  │ - id (PK)          │
│ - name              │  │ - name              │  │ - user_id (FK)     │
│ - title             │  │ - template_id (FK)──┼──┤ - action           │
│ - body              │  │ - start_at          │  │ - resource_type    │
│ - category          │  │ - end_at            │  │ - resource_id      │
│ - created_by (FK)   │  │ - recurrence_rule   │  │ - created_at       │
└──────────┬──────────┘  │ - priority          │  └────────────────────┘
           │             │ - is_active         │
           │             │ - created_by (FK)   │
           │             └──────────┬──────────┘
           │                        │
           │                        │ schedule_id (FK)
           │                        │
           │                        ▼
           │             ┌─────────────────────┐
           │             │ schedule_executions │
           │             │                     │
           │             │ - id (PK)           │
           │             │ - schedule_id (FK)  │
           │             │ - template_id (FK)──┼───┐
           │             │ - executed_at       │   │
           │             │ - status            │   │
           │             └─────────────────────┘   │
           │                                       │
           └───────────────────────────────────────┘
           │
           │ template_id (FK)
           │
           ▼
┌─────────────────────────┐       ┌─────────────────────┐
│ display_current_state   │       │  display_settings   │
│ (Singleton)             │       │  (Singleton)        │
│                         │       │                     │
│ - id (PK)               │       │ - id (PK)           │
│ - template_id (FK) ─────┼───────┤ - default_template  │
│ - source                │       │   _id (FK)          │
│ - priority              │       │ - refresh_interval  │
│ - activated_at          │       └─────────────────────┘
└─────────────────────────┘
```

---

## 테이블 상세

### 1. `message_templates` - 메시지 템플릿

**설명**: 전광판에 표시될 메시지 템플릿을 저장합니다.

**컬럼**:

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| name | TEXT | NO | - | 템플릿 이름 (관리용) |
| title | TEXT | NO | - | 제목 (전광판 표시) |
| body | TEXT | NO | - | 본문 (전광판 표시) |
| highlight | TEXT | YES | NULL | 강조 문구 (선택) |
| style_config | JSONB | YES | '{}' | 스타일 설정 (색상, 폰트 등) |
| category | TEXT | YES | 'general' | 카테고리 (emergency/notice/weather/general/event) |
| version | INTEGER | YES | 1 | 템플릿 버전 (수정 시 증가) |
| created_by | UUID | YES | - | 생성한 사용자 ID (FK → auth.users) |
| created_at | TIMESTAMPTZ | YES | NOW() | 생성 일시 |
| updated_at | TIMESTAMPTZ | YES | NOW() | 수정 일시 |

**인덱스**:
- PRIMARY KEY: `id`
- INDEX: `category` (카테고리별 조회 최적화)
- INDEX: `created_by` (사용자별 조회 최적화)

**제약조건**:
- `category` CHECK: IN ('emergency', 'notice', 'weather', 'general', 'event')

**생성 SQL**:
```sql
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  highlight TEXT,
  style_config JSONB DEFAULT '{}',
  category TEXT DEFAULT 'general' CHECK (category IN ('emergency', 'notice', 'weather', 'general', 'event')),
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_templates_category ON message_templates(category);
CREATE INDEX idx_message_templates_created_by ON message_templates(created_by);
```

---

### 2. `schedules` - 스케줄

**설명**: 템플릿 송출 스케줄을 관리합니다.

**컬럼**:

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| name | TEXT | NO | - | 스케줄 이름 |
| template_id | UUID | YES | - | 템플릿 ID (FK → message_templates) |
| content_type | TEXT | NO | - | 콘텐츠 타입 (EMERGENCY/NOTICE/WEATHER) |
| display_ids | JSONB | YES | '[]' | 대상 전광판 ID 배열 (빈 배열 = 전체) |
| start_at | TIMESTAMPTZ | NO | - | 시작 날짜/시간 |
| end_at | TIMESTAMPTZ | YES | NULL | 종료 날짜 (NULL = 무기한) |
| recurrence_rule | JSONB | YES | NULL | 반복 규칙 (RRule 형식) |
| priority | INTEGER | YES | 200 | 우선순위 (작을수록 높음) |
| is_active | BOOLEAN | YES | TRUE | 활성화 상태 |
| display_duration_type | TEXT | YES | NULL | 표시 시간 타입 (1min/5min/10min/all-day/custom) |
| display_duration_minutes | INTEGER | YES | NULL | 표시 시간 (분, custom일 때만 사용) |
| last_executed_at | TIMESTAMPTZ | YES | NULL | 마지막 실행 일시 |
| created_by | UUID | YES | - | 생성한 사용자 ID (FK → auth.users) |
| created_at | TIMESTAMPTZ | YES | NOW() | 생성 일시 |
| updated_at | TIMESTAMPTZ | YES | NOW() | 수정 일시 |

**인덱스**:
- PRIMARY KEY: `id`
- INDEX: `template_id` (템플릿별 조회)
- INDEX: `is_active` (활성 스케줄 조회)
- INDEX: `start_at` (시작 시간 검색)
- INDEX: `priority` (우선순위 정렬)

**제약조건**:
- `content_type` CHECK: IN ('EMERGENCY', 'NOTICE', 'WEATHER')
- `display_duration_type` CHECK: IN ('1min', '5min', '10min', 'all-day', 'custom')
- `priority` CHECK: >= 0 AND <= 1000

**생성 SQL**:
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_id UUID REFERENCES message_templates(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('EMERGENCY', 'NOTICE', 'WEATHER')),
  display_ids JSONB DEFAULT '[]',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  recurrence_rule JSONB,
  priority INTEGER DEFAULT 200 CHECK (priority >= 0 AND priority <= 1000),
  is_active BOOLEAN DEFAULT TRUE,
  display_duration_type TEXT CHECK (display_duration_type IN ('1min', '5min', '10min', 'all-day', 'custom')),
  display_duration_minutes INTEGER,
  last_executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedules_template_id ON schedules(template_id);
CREATE INDEX idx_schedules_is_active ON schedules(is_active);
CREATE INDEX idx_schedules_start_at ON schedules(start_at);
CREATE INDEX idx_schedules_priority ON schedules(priority);
```

**recurrence_rule JSONB 예시**:
```json
{
  "freq": "WEEKLY",
  "interval": 1,
  "byweekday": [0, 2, 4]
}
```

---

### 3. `schedule_executions` - 스케줄 실행 이력

**설명**: 스케줄 실행 이력을 기록합니다.

**컬럼**:

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| schedule_id | UUID | YES | - | 스케줄 ID (FK → schedules) |
| template_id | UUID | YES | - | 템플릿 ID (FK → message_templates) |
| executed_at | TIMESTAMPTZ | YES | NOW() | 실행 일시 |
| status | TEXT | YES | - | 실행 상태 (success/failed/skipped) |
| details | JSONB | YES | NULL | 상세 정보 |

**인덱스**:
- PRIMARY KEY: `id`
- INDEX: `schedule_id` (스케줄별 조회)
- INDEX: `executed_at` (시간순 정렬)
- INDEX: `status` (상태별 필터)

**생성 SQL**:
```sql
CREATE TABLE schedule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('success', 'failed', 'skipped')),
  details JSONB
);

CREATE INDEX idx_schedule_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX idx_schedule_executions_executed_at ON schedule_executions(executed_at DESC);
CREATE INDEX idx_schedule_executions_status ON schedule_executions(status);
```

**details JSONB 예시**:
```json
{
  "priority": 200,
  "replaced": false,
  "current_priority": null,
  "message": "Successfully executed"
}
```

---

### 4. `display_current_state` - 현재 송출 상태 (싱글톤)

**설명**: 현재 전광판에 송출 중인 템플릿 정보를 저장합니다. 싱글톤 패턴 (레코드 1개만 유지).

**컬럼**:

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| template_id | UUID | YES | - | 현재 송출 중인 템플릿 ID (FK → message_templates) |
| source | TEXT | YES | - | 송출 소스 (manual/schedule/default) |
| source_id | UUID | YES | NULL | 소스 ID (스케줄 ID 등) |
| content_type | TEXT | YES | - | 콘텐츠 타입 (EMERGENCY/NOTICE/WEATHER) |
| priority | INTEGER | YES | - | 우선순위 |
| activated_at | TIMESTAMPTZ | YES | NOW() | 활성화 일시 |
| expires_at | TIMESTAMPTZ | YES | NULL | 만료 일시 (NULL = 무기한) |

**인덱스**:
- PRIMARY KEY: `id`

**제약조건**:
- 테이블에 레코드 1개만 유지 (애플리케이션 레벨에서 관리)

**생성 SQL**:
```sql
CREATE TABLE display_current_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  source TEXT CHECK (source IN ('manual', 'schedule', 'default')),
  source_id UUID,
  content_type TEXT CHECK (content_type IN ('EMERGENCY', 'NOTICE', 'WEATHER')),
  priority INTEGER,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

**싱글톤 관리 로직**:
```typescript
// 새로운 상태 저장 전 기존 레코드 모두 삭제
await supabase.from('display_current_state').delete().neq('id', '00000000-0000-0000-0000-000000000000');
await supabase.from('display_current_state').insert({ ... });
```

---

### 5. `display_settings` - 전광판 설정

**설명**: 전광판 기본 설정을 저장합니다. 싱글톤 패턴.

**컬럼**:

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| default_template_id | UUID | YES | NULL | 기본 템플릿 ID (FK → message_templates) |
| refresh_interval | INTEGER | YES | 10 | 자동 새로고침 간격 (초) |
| created_at | TIMESTAMPTZ | YES | NOW() | 생성 일시 |
| updated_at | TIMESTAMPTZ | YES | NOW() | 수정 일시 |

**생성 SQL**:
```sql
CREATE TABLE display_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  refresh_interval INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 6. `audit_logs` - 감사 로그

**설명**: 모든 시스템 활동을 기록합니다.

**컬럼**:

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| user_id | UUID | YES | - | 사용자 ID (FK → auth.users) |
| user_email | TEXT | YES | - | 사용자 이메일 |
| user_role | TEXT | YES | - | 사용자 역할 (ADMIN/OPERATOR/VIEWER) |
| action | TEXT | NO | - | 액션 (CREATE/UPDATE/DELETE/EXECUTE/DISPLAY_SEND) |
| resource_type | TEXT | NO | - | 리소스 타입 (TEMPLATE/SCHEDULE/DISPLAY) |
| resource_id | UUID | YES | NULL | 리소스 ID |
| action_detail | JSONB | YES | NULL | 액션 상세 정보 |
| created_at | TIMESTAMPTZ | YES | NOW() | 생성 일시 |

**인덱스**:
- PRIMARY KEY: `id`
- INDEX: `user_id` (사용자별 조회)
- INDEX: `action` (액션별 필터)
- INDEX: `resource_type` (리소스 타입별 필터)
- INDEX: `created_at` (시간순 정렬)

**생성 SQL**:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT CHECK (user_role IN ('ADMIN', 'OPERATOR', 'VIEWER')),
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'DISPLAY_SEND', 'SCHEDULE_ACTIVATE', 'SCHEDULE_DEACTIVATE')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('TEMPLATE', 'SCHEDULE', 'DISPLAY', 'DISPLAY_SETTINGS')),
  resource_id UUID,
  action_detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

**action_detail JSONB 예시**:
```json
{
  "template_name": "주말 운영 안내",
  "category": "notice",
  "changes": ["title", "body"]
}
```

---

## 인덱스

### 성능 최적화를 위한 인덱스 전략

#### 1. Primary Key 인덱스 (자동 생성)
모든 테이블의 `id` 컬럼

#### 2. Foreign Key 인덱스
- `message_templates.created_by`
- `schedules.template_id`
- `schedules.created_by`
- `schedule_executions.schedule_id`
- `schedule_executions.template_id`
- `display_current_state.template_id`
- `audit_logs.user_id`

#### 3. 조회 성능 최적화 인덱스
- `message_templates.category` - 카테고리별 필터
- `schedules.is_active` - 활성 스케줄 조회
- `schedules.start_at` - 시간 범위 검색
- `schedules.priority` - 우선순위 정렬
- `schedule_executions.executed_at DESC` - 최근 실행 이력
- `schedule_executions.status` - 상태별 필터
- `audit_logs.action` - 액션별 필터
- `audit_logs.resource_type` - 리소스 타입별 필터
- `audit_logs.created_at DESC` - 최근 로그

#### 4. 복합 인덱스 (필요시 추가)
```sql
-- 활성 스케줄 + 시작 시간
CREATE INDEX idx_schedules_active_start ON schedules(is_active, start_at) WHERE is_active = TRUE;

-- 사용자별 최근 활동
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
```

---

## 마이그레이션 스크립트

### 전체 테이블 생성 스크립트

```sql
-- ================================================================
-- 고양 스마트시티 전광판 시스템 - 데이터베이스 초기화 스크립트
-- Version: 1.0
-- Date: 2024-12-19
-- ================================================================

-- 1. message_templates 테이블
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  highlight TEXT,
  style_config JSONB DEFAULT '{}',
  category TEXT DEFAULT 'general' CHECK (category IN ('emergency', 'notice', 'weather', 'general', 'event')),
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_templates_category ON message_templates(category);
CREATE INDEX idx_message_templates_created_by ON message_templates(created_by);

-- 2. schedules 테이블
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_id UUID REFERENCES message_templates(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('EMERGENCY', 'NOTICE', 'WEATHER')),
  display_ids JSONB DEFAULT '[]',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  recurrence_rule JSONB,
  priority INTEGER DEFAULT 200 CHECK (priority >= 0 AND priority <= 1000),
  is_active BOOLEAN DEFAULT TRUE,
  display_duration_type TEXT CHECK (display_duration_type IN ('1min', '5min', '10min', 'all-day', 'custom')),
  display_duration_minutes INTEGER,
  last_executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedules_template_id ON schedules(template_id);
CREATE INDEX idx_schedules_is_active ON schedules(is_active);
CREATE INDEX idx_schedules_start_at ON schedules(start_at);
CREATE INDEX idx_schedules_priority ON schedules(priority);

-- 3. schedule_executions 테이블
CREATE TABLE IF NOT EXISTS schedule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('success', 'failed', 'skipped')),
  details JSONB
);

CREATE INDEX idx_schedule_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX idx_schedule_executions_executed_at ON schedule_executions(executed_at DESC);
CREATE INDEX idx_schedule_executions_status ON schedule_executions(status);

-- 4. display_current_state 테이블
CREATE TABLE IF NOT EXISTS display_current_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  source TEXT CHECK (source IN ('manual', 'schedule', 'default')),
  source_id UUID,
  content_type TEXT CHECK (content_type IN ('EMERGENCY', 'NOTICE', 'WEATHER')),
  priority INTEGER,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 5. display_settings 테이블
CREATE TABLE IF NOT EXISTS display_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  refresh_interval INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. audit_logs 테이블
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT CHECK (user_role IN ('ADMIN', 'OPERATOR', 'VIEWER')),
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'DISPLAY_SEND', 'SCHEDULE_ACTIVATE', 'SCHEDULE_DEACTIVATE')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('TEMPLATE', 'SCHEDULE', 'DISPLAY', 'DISPLAY_SETTINGS')),
  resource_id UUID,
  action_detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ================================================================
-- 완료
-- ================================================================
```

### 마이그레이션: KV Store → PostgreSQL

Phase 1-4 개발 중 KV Store에서 PostgreSQL로 완전 마이그레이션을 진행했습니다.

**마이그레이션 된 항목**:
- ✅ `schedules` - KV Store → PostgreSQL 테이블
- ✅ `schedule_executions` - KV Store → PostgreSQL 테이블
- ✅ `display_current_state` - KV Store → PostgreSQL 테이블

**마이그레이션되지 않은 항목** (KV Store 유지):
- `display:settings` - 전광판 위치/크기 설정 (프론트엔드 전용)

---

## 데이터 타입 정의

### TypeScript 인터페이스

#### Schedule
```typescript
interface Schedule {
  id: string;
  name: string;
  template_id: string;
  content_type: 'EMERGENCY' | 'NOTICE' | 'WEATHER';
  display_ids: string[];
  start_at: string; // ISO 8601
  end_at: string | null; // ISO 8601 or null
  recurrence_rule: RecurrenceRule | null;
  priority: number;
  is_active: boolean;
  display_duration_type: '1min' | '5min' | '10min' | 'all-day' | 'custom' | null;
  display_duration_minutes: number | null;
  last_executed_at?: string; // ISO 8601
  created_by: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

#### RecurrenceRule
```typescript
interface RecurrenceRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  byweekday?: number[]; // 0=Monday, 6=Sunday
  bymonthday?: number[];
  count?: number;
  until?: string; // ISO 8601
}
```

#### Template
```typescript
interface Template {
  id: string;
  name: string;
  title: string;
  body: string;
  highlight?: string | null;
  style_config: Record<string, any>;
  category: 'emergency' | 'notice' | 'weather' | 'general' | 'event';
  version: number;
  created_by: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

#### ScheduleExecution
```typescript
interface ScheduleExecution {
  id: string;
  schedule_id: string;
  template_id: string;
  executed_at: string; // ISO 8601
  status: 'success' | 'failed' | 'skipped';
  details: Record<string, any>;
}
```

#### AuditLog
```typescript
interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  user_role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'DISPLAY_SEND' | 'SCHEDULE_ACTIVATE' | 'SCHEDULE_DEACTIVATE';
  resource_type: 'TEMPLATE' | 'SCHEDULE' | 'DISPLAY' | 'DISPLAY_SETTINGS';
  resource_id: string | null;
  action_detail: Record<string, any>;
  created_at: string; // ISO 8601
}
```

---

## 백업 및 복구

### 백업 스크립트 (pg_dump)
```bash
# 전체 백업
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d).sql

# 특정 테이블만 백업
pg_dump -h db.xxx.supabase.co -U postgres -d postgres -t schedules -t schedule_executions > schedules_backup.sql
```

### 복구 스크립트 (psql)
```bash
# 전체 복구
psql -h db.xxx.supabase.co -U postgres -d postgres < backup_20241219.sql

# 특정 테이블 복구
psql -h db.xxx.supabase.co -U postgres -d postgres < schedules_backup.sql
```

---

## 성능 튜닝

### 1. VACUUM 및 ANALYZE
```sql
-- 정기적으로 실행하여 성능 유지
VACUUM ANALYZE message_templates;
VACUUM ANALYZE schedules;
VACUUM ANALYZE schedule_executions;
VACUUM ANALYZE audit_logs;
```

### 2. 오래된 데이터 정리
```sql
-- 6개월 이상 오래된 audit_logs 삭제
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '6 months';

-- 1년 이상 오래된 schedule_executions 삭제
DELETE FROM schedule_executions WHERE executed_at < NOW() - INTERVAL '1 year';
```

### 3. 쿼리 성능 분석
```sql
-- 느린 쿼리 분석
EXPLAIN ANALYZE SELECT * FROM schedules WHERE is_active = TRUE ORDER BY priority;

-- 인덱스 사용 확인
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

---

## 데이터 무결성

### Foreign Key Cascade 정책

| 테이블 | Foreign Key | ON DELETE 정책 | 이유 |
|--------|-------------|----------------|------|
| message_templates | created_by | SET NULL | 사용자 삭제해도 템플릿 유지 |
| schedules | template_id | CASCADE | 템플릿 삭제 시 스케줄도 삭제 |
| schedules | created_by | SET NULL | 사용자 삭제해도 스케줄 유지 |
| schedule_executions | schedule_id | CASCADE | 스케줄 삭제 시 실행 이력도 삭제 |
| schedule_executions | template_id | SET NULL | 템플릿 삭제해도 실행 이력 유지 |
| audit_logs | user_id | SET NULL | 사용자 삭제해도 로그 유지 |

---

**문서 버전**: 1.0  
**최종 업데이트**: 2024-12-19  
**다음 리뷰 예정**: Phase 5 완료 후
