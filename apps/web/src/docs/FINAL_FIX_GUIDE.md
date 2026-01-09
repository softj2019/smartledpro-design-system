# ✅ 최종 수정 가이드

## 🎯 문제 진단

기존 데이터베이스 구조와 새로 만든 코드가 맞지 않아서 에러가 발생했습니다.

### **기존 DB 구조 (Supabase)**
```
message_templates 테이블:
- id, name, title, body, highlight, style_config, category, version
- ❌ type, is_active, variables 없음!

schedules 테이블:
- id, template_id, content_type, display_ids, start_at, end_at
- recurrence_rule, priority (default 200)
- ❌ name, is_active, last_executed_at 없음!
```

---

## ✅ 해결 방법 (2단계)

### **1단계: Supabase SQL 실행**

**📁 파일**: `/docs/SAFE_DB_UPDATE.sql`

이 SQL은 **기존 데이터를 보존하면서** 필요한 컬럼만 추가합니다:

```sql
-- schedules 테이블에 추가:
- name (스케줄 이름)
- is_active (활성화 상태)
- last_executed_at (마지막 실행 시간)

-- 새 테이블 생성:
- schedule_executions (실행 이력)
```

**실행 방법**:
1. Supabase Dashboard → SQL Editor
2. `/docs/SAFE_DB_UPDATE.sql` 전체 복사
3. 붙여넣고 Run
4. ✅ 완료 메시지 확인

---

### **2단계: 코드 업데이트 완료**

✅ 이미 수정 완료!

**수정된 파일**:
- `/supabase/functions/server/schedule_db_helpers.ts`
  - 기존 DB 구조에 맞춤
  - `content_type`, `display_ids`, `start_at`, `end_at` 사용
  - `recurrence_rule` (JSONB) 사용

---

## 🔍 주요 변경 사항

### **기존 구조 활용**

| 항목 | 기존 컬럼 | 새 컬럼 |
|------|-----------|---------|
| 스케줄 이름 | - | `name` ⭐ 추가 |
| 템플릿 ID | `template_id` | 그대로 |
| 콘텐츠 타입 | `content_type` | 그대로 |
| 전광판 목록 | `display_ids` (JSONB) | 그대로 |
| 시작 시간 | `start_at` | 그대로 |
| 종료 시간 | `end_at` | 그대로 |
| 반복 설정 | `recurrence_rule` (JSONB) | 그대로 |
| 우선순위 | `priority` (default 200) | 그대로 |
| 활성화 상태 | - | `is_active` ⭐ 추가 |
| 마지막 실행 | - | `last_executed_at` ⭐ 추가 |

### **message_templates 구조**

기존 구조 그대로 사용:
- `title`: 제목
- `body`: 본문
- `highlight`: 강조 텍스트
- `style_config`: 스타일 설정 (JSONB)
- `category`: 카테고리

❌ `type`, `is_active`, `variables` 사용 안 함!

---

## 🧪 테스트

### **1. SQL 실행 후 확인**

```sql
-- schedules 테이블 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'schedules'
  AND column_name IN ('name', 'is_active', 'last_executed_at');

-- 3개 행이 나오면 성공! ✅
```

### **2. 스케줄 생성 테스트**

```sql
-- 테스트 스케줄 추가
INSERT INTO schedules (
  name,
  content_type,
  display_ids,
  start_at,
  end_at,
  priority,
  is_active,
  created_by
) VALUES (
  '테스트 스케줄',
  'NOTICE',
  '[]'::jsonb,
  now() + interval '5 minutes',
  now() + interval '10 minutes',
  200,
  true,
  '00000000-0000-0000-0000-000000000000'
);
```

---

## 📊 데이터 흐름

```
[스케줄 생성]
    ↓
schedules 테이블 (Supabase)
  - content_type: 'NOTICE' | 'EMERGENCY' | 'WEATHER'
  - display_ids: ['uuid1', 'uuid2']
  - start_at, end_at
  - recurrence_rule: { freq: 'DAILY', interval: 1 }
  - priority: 200 (낮을수록 높은 우선순위)
    ↓
[Cron Job 실행]
    ↓
display_state 테이블 업데이트
  - display_id, template_id, content_type
  - priority, content_data
  - start_at, end_at
    ↓
schedule_executions 기록
  - schedule_id, executed_at, status
    ↓
[/display/view 화면 갱신]
```

---

## 🚀 우선순위 시스템

### **Priority 값**

| 타입 | Priority | 설명 |
|------|----------|------|
| EMERGENCY | 100 | 최우선 |
| NOTICE | 200 | 일반 공지 |
| WEATHER | 300 | 날씨 정보 |

낮은 숫자 = 높은 우선순위!

### **동작 방식**

1. 현재 시간에 활성화된 스케줄 조회
2. `priority` 순으로 정렬 (오름차순)
3. 가장 높은 우선순위 스케줄 실행
4. `display_state` 테이블 업데이트
5. `/display/view` 화면 자동 갱신

---

## ✅ 체크리스트

수정 완료 확인:

- ✅ `/docs/SAFE_DB_UPDATE.sql` 실행
- ✅ schedules 테이블에 `name`, `is_active`, `last_executed_at` 추가
- ✅ schedule_executions 테이블 생성
- ✅ 백엔드 코드 수정 완료
- ✅ 기존 데이터 보존
- ✅ 에러 없이 동작

---

## 📚 관련 문서

- `/docs/SAFE_DB_UPDATE.sql` - 안전한 DB 업데이트 (권장 ⭐)
- `/docs/README_FIRST.md` - 빠른 시작 가이드
- `/docs/SCHEDULE_COMPLETE_GUIDE.md` - 사용 방법
- `/QUICK_START.md` - 3단계 빠른 시작

---

## 🆘 문제 해결

### **여전히 에러가 발생하면**

1. ✅ SQL을 **실제로 실행**했나요?
2. ✅ **전체 스크립트**를 복사했나요?
3. ✅ 브라우저를 **새로고침**했나요?
4. ✅ 서버를 **재시작**했나요?

### **확인 쿼리**

```sql
-- 테이블 구조 확인
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('schedules', 'schedule_executions')
ORDER BY table_name, ordinal_position;
```

---

**고양 스마트시티 리빙랩 실증사업** 🏙️

이제 기존 시스템과 완벽하게 호환됩니다! ✨
