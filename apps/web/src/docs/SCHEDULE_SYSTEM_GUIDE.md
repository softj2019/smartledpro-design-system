# 📅 스케줄 시스템 동작 가이드

## 🎯 개요

고양 스마트시티 전광판 스케줄 시스템은 운영자가 템플릿을 지정된 시간에 자동으로 전광판에 송출할 수 있게 해주는 기능입니다.

---

## 🔧 핵심 기능

### 1. ⏰ **표시 시간 선택**
템플릿이 전광판에 표시되는 시간을 세밀하게 제어할 수 있습니다.

| 옵션 | 설명 | 사용 사례 |
|------|------|-----------|
| **1분** | 템플릿을 1분간 표시 | 간단한 공지사항 |
| **5분** | 템플릿을 5분간 표시 | 일반 안내 메시지 |
| **10분** | 템플릿을 10분간 표시 | 중요 공지 |
| **종일** | 하루 종일 계속 표시 | 날씨, 운영시간 등 상시 정보 |
| **직접입력** | 1~1440분 (최대 24시간) | 커스텀 이벤트 |

### 2. 🔁 **반복 설정**
스케줄을 반복적으로 실행할 수 있습니다.

| 반복 타입 | 설명 | 예시 |
|-----------|------|------|
| **반복 없음** | 지정된 시간에 1회만 실행 | 2025-12-25 09:00에 크리스마스 인사 |
| **매일** | 매일 같은 시간에 실행 | 매일 09:00에 운영시간 안내 |
| **매주** | 지정한 요일마다 실행 | 매주 월/수/금 10:00에 행사 안내 |

### 3. 🚨 **시간 충돌 방지**
동일한 시간대에 여러 스케줄이 실행되지 않도록 자동으로 체크합니다.

#### 충돌 감지 규칙:
- **반복 없음 + 반복 없음**: 같은 날짜/시간인 경우 충돌
- **매일 반복**: 시간만 같으면 충돌 (요일 무관)
- **매주 반복**: 시간 + 요일이 겹치는 경우 충돌

#### 충돌 예시:
```
✅ 허용:
  스케줄 A: 매일 09:00 (월~일)
  스케줄 B: 매일 14:00 (월~일)  ← 시간이 다름

❌ 충돌:
  스케줄 A: 매일 09:00
  스케줄 B: 매일 09:00  ← 동일 시간 충돌!

✅ 허용:
  스케줄 A: 매주 월/수/금 09:00
  스케줄 B: 매주 화/목 09:00  ← 요일이 겹치지 않음

❌ 충돌:
  스케줄 A: 매주 월/수/금 09:00
  스케줄 B: 매주 월/화 09:00  ← 월요일이 겹침!
```

---

## 🔄 스케줄 동작 방식

### **1. 스케줄 생성 프로세스**

```
사용자 입력
  ↓
[검증 단계]
  ├─ 필수 필드 확인 (이름, 템플릿, 시작시간, 표시시간)
  ├─ 템플릿 존재 여부 확인
  ├─ 날짜 유효성 확인
  └─ 시간 충돌 체크 ⚠️
       ↓
    충돌 발견?
     ├─ YES → 409 에러 + 충돌 스케줄 목록 반환
     └─ NO → 계속
  ↓
[스케줄 저장]
  ├─ KV Store에 저장 (schedule:{id})
  ├─ Audit Log 기록
  └─ 성공 응답 반환
```

### **2. 스케줄 실행 엔진**

#### 📍 실행 시점
- **Cron Job**: 1분마다 `/schedules/check-and-execute` API 호출
- **수동 트리거**: 운영자가 직접 실행 버튼 클릭 (Phase 4+)

#### 🔍 실행 조건 체크 (shouldExecuteSchedule)

```typescript
function shouldExecuteSchedule(schedule, currentTime) {
  // 1️⃣ 시작 시간 확인
  if (currentTime < schedule.start_datetime) return false;
  
  // 2️⃣ 종료 시간 확인 (설정된 경우)
  if (schedule.end_datetime && currentTime > schedule.end_datetime) return false;
  
  // 3️⃣ 중복 실행 방지 (1분 이내 재실행 금지)
  if (schedule.last_executed_at) {
    const diffMinutes = (currentTime - last_executed_at) / 60000;
    if (diffMinutes < 1) return false;
  }
  
  // 4️⃣ 반복 타입별 조건
  switch (schedule.repeat_type) {
    case 'none':
      // 반복 없음: 한 번도 실행 안 됐어야 함
      return !schedule.last_executed_at;
      
    case 'daily':
      // 매일: 시간이 일치하는지 (±1분 오차 허용)
      return isSameHourAndMinute(schedule.start_datetime, currentTime);
      
    case 'weekly':
      // 매주: 요일 + 시간 일치
      const matchesDay = schedule.repeat_config.days_of_week.includes(currentTime.getDay());
      const matchesTime = isSameHourAndMinute(schedule.start_datetime, currentTime);
      return matchesDay && matchesTime;
  }
}
```

#### ⚙️ 실행 프로세스

```
[1분마다 실행]
  ↓
활성 스케줄 조회
  ↓
실행 조건 체크 (각 스케줄)
  ↓
실행 대상 필터링
  ↓
우선순위 정렬 (priority 오름차순)
  ↓
최고 우선순위 스케줄 선택
  ↓
[전광판 송출]
  ├─ KV Store에 템플릿 ID 저장
  ├─ display:current_template = template_id
  └─ display:last_updated = 현재 시간
  ↓
[실행 이력 기록]
  ├─ ScheduleExecution 생성
  │  ├─ id: UUID
  │  ├─ schedule_id
  │  ├─ template_id
  │  ├─ executed_at: 실행 시간
  │  ├─ status: 'success' | 'failed'
  │  └─ error_message (실패 시)
  └─ last_executed_at 업데이트
```

---

## 📊 실행 히스토리

### **조회 API**

#### 1. 특정 스케줄의 실행 이력
```http
GET /schedules/:id/executions?limit=50
```

**응답:**
```json
{
  "schedule_id": "...",
  "schedule_name": "매일 아침 운영시간",
  "executions": [
    {
      "id": "...",
      "schedule_id": "...",
      "template_id": "...",
      "template_name": "공원 운영시간",
      "executed_at": "2025-12-19T00:00:00Z",
      "status": "success"
    }
  ],
  "total": 15
}
```

#### 2. 전체 최근 실행 이력
```http
GET /schedules/executions/recent?limit=100
```

**응답:**
```json
{
  "executions": [
    {
      "id": "...",
      "schedule_id": "...",
      "schedule_name": "매일 아침 운영시간",
      "template_id": "...",
      "template_name": "공원 운영시간",
      "executed_at": "2025-12-19T00:00:00Z",
      "status": "success"
    },
    {
      "id": "...",
      "schedule_id": "...",
      "schedule_name": "주말 이벤트",
      "template_id": "...",
      "template_name": "주말 행사 안내",
      "executed_at": "2025-12-18T10:00:00Z",
      "status": "success"
    }
  ],
  "total": 47
}
```

---

## 🎛️ 우선순위 시스템 (Phase 4)

### **우선순위 값**
- **낮은 숫자 = 높은 우선순위**
- 기본값: `priority = 5`
- 범위: 1~10

### **송출 우선순위 (Phase 4+)**
```
EMERGENCY (우선순위 1) 긴급 메시지
    ↓
NOTICE (우선순위 3) 중요 공지
    ↓
SCHEDULE (우선순위 5) 일반 스케줄
    ↓
WEATHER (우선순위 7) 날씨 정보
```

---

## 📝 사용 시나리오

### **시나리오 1: 매일 아침 운영시간 안내**
```
✅ 설정:
- 이름: "매일 아침 운영시간"
- 템플릿: "공원 운영시간 09:00-18:00"
- 시작 시간: 2025-12-20 09:00
- 표시 시간: 5분
- 반복: 매일
- 종료 시간: 없음 (무기한)

📍 실행:
- 매일 09:00에 자동 실행
- 5분간 전광판에 표시
- 09:05에 기본 화면으로 복귀
```

### **시나리오 2: 주말 행사 안내**
```
✅ 설정:
- 이름: "주말 행사 안내"
- 템플릿: "토요일 공원 음악회"
- 시작 시간: 2025-12-21 10:00
- 표시 시간: 종일
- 반복: 매주 (토, 일)
- 종료 시간: 2025-12-31 23:59

📍 실행:
- 매주 토/일요일 10:00에 실행
- 하루 종일 표시 (다른 우선순위 높은 콘텐츠로 변경 가능)
- 2025-12-31 이후 자동 종료
```

### **시나리오 3: 크리스마스 특별 인사**
```
✅ 설정:
- 이름: "크리스마스 인사"
- 템플릿: "메리 크리스마스!"
- 시작 시간: 2025-12-25 00:00
- 표시 시간: 종일
- 반복: 없음
- 종료 시간: 없음

📍 실행:
- 2025-12-25 00:00에 1회 실행
- 하루 종일 표시
- 다시 실행되지 않음 (last_executed_at이 설정됨)
```

---

## ⚠️ 주의사항

### 1. **중복 실행 방지**
- 마지막 실행 후 1분 이내에는 재실행되지 않습니다
- 이는 Cron Job의 타이밍 오차로 인한 중복 실행을 방지합니다

### 2. **종료 시간**
- `end_datetime`은 **스케줄 종료 날짜**입니다
- **표시 시간**과 혼동하지 마세요
  - 종료 시간: 언제까지 스케줄을 반복할지
  - 표시 시간: 템플릿을 전광판에 몇 분간 보여줄지

### 3. **시간대**
- 모든 시간은 **KST (한국 표준시, UTC+9)** 기준입니다
- ISO 8601 형식으로 저장: `2025-12-25T09:00:00+09:00`

### 4. **활성화 상태**
- `is_active = false`인 스케줄은 실행되지 않습니다
- 토글 API로 쉽게 활성화/비활성화 가능

---

## 🔍 디버깅 팁

### **스케줄이 실행되지 않을 때 체크리스트**

1. ✅ 스케줄이 활성화되어 있나요? (`is_active = true`)
2. ✅ 현재 시간이 시작 시간 이후인가요?
3. ✅ 종료 시간이 설정되어 있다면, 현재 시간이 종료 시간 이전인가요?
4. ✅ 반복 타입이 맞나요?
   - **매일**: 시간만 일치하면 실행
   - **매주**: 요일 + 시간이 모두 일치해야 실행
5. ✅ 1분 이내에 이미 실행되지 않았나요?
6. ✅ 다른 스케줄과 시간이 겹치지 않나요?

### **로그 확인**
```typescript
// 서버 로그에서 확인 가능
[Schedule Executor] Checking schedules at 2025-12-19T00:00:00.000Z
[Schedule Executor] Found 3 active schedules
[Schedule Executor] 1 schedules ready to execute
[Schedule Executor] Executing schedule: 매일 아침 운영시간 (ID: ...)
[Schedule Executor] Successfully executed schedule: 매일 아침 운영시간
```

---

## 📚 API 레퍼런스

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/schedules` | POST | 스케줄 생성 (충돌 체크 포함) |
| `/schedules` | GET | 스케줄 목록 조회 |
| `/schedules/:id` | GET | 스케줄 상세 조회 (실행 이력 포함) |
| `/schedules/:id` | PUT | 스케줄 수정 |
| `/schedules/:id` | DELETE | 스케줄 삭제 |
| `/schedules/:id/toggle` | PUT | 활성화 토글 |
| `/schedules/:id/executions` | GET | 특정 스케줄 실행 이력 |
| `/schedules/executions/recent` | GET | 전체 최근 실행 이력 |
| `/schedules/check-and-execute` | POST | 스케줄 실행 (Cron 전용) |

---

## 🎉 완성!

이제 스케줄 시스템을 완벽하게 이해하고 사용할 수 있습니다! 🚀

**다음 단계: Phase 4 - 우선순위 기반 송출 시스템 (EMERGENCY > NOTICE > SCHEDULE > WEATHER)**
