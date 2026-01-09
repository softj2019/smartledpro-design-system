# 스케줄 실행 시스템 검수 보고서

**작성일**: 2024-12-19
**검수자**: AI Assistant
**검수 목적**: 스케줄 실행 로그 미생성 문제 원인 파악 및 해결

---

## 🔍 검수 범위

1. 스케줄 자동 실행 시스템 전체 로직
2. DB 스키마와 코드 간 불일치
3. Audit Log 생성 여부
4. 실행 이력 저장 여부
5. 프론트엔드-서버 통신

---

## ⚠️ 발견된 문제점

### 🔴 Critical: DB 스키마 불일치

#### 문제 1: schedules 테이블 스키마 불일치

**초기 마이그레이션 파일** (`/supabase/migrations/20241216000001_initial_schema.sql`):
```sql
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES message_templates(id) ON DELETE RESTRICT,
  content_type TEXT NOT NULL CHECK (content_type IN ('NOTICE', 'EMERGENCY')),
  display_ids JSONB NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  recurrence_rule JSONB,
  priority INTEGER DEFAULT 200,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**서버 코드가 기대하는 스키마** (`/docs/SUPABASE_FIX_ALL.sql`):
```sql
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_id UUID NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,  -- ❌ start_at이 아님
  end_datetime TIMESTAMPTZ,             -- ❌ end_at이 아님
  display_duration_type TEXT NOT NULL DEFAULT '5min',
  display_duration_minutes INTEGER,
  repeat_type TEXT NOT NULL DEFAULT 'none',
  repeat_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,  -- ❌ 초기 스키마에 없음
  priority INTEGER NOT NULL DEFAULT 5,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_executed_at TIMESTAMPTZ  -- ❌ 초기 스키마에 없음
);
```

**결과**: 
- 서버 코드가 `start_at`, `end_at`을 `start_datetime`, `end_datetime`으로 변환하려고 시도
- `is_active`, `last_executed_at`, `name` 컬럼이 없어서 조회 실패 가능성
- 필드명 불일치로 인한 쿼리 오류

#### 문제 2: schedule_executions 테이블 부재

**초기 마이그레이션에 없음**:
- `schedule_executions` 테이블이 전혀 정의되지 않음

**서버 코드 의존성**:
```typescript
// schedule_db_helpers.ts:189
export async function createScheduleExecution(
  execution: ScheduleExecution
): Promise<void> {
  const { error } = await supabase
    .from('schedule_executions')  // ❌ 테이블이 없음
    .insert({...});
}
```

**결과**: 
- 실행 이력 저장 시도 시 테이블 없음 오류 발생
- 스케줄 실행 로그가 전혀 생성되지 않음

---

### 🟡 Medium: 서버 로직 문제

#### 문제 3: start_at/start_datetime 필드명 혼용

**서버 index.tsx** (라인 58-83):
```typescript
function convertScheduleForFrontend(schedule: scheduleHelpers.Schedule): any {
  return {
    id: schedule.id,
    name: schedule.name,
    template_id: schedule.template_id,
    start_datetime: schedule.start_at,  // ✅ 변환 시도
    end_datetime: schedule.end_at,      // ✅ 변환 시도
    // ...
  };
}
```

**schedule_db_helpers.ts** (라인 23-38):
```typescript
export interface Schedule {
  id: string;
  name?: string;
  template_id: string | null;
  content_type: string;
  display_ids: string[];
  start_at: string;  // ❌ DB 스키마 기준
  end_at: string;    // ❌ DB 스키마 기준
  // ...
  is_active?: boolean;
  last_executed_at?: string;
}
```

**schedule_executor.ts** (라인 50-70):
```typescript
function getCurrentKST(): Date {
  // KST 시간 계산
}

function shouldExecuteSchedule(
  schedule: scheduleHelpers.Schedule,
  currentTime: Date
): boolean {
  const startDate = new Date(schedule.start_datetime);  // ❌ start_datetime는 Schedule 타입에 없음
  // ...
}
```

**결과**: 
- TypeScript 타입 오류 발생 가능성
- 런타임에서 undefined 접근 가능성

#### 문제 4: 스케줄 조건 체크 로직

**schedule_executor.ts** (라인 119-134):
```typescript
if (schedule.last_executed_at) {
  const lastExecuted = new Date(schedule.last_executed_at);
  const diffMinutes = (currentTime.getTime() - lastExecuted.getTime()) / (1000 * 60);
  
  // 마지막 실행이 1분 이내라면 실행하지 않음
  if (diffMinutes < 1) {
    return false;
  }
}
```

**문제**:
- `last_executed_at`가 DB에 없으면 항상 undefined
- 중복 실행 방지가 작동하지 않음

---

### 🟢 Low: 로깅 및 모니터링

#### 문제 5: 서버 로그는 있으나 클라이언트 로그 부족

**서버 로그**:
```typescript
console.log(`[Schedule Executor] Checking schedules at ${currentTime.toISOString()}`);
console.log(`[Schedule Executor] Found ${activeSchedules.length} active schedules`);
```

**클라이언트 로그**:
```typescript
// useScheduleExecutor.ts:36
if (result.executed) {
  logger.info('ScheduleExecutor', '스케줄 자동 실행 성공', {...});
}
```

**결과**: 
- 서버 콘솔 로그는 정상 작동
- 클라이언트 디버그 로거로 확인 가능
- 하지만 실제 실행이 안되면 로그도 없음

---

## 🔧 근본 원인 분석

### 시나리오 재구성

1. **1분마다 클라이언트가 `/schedules/check-and-execute` 호출**
   - ✅ 정상: useScheduleExecutor hook이 App.tsx에서 실행 중

2. **서버가 활성 스케줄 조회 시도**
   ```typescript
   const activeSchedules = await scheduleHelpers.getActiveSchedules();
   ```
   - ⚠️ 문제 가능성: DB 스키마 불일치로 조회 실패
   - 또는 is_active 필드가 없어서 필터링 안됨

3. **스케줄 실행 조건 체크**
   ```typescript
   const schedulesToExecute = activeSchedules.filter(schedule => 
     shouldExecuteSchedule(schedule, currentTime)
   );
   ```
   - ⚠️ 문제 가능성: `schedule.start_datetime`가 undefined

4. **실행 이력 저장 시도**
   ```typescript
   await scheduleHelpers.createScheduleExecution(execution);
   ```
   - ❌ 실패: `schedule_executions` 테이블 없음

5. **Audit Log 생성 시도**
   ```typescript
   await createExecutionAuditLog(...);
   ```
   - ✅ 정상: audit_logs 테이블 존재
   - 하지만 4번에서 실패하면 도달하지 못함

---

## ✅ 해결 방안

### 방안 A: DB 스키마 업데이트 (권장하지 않음)

사용자가 명시적으로 "DDL statements cannot be run"이라고 언급했으므로 이 방안은 불가능합니다.

### 방안 B: 코드를 현재 DB 스키마에 맞게 수정 (✅ 권장)

#### 수정 1: schedule_db_helpers.ts 타입 수정

```typescript
export interface Schedule {
  id: string;
  name?: string;
  template_id: string | null;
  content_type: string;
  display_ids: string[];
  start_at: string;  // DB 컬럼명 유지
  end_at: string;    // DB 컬럼명 유지
  recurrence_rule: RecurrenceRule | null;
  priority: number;
  is_active?: boolean;  // 옵셔널로 유지
  last_executed_at?: string;  // 옵셔널로 유지
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
```

#### 수정 2: schedule_executor.ts 필드명 수정

```typescript
function shouldExecuteSchedule(
  schedule: scheduleHelpers.Schedule,
  currentTime: Date
): boolean {
  const startDate = new Date(schedule.start_at);  // ✅ 수정
  const endDate = schedule.end_at ? new Date(schedule.end_at) : null;  // ✅ 수정
  // ... 나머지 로직
}
```

#### 수정 3: schedule_executions를 KV Store로 대체

```typescript
// 실행 이력을 KV Store에 저장
async function saveExecutionToKV(execution: ScheduleExecution) {
  const key = `schedule_execution:${execution.id}`;
  await kv.set(key, execution);
  
  // 최근 실행 목록에 추가 (최대 100개)
  const recentKey = `schedule_executions:recent`;
  const recent = await kv.get(recentKey) || [];
  recent.unshift(execution);
  if (recent.length > 100) recent.pop();
  await kv.set(recentKey, recent);
}
```

#### 수정 4: last_executed_at을 KV Store로 관리

```typescript
// 마지막 실행 시간을 KV Store에 저장
await kv.set(`schedule:${scheduleId}:last_executed_at`, executedAt);

// 조회 시
const lastExecuted = await kv.get(`schedule:${scheduleId}:last_executed_at`);
```

### 방안 C: Hybrid 접근 (✅ 최종 권장)

1. **is_active 처리**: 
   - DB에 컬럼이 있으면 사용, 없으면 모든 스케줄을 활성으로 간주
   - `schedules.filter(s => s.is_active !== false)` (이미 구현됨)

2. **last_executed_at 처리**:
   - DB에 컬럼이 있으면 사용, 없으면 KV Store 사용
   - 먼저 DB 조회, 없으면 KV Store 조회

3. **schedule_executions 처리**:
   - DB 테이블이 있으면 사용, 없으면 KV Store 사용
   - Try-catch로 DB 저장 시도 후 실패하면 KV Store로 폴백

4. **필드명 통일**:
   - `start_datetime` → `start_at`
   - `end_datetime` → `end_at`
   - 서버 코드 전체에서 일관성 유지

---

## 📋 수정 체크리스트

### High Priority (즉시 수정 필요)

- [ ] `schedule_executor.ts`: `start_datetime` → `start_at` 수정
- [ ] `schedule_executor.ts`: `end_datetime` → `end_at` 수정
- [ ] `schedule_executor.ts`: `createScheduleExecution` 호출 부분 try-catch 추가
- [ ] `schedule_db_helpers.ts`: `schedule_executions` 테이블 부재 시 KV Store 폴백 구현
- [ ] `schedule_executor.ts`: `last_executed_at` DB/KV Store hybrid 처리

### Medium Priority (기능 개선)

- [ ] 에러 핸들링 강화: DB 조회 실패 시 명확한 로그
- [ ] Audit Log 생성 보장: 실행 실패해도 로그는 남기기
- [ ] 디버그 로그 추가: 각 단계별 상태 확인

### Low Priority (추후 개선)

- [ ] TypeScript 타입 엄격화
- [ ] 단위 테스트 추가
- [ ] 스케줄 실행 통계 대시보드

---

## 🎯 검수 결론

### 스케줄 실행 로그가 생성되지 않는 이유

1. **DB 스키마와 코드 불일치**로 인한 실행 실패
2. **schedule_executions 테이블 부재**로 실행 이력 저장 실패
3. **필드명 혼용**으로 인한 런타임 오류

### 권장 조치

즉시 코드 수정을 통해 현재 DB 스키마와 호환되도록 변경하고, 
schedule_executions는 KV Store로 대체하여 실증 시연 가능한 상태로 복구합니다.

---

**다음 단계**: 코드 수정 시작
