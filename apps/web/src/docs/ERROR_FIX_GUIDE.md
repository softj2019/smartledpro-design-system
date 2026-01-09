# 🚨 에러 해결 가이드

## ❌ 에러 메시지

```
Error: Failed to run sql query: ERROR: 42703: column "is_active" does not exist
Error: Failed to run sql query: ERROR: 42703: column "type" does not exist
```

---

## 🎯 즉시 해결 방법 (3단계)

### **1단계: 현재 테이블 상태 확인**

Supabase Dashboard → SQL Editor에서 다음을 실행:

```sql
-- 현재 테이블 구조 확인
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'message_templates'
ORDER BY ordinal_position;

SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;
```

### **2단계: 수정 SQL 실행**

**📁 파일 경로**: `/docs/SUPABASE_FIX_STEP_BY_STEP.sql`

1. 위 파일 전체 내용을 복사
2. Supabase Dashboard → SQL Editor에 붙여넣기
3. **Run** 버튼 클릭
4. 결과 확인 (✅ 메시지가 나타나면 성공)

### **3단계: 완료 확인**

다음 SQL을 실행하여 모든 컬럼이 있는지 확인:

```sql
-- message_templates 테이블 확인
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'message_templates'
  AND column_name IN ('id', 'name', 'content', 'type', 'is_active', 'variables', 'created_by', 'created_at', 'updated_at');

-- 9개 행이 나와야 합니다 ✅
```

---

## 🔍 에러가 계속 발생하는 경우

### **옵션 A: 테이블 완전 재생성**

⚠️ **경고**: 기존 데이터가 모두 삭제됩니다!

```sql
-- 1. 기존 테이블 삭제
DROP TABLE IF EXISTS schedule_executions CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS message_templates CASCADE;

-- 2. 그 다음 /docs/SUPABASE_FIX_STEP_BY_STEP.sql 실행
```

### **옵션 B: 각 컬럼 수동 추가**

기존 데이터를 보존하면서 컬럼만 추가:

```sql
-- type 컬럼 추가
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'NOTICE';

-- is_active 컬럼 추가
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- variables 컬럼 추가
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb;

-- 확인
SELECT column_name FROM information_schema.columns
WHERE table_name = 'message_templates';
```

---

## 📊 정상적인 테이블 구조

### **message_templates 테이블**

| 컬럼명 | 타입 | 필수 | 기본값 |
|--------|------|------|--------|
| id | UUID | ✅ | gen_random_uuid() |
| name | TEXT | ✅ | - |
| content | TEXT | ✅ | - |
| **type** | TEXT | ✅ | 'NOTICE' |
| **is_active** | BOOLEAN | ✅ | true |
| **variables** | JSONB | ❌ | '{}' |
| created_by | UUID | ✅ | - |
| created_at | TIMESTAMPTZ | ✅ | now() |
| updated_at | TIMESTAMPTZ | ✅ | now() |

### **schedules 테이블**

| 컬럼명 | 타입 | 필수 | 기본값 |
|--------|------|------|--------|
| id | UUID | ✅ | gen_random_uuid() |
| name | TEXT | ✅ | - |
| template_id | UUID | ✅ | - |
| start_datetime | TIMESTAMPTZ | ✅ | - |
| end_datetime | TIMESTAMPTZ | ❌ | - |
| display_duration_type | TEXT | ✅ | '5min' |
| display_duration_minutes | INTEGER | ❌ | - |
| repeat_type | TEXT | ✅ | 'none' |
| repeat_config | JSONB | ❌ | '{}' |
| **is_active** | BOOLEAN | ✅ | true |
| priority | INTEGER | ✅ | 5 |
| created_by | UUID | ✅ | - |
| created_at | TIMESTAMPTZ | ✅ | now() |
| updated_at | TIMESTAMPTZ | ✅ | now() |
| last_executed_at | TIMESTAMPTZ | ❌ | - |

---

## 🧪 테스트 쿼리

SQL 실행 후 다음 쿼리로 테스트:

```sql
-- 1. 테스트 템플릿 추가
INSERT INTO message_templates (name, content, type, is_active, created_by)
VALUES 
  ('테스트 템플릿', '<h1>테스트</h1>', 'NOTICE', true, '00000000-0000-0000-0000-000000000000')
RETURNING id, name, type, is_active;

-- 2. 추가된 템플릿 확인
SELECT id, name, type, is_active, created_at 
FROM message_templates 
ORDER BY created_at DESC 
LIMIT 1;

-- 3. schedules 테이블 테스트 (위에서 받은 template_id 사용)
INSERT INTO schedules (
  name, 
  template_id, 
  start_datetime, 
  display_duration_type,
  repeat_type,
  is_active,
  priority,
  created_by
)
VALUES (
  '테스트 스케줄',
  'YOUR_TEMPLATE_ID_HERE', -- 위 쿼리에서 받은 ID로 교체
  now() + interval '5 minutes',
  '5min',
  'none',
  true,
  5,
  '00000000-0000-0000-0000-000000000000'
)
RETURNING id, name, is_active;
```

---

## ✅ 성공 확인

다음 사항들이 모두 확인되면 성공:

- ✅ message_templates 테이블에 `type`, `is_active`, `variables` 컬럼 존재
- ✅ schedules 테이블에 `is_active` 컬럼 존재
- ✅ 테스트 데이터 INSERT 성공
- ✅ 웹 애플리케이션에서 에러 없이 동작

---

## 🆘 여전히 문제가 있나요?

### **디버깅 체크리스트**

1. ⬜ Supabase Dashboard에서 SQL을 **실제로 실행**했나요?
2. ⬜ SQL 실행 결과에 에러 메시지가 없었나요?
3. ⬜ 브라우저를 **새로고침**했나요?
4. ⬜ 웹 애플리케이션을 **재시작**했나요?

### **에러 로그 확인**

1. Supabase Dashboard → Database → Tables
2. message_templates 테이블 클릭
3. 컬럼 목록에서 `is_active`, `type` 확인

### **완전 초기화 (최후의 수단)**

```sql
-- 경고: 모든 데이터 삭제!
DROP TABLE IF EXISTS schedule_executions CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS message_templates CASCADE;

-- 그 다음 /docs/SUPABASE_FIX_STEP_BY_STEP.sql 실행
```

---

## 📚 관련 문서

- [단계별 SQL 스크립트](/docs/SUPABASE_FIX_STEP_BY_STEP.sql) - 가장 안전한 방법
- [전체 SQL 스크립트](/docs/SUPABASE_FIX_ALL.sql) - 한 번에 실행
- [테이블 확인 쿼리](/docs/CHECK_TABLES.sql) - 현재 상태 확인
- [완성 가이드](/docs/SCHEDULE_COMPLETE_GUIDE.md) - 사용 방법

---

**고양 스마트시티 리빙랩 실증사업** 🏙️

문제가 해결되면 `/docs/SCHEDULE_COMPLETE_GUIDE.md`를 참고하여 시스템을 사용하세요!
