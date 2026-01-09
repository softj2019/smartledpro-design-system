# Phase 3: 스케줄 관리 시스템 설계 문서

## 📋 목차

1. [개요](#개요)
2. [요구사항](#요구사항)
3. [데이터 모델](#데이터-모델)
4. [API 설계](#api-설계)
5. [UI/UX 설계](#uiux-설계)
6. [구현 계획](#구현-계획)
7. [테스트 시나리오](#테스트-시나리오)

---

## 개요

### Phase 3 목표

전광판에 표시될 템플릿을 시간별로 자동 전환하는 스케줄 관리 시스템을 구현합니다.

### 핵심 기능

1. **템플릿 예약 송출**: 특정 날짜/시간에 템플릿 자동 송출
2. **반복 스케줄**: 매일, 매주, 특정 요일 반복 설정
3. **스케줄 목록 관리**: 생성, 조회, 수정, 삭제, 활성화/비활성화
4. **자동 실행 엔진**: 서버 사이드에서 스케줄 체크 및 자동 송출
5. **우선순위 기반 스케줄링**: Phase 4 대비 기본 우선순위 적용

### 제약사항

- Figma Make 환경에서 백그라운드 작업 불가
- Supabase Edge Function의 실행 시간 제한 (10분)
- KV Store만 사용 (SQL 테이블 생성 불가)
- 실시간성 보장: 1분 이내 스케줄 실행

---

## 요구사항

### 기능 요구사항

#### FR-3.1: 스케줄 생성
- **설명**: 운영자가 템플릿 송출 스케줄을 생성할 수 있어야 함
- **입력**:
  - 스케줄 이름
  - 템플릿 선택
  - 시작 날짜/시간
  - 종료 날짜/시간 (선택사항)
  - 반복 설정 (없음, 매일, 매주, 특정 요일)
  - 활성화 상태
- **출력**: 생성된 스케줄 객체
- **권한**: OPERATOR, ADMIN

#### FR-3.2: 스케줄 목록 조회
- **설명**: 등록된 스케줄 목록을 조회할 수 있어야 함
- **필터**:
  - 활성화 상태 (전체, 활성, 비활성)
  - 템플릿 ID
  - 날짜 범위
- **정렬**: 시작 시간 기준 오름차순
- **권한**: 모든 사용자

#### FR-3.3: 스케줄 수정
- **설명**: 기존 스케줄을 수정할 수 있어야 함
- **수정 가능 항목**: 생성 시 입력했던 모든 항목
- **제약**: 이미 실행된 스케줄은 수정 불가 (비활성화만 가능)
- **권한**: OPERATOR, ADMIN

#### FR-3.4: 스케줄 삭제
- **설명**: 스케줄을 삭제할 수 있어야 함
- **확인 다이얼로그**: 반복 스케줄인 경우 추가 확인
- **권한**: OPERATOR, ADMIN

#### FR-3.5: 스케줄 활성화/비활성화
- **설명**: 스케줄을 삭제하지 않고 일시 중지할 수 있어야 함
- **토글 버튼**: 원클릭으로 상태 변경
- **권한**: OPERATOR, ADMIN

#### FR-3.6: 자동 스케줄 실행
- **설명**: 서버에서 스케줄을 체크하고 자동으로 템플릿을 송출해야 함
- **체크 주기**: 1분마다 (Cron Job 또는 폴링)
- **실행 조건**:
  - 활성화된 스케줄
  - 현재 시간이 시작 시간과 일치 (±1분 오차 허용)
  - 종료 시간 이전 (설정된 경우)
  - 반복 조건 충족 (요일, 날짜)
- **실행 로직**:
  1. 조건 충족 스케줄 검색
  2. 우선순위 정렬 (Phase 4 대비)
  3. 최고 우선순위 템플릿 송출
  4. 실행 이력 기록

#### FR-3.7: 스케줄 실행 이력
- **설명**: 스케줄이 언제 실행되었는지 기록
- **저장 정보**:
  - 스케줄 ID
  - 실행 시간
  - 송출된 템플릿 ID
  - 실행 결과 (성공/실패)
  - 에러 메시지 (실패 시)
- **조회**: 스케줄 상세 페이지에서 이력 확인
- **보관 기간**: 최근 100건 (KV Store 용량 제한)

### 비기능 요구사항

#### NFR-3.1: 정확성
- 스케줄 실행 시간 오차: ±1분 이내
- 반복 스케줄 정확도: 100% (누락 없음)

#### NFR-3.2: 성능
- 스케줄 조회 응답 시간: 500ms 이내
- 스케줄 생성/수정 응답 시간: 1초 이내
- 자동 실행 체크 시간: 10초 이내

#### NFR-3.3: 확장성
- 최대 스케줄 수: 1,000개
- 동시 실행 가능 스케줄: 10개 (우선순위로 제어)

#### NFR-3.4: 가용성
- 자동 실행 엔진 가동률: 99% 이상
- 스케줄 생성 성공률: 99.9% 이상

---

## 데이터 모델

### Schedule 객체

```typescript
interface Schedule {
  id: string;                    // UUID
  name: string;                  // 스케줄 이름 (예: "매일 아침 공원 운영시간")
  template_id: string;           // 송출할 템플릿 ID
  start_datetime: string;        // ISO 8601 (예: "2024-01-20T09:00:00+09:00")
  end_datetime?: string;         // ISO 8601 (선택사항)
  repeat_type: 'none' | 'daily' | 'weekly' | 'custom';
  repeat_config?: {
    // repeat_type이 'weekly'일 때
    days_of_week?: number[];     // [0=일, 1=월, ..., 6=토]
    
    // repeat_type이 'custom'일 때 (Phase 4+)
    interval?: number;           // 반복 간격 (일 단위)
  };
  is_active: boolean;            // 활성화 상태
  priority: number;              // 우선순위 (Phase 4, 기본값: 5)
  created_by: string;            // 생성자 User ID
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
  last_executed_at?: string;     // 마지막 실행 시간 (ISO 8601)
}
```

### ScheduleExecution 객체 (실행 이력)

```typescript
interface ScheduleExecution {
  id: string;                    // UUID
  schedule_id: string;           // 스케줄 ID
  template_id: string;           // 송출된 템플릿 ID
  executed_at: string;           // 실행 시간 (ISO 8601)
  status: 'success' | 'failed';  // 실행 결과
  error_message?: string;        // 에러 메시지 (실패 시)
}
```

### KV Store 구조

```typescript
// 스케줄 데이터
// Key: schedule:{uuid}
// Value: Schedule

// 스케줄 목록 (인덱싱용)
// Key: schedules:all
// Value: string[] (schedule IDs)

// 활성 스케줄 목록 (빠른 조회)
// Key: schedules:active
// Value: string[] (active schedule IDs)

// 스케줄 실행 이력
// Key: schedule_execution:{schedule_id}:{timestamp}
// Value: ScheduleExecution

// 최근 실행 이력 목록 (스케줄별)
// Key: schedule_executions:{schedule_id}
// Value: string[] (execution IDs, 최근 100건)
```

---

## API 설계

### 1. POST /schedules
**생성**: 새 스케줄 생성

#### Request
```typescript
POST /make-server-5231839f/schedules
Authorization: Bearer {token}
Content-Type: application/json

{
  name: string;
  template_id: string;
  start_datetime: string;  // ISO 8601
  end_datetime?: string;   // ISO 8601
  repeat_type: 'none' | 'daily' | 'weekly' | 'custom';
  repeat_config?: {
    days_of_week?: number[];
  };
  is_active: boolean;
}
```

#### Response
```typescript
{
  schedule: Schedule;
}
```

#### 에러
- 401: Unauthorized
- 403: Insufficient permissions
- 400: Invalid input (템플릿 없음, 날짜 형식 오류 등)
- 500: Internal server error

#### Audit Log
- Action: CREATE
- Entity: SCHEDULE
- Details: `{ schedule_name, template_id, start_datetime }`

---

### 2. GET /schedules
**조회**: 스케줄 목록 조회

#### Request
```typescript
GET /make-server-5231839f/schedules?active={true|false|all}&template_id={id}
Authorization: Bearer {token}
```

#### Query Parameters
- `active`: 'true' | 'false' | 'all' (기본값: 'all')
- `template_id`: 특정 템플릿의 스케줄만 조회 (선택사항)

#### Response
```typescript
{
  schedules: Schedule[];
}
```

---

### 3. GET /schedules/:id
**상세 조회**: 단일 스케줄 상세 정보

#### Request
```typescript
GET /make-server-5231839f/schedules/:id
Authorization: Bearer {token}
```

#### Response
```typescript
{
  schedule: Schedule;
  template: MessageTemplate;  // 연결된 템플릿 정보
  executions: ScheduleExecution[];  // 최근 실행 이력 (최대 100건)
}
```

---

### 4. PUT /schedules/:id
**수정**: 스케줄 수정

#### Request
```typescript
PUT /make-server-5231839f/schedules/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  name?: string;
  template_id?: string;
  start_datetime?: string;
  end_datetime?: string;
  repeat_type?: string;
  repeat_config?: object;
  is_active?: boolean;
}
```

#### Response
```typescript
{
  schedule: Schedule;
}
```

#### Audit Log
- Action: UPDATE
- Entity: SCHEDULE
- Details: `{ schedule_name, changes }`

---

### 5. DELETE /schedules/:id
**삭제**: 스케줄 삭제

#### Request
```typescript
DELETE /make-server-5231839f/schedules/:id
Authorization: Bearer {token}
```

#### Response
```typescript
{
  success: true;
}
```

#### Audit Log
- Action: DELETE
- Entity: SCHEDULE
- Details: `{ schedule_name, template_id }`

---

### 6. PUT /schedules/:id/toggle
**활성화 토글**: 스케줄 활성화/비활성화

#### Request
```typescript
PUT /make-server-5231839f/schedules/:id/toggle
Authorization: Bearer {token}
```

#### Response
```typescript
{
  schedule: Schedule;  // is_active 값이 반전됨
}
```

#### Audit Log
- Action: UPDATE
- Entity: SCHEDULE
- Details: `{ schedule_name, is_active }`

---

### 7. POST /schedules/check-and-execute (Internal)
**자동 실행**: 스케줄 체크 및 자동 송출 (서버 내부 호출)

#### Request
```typescript
POST /make-server-5231839f/schedules/check-and-execute
Authorization: Bearer {service_role_key}  // 서버 내부 호출용
```

#### Processing Logic
```typescript
1. 현재 시간 가져오기 (KST, Asia/Seoul)
2. 활성 스케줄 목록 조회 (schedules:active)
3. 각 스케줄 체크:
   - start_datetime <= 현재 시간 <= end_datetime (or no end)
   - 반복 조건 충족 (요일, 간격 등)
   - last_executed_at이 1분 이상 이전 (중복 실행 방지)
4. 실행 대상 스케줄을 우선순위 정렬
5. 최고 우선순위 스케줄 1개 선택
6. 템플릿 송출 (POST /display/send)
7. 실행 이력 기록 (ScheduleExecution)
8. last_executed_at 업데이트
```

#### Response
```typescript
{
  executed: boolean;
  schedule_id?: string;
  template_id?: string;
  executed_at?: string;
  error?: string;
}
```

---

## UI/UX 설계

### 페이지 구조

```
/schedules
├─ ScheduleListPage.tsx        # 스케줄 목록
└─ ScheduleFormPage.tsx         # 스케줄 생성/수정
```

### 컴포넌트 구조

```
/components/schedules
├─ ScheduleCard.tsx             # 스케줄 카드
├─ ScheduleFilter.tsx           # 필터 (활성/비활성)
├─ ScheduleForm.tsx             # 스케줄 폼
├─ ScheduleExecutionList.tsx    # 실행 이력 목록
└─ ScheduleSkeleton.tsx         # 로딩 스켈레톤
```

### ScheduleListPage 레이아웃

```
┌──────────────────────────────────────────────────────────────┐
│ Schedules                                    [새로고침] [새 스케줄] │
│ 템플릿 송출 스케줄을 관리하고 자동 전환을 설정합니다.              │
├──────────────────────────────────────────────────────────────┤
│ [전체] [활성] [비활성]                                         │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐   │
│ │ 📅 매일 아침 공원 운영시간                  [활성화 ●] │   │
│ │ ─────────────────────────────────────────────────────  │   │
│ │ 템플릿: 공원 운영시간 안내                             │   │
│ │ 시작: 2024-01-20 09:00                                 │   │
│ │ 반복: 매일                                              │   │
│ │ 마지막 실행: 2024-01-20 09:00 (성공)                   │   │
│ │                                                         │   │
│ │ [상세보기] [수정] [삭제]                                │   │
│ └────────────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ 📅 주말 이벤트 공지                         [비활성 ○] │   │
│ │ ─────────────────────────────────────────────────────  │   │
│ │ 템플릿: 주말 축제 안내                                 │   │
│ │ 시작: 2024-01-20 10:00                                 │   │
│ │ 종료: 2024-01-21 18:00                                 │   │
│ │ 반복: 매주 (토, 일)                                     │   │
│ │ 마지막 실행: -                                          │   │
│ │                                                         │   │
│ │ [상세보기] [수정] [삭제]                                │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### ScheduleFormPage 레이아웃

```
┌──────────────────────────────────────────────────────────────┐
│ 새 스케줄 만들기                              [취소] [저장]    │
├──────────────────────────────────────────────────────────────┤
│ 스케줄 이름 *                                                 │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ 매일 아침 공원 운영시간                                 │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                               │
│ 템플릿 선택 *                                                 │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ ▼ 공원 운영시간 안내                                    │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                               │
│ 시작 날짜 및 시간 *                                           │
│ ┌─────────────────────┐  ┌────────────┐                      │
│ │ 2024-01-20          │  │ 09:00      │                      │
│ └─────────────────────┘  └────────────┘                      │
│                                                               │
│ 종료 날짜 및 시간 (선택사항)                                   │
│ ☐ 종료 시간 설정                                              │
│                                                               │
│ 반복 설정                                                     │
│ ○ 반복 없음  ● 매일  ○ 매주  ○ 사용자 정의                    │
│                                                               │
│ 활성화 상태                                                   │
│ ☑ 생성 후 즉시 활성화                                         │
│                                                               │
│ ─────────────────────────────────────────────────────────    │
│                                                               │
│ 💡 팁: 스케줄은 1분 이내에 자동으로 실행됩니다.                 │
└──────────────────────────────────────────────────────────────┘
```

### ScheduleCard 컴포넌트

```typescript
interface ScheduleCardProps {
  schedule: Schedule;
  template: MessageTemplate;
  onToggle: (schedule: Schedule) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
  onViewDetail: (schedule: Schedule) => void;
  canEdit: boolean;
}
```

**표시 정보:**
- 스케줄 이름 (아이콘: 📅)
- 활성화 상태 (토글 스위치)
- 연결된 템플릿 이름
- 시작/종료 날짜 및 시간
- 반복 설정 (아이콘 + 텍스트)
- 마지막 실행 시간 및 결과 (성공 ✅ / 실패 ❌)
- 액션 버튼 (상세보기, 수정, 삭제)

### ScheduleForm 컴포넌트

```typescript
interface ScheduleFormProps {
  schedule?: Schedule;  // 수정 모드일 때만
  onSubmit: (data: ScheduleFormData) => void;
  onCancel: () => void;
}

interface ScheduleFormData {
  name: string;
  template_id: string;
  start_datetime: string;
  end_datetime?: string;
  repeat_type: 'none' | 'daily' | 'weekly' | 'custom';
  repeat_config?: {
    days_of_week?: number[];
  };
  is_active: boolean;
}
```

**폼 필드:**
1. **스케줄 이름** (text input, required)
2. **템플릿 선택** (dropdown, required)
3. **시작 날짜/시간** (date + time picker, required)
4. **종료 날짜/시간** (checkbox + date + time picker, optional)
5. **반복 설정** (radio buttons)
   - 반복 없음
   - 매일
   - 매주 (요일 체크박스: 일 월 화 수 목 금 토)
   - 사용자 정의 (Phase 4+)
6. **활성화 상태** (checkbox, default: true)

**유효성 검사:**
- 시작 시간 < 종료 시간 (종료 시간이 설정된 경우)
- 템플릿이 존재해야 함
- 반복이 '매주'일 때 최소 1개 요일 선택

---

## 구현 계획

### Step 1: 데이터 모델 및 KV Helper 함수 (1일)

**작업:**
- `Schedule` 인터페이스 정의 (`/lib/types/schedule.ts`)
- `ScheduleExecution` 인터페이스 정의
- KV Store 헬퍼 함수 작성 (서버):
  - `createSchedule(schedule: Schedule)`
  - `getSchedule(id: string)`
  - `getAllSchedules()`
  - `getActiveSchedules()`
  - `updateSchedule(id: string, updates: Partial<Schedule>)`
  - `deleteSchedule(id: string)`
  - `createScheduleExecution(execution: ScheduleExecution)`
  - `getScheduleExecutions(scheduleId: string, limit: number)`

**산출물:**
- `/lib/types/schedule.ts`
- `/supabase/functions/server/schedule_helpers.ts`

---

### Step 2: API 엔드포인트 구현 (2일)

**작업:**
- `POST /schedules` (생성)
- `GET /schedules` (목록 조회)
- `GET /schedules/:id` (상세 조회)
- `PUT /schedules/:id` (수정)
- `DELETE /schedules/:id` (삭제)
- `PUT /schedules/:id/toggle` (활성화 토글)
- 권한 검증 (OPERATOR, ADMIN)
- Audit Log 기록

**산출물:**
- `/supabase/functions/server/index.tsx` (라우트 추가)

---

### Step 3: 자동 실행 엔진 구현 (2일)

**작업:**
- `POST /schedules/check-and-execute` 엔드포인트
- 스케줄 조건 체크 로직:
  - 시간 범위 확인
  - 반복 조건 확인 (매일, 매주)
  - 마지막 실행 시간 확인 (중복 방지)
- 우선순위 정렬 (Phase 4 대비)
- 템플릿 송출 로직
- 실행 이력 기록
- 에러 처리 및 로깅

**산출물:**
- `/supabase/functions/server/schedule_executor.ts`

**테스트:**
- 단위 테스트: 날짜/시간 조건 체크
- 통합 테스트: 전체 실행 플로우

---

### Step 4: Frontend - 스케줄 목록 페이지 (2일)

**작업:**
- `ScheduleListPage.tsx` 구현
- `ScheduleCard.tsx` 구현
- `ScheduleFilter.tsx` 구현
- `useSchedules` 훅 구현 (CRUD 로직)
- 활성화 토글 기능
- 삭제 확인 다이얼로그

**산출물:**
- `/pages/schedules/ScheduleListPage.tsx`
- `/components/schedules/ScheduleCard.tsx`
- `/components/schedules/ScheduleFilter.tsx`
- `/lib/hooks/useSchedules.tsx`

---

### Step 5: Frontend - 스케줄 폼 페이지 (2일)

**작업:**
- `ScheduleFormPage.tsx` 구현
- `ScheduleForm.tsx` 구현
- 날짜/시간 선택기 (react-datepicker 또는 native input)
- 템플릿 드롭다운 (템플릿 목록 조회)
- 반복 설정 UI (라디오 버튼 + 요일 체크박스)
- 폼 유효성 검사
- 생성/수정 API 연동

**산출물:**
- `/pages/schedules/ScheduleFormPage.tsx`
- `/components/schedules/ScheduleForm.tsx`

---

### Step 6: Frontend - 스케줄 상세 페이지 (1일)

**작업:**
- `ScheduleDetailPage.tsx` 구현 (선택사항)
- `ScheduleExecutionList.tsx` 구현 (실행 이력)
- 스케줄 정보 표시
- 실행 이력 타임라인
- 빠른 액션 (수정, 삭제, 토글)

**산출물:**
- `/pages/schedules/ScheduleDetailPage.tsx` (선택사항)
- `/components/schedules/ScheduleExecutionList.tsx`

---

### Step 7: 자동 실행 트리거 설정 (1일)

**작업:**
- Supabase Cron Job 설정 (불가능할 경우 폴링 방식)
- 매 1분마다 `/schedules/check-and-execute` 호출
- 또는 External Cron Service (예: GitHub Actions, Vercel Cron)
- 에러 알림 설정 (실패 시 로그)

**대안 (Figma Make 환경 제약):**
- Frontend에서 주기적 폴링 (비권장, 브라우저 닫으면 중단)
- Supabase 데이터베이스 Trigger (SQL 테이블 없으므로 불가)
- **권장**: 외부 Cron Job 서비스 사용

**산출물:**
- Cron 설정 파일 (`.github/workflows/cron.yml` 또는 Vercel 설정)

---

### Step 8: 통합 테스트 및 문서화 (1일)

**작업:**
- 전체 플로우 테스트:
  1. 스케줄 생성
  2. 자동 실행 확인
  3. 전광판 반영 확인
  4. 실행 이력 확인
- 반복 스케줄 테스트 (매일, 매주)
- 에러 시나리오 테스트
- 문서 업데이트:
  - `/docs/PHASE_3_DOCUMENTATION.md`
  - API 명세 업데이트
  - 사용 가이드 작성

**산출물:**
- 테스트 결과 보고서
- Phase 3 완료 문서

---

## 테스트 시나리오

### TS-3.1: 일회성 스케줄 생성 및 실행
1. 로그인 (OPERATOR)
2. 스케줄 목록 페이지 이동
3. "새 스케줄" 버튼 클릭
4. 스케줄 정보 입력:
   - 이름: "테스트 일회성 스케줄"
   - 템플릿: "공원 운영시간"
   - 시작: 현재 시간 + 2분
   - 반복: 없음
   - 활성화: ✅
5. "저장" 버튼 클릭
6. 스케줄 목록에서 생성된 스케줄 확인
7. 2분 대기
8. 전광판 화면에서 템플릿 표시 확인
9. 스케줄 카드에서 "마지막 실행: {시간} (성공)" 확인

**예상 결과:**
- ✅ 스케줄 생성 성공
- ✅ 2분 후 자동 실행
- ✅ 전광판에 템플릿 표시
- ✅ 실행 이력 기록

---

### TS-3.2: 매일 반복 스케줄 생성
1. 스케줄 생성:
   - 이름: "매일 아침 공원 운영시간"
   - 템플릿: "공원 운영시간"
   - 시작: 2024-01-20 09:00
   - 반복: 매일
   - 활성화: ✅
2. 스케줄 저장
3. 다음날 09:00에 자동 실행 확인
4. 그 다음날 09:00에도 자동 실행 확인

**예상 결과:**
- ✅ 매일 09:00에 자동 실행
- ✅ 실행 이력에 여러 실행 기록

---

### TS-3.3: 주간 반복 스케줄 (주말만)
1. 스케줄 생성:
   - 이름: "주말 이벤트"
   - 템플릿: "주말 축제 안내"
   - 시작: 2024-01-20 10:00
   - 반복: 매주 (토, 일)
   - 활성화: ✅
2. 스케줄 저장
3. 다음 토요일 10:00에 자동 실행 확인
4. 일요일 10:00에도 자동 실행 확인
5. 월요일 10:00에는 실행 안 됨 확인

**예상 결과:**
- ✅ 토요일, 일요일만 실행
- ✅ 평일에는 실행 안 됨

---

### TS-3.4: 스케줄 비활성화 및 재활성화
1. 기존 스케줄 선택
2. 활성화 토글 버튼 클릭 (비활성화)
3. 실행 시간이 되어도 자동 실행 안 됨 확인
4. 활성화 토글 버튼 클릭 (재활성화)
5. 다음 실행 시간에 자동 실행 확인

**예상 결과:**
- ✅ 비활성화 시 실행 안 됨
- ✅ 재활성화 시 다시 실행됨

---

### TS-3.5: 스케줄 수정
1. 기존 스케줄 선택
2. "수정" 버튼 클릭
3. 템플릿 변경
4. 시작 시간 변경
5. "저장" 버튼 클릭
6. 변경된 시간에 자동 실행 확인
7. 변경된 템플릿이 송출됨 확인

**예상 결과:**
- ✅ 스케줄 수정 성공
- ✅ 변경된 시간과 템플릿으로 실행

---

### TS-3.6: 스케줄 삭제
1. 스케줄 선택
2. "삭제" 버튼 클릭
3. 확인 다이얼로그 표시
4. "삭제" 버튼 클릭
5. 스케줄 목록에서 삭제됨 확인
6. 실행 시간이 되어도 실행 안 됨 확인

**예상 결과:**
- ✅ 스케줄 삭제 성공
- ✅ 더 이상 실행 안 됨

---

### TS-3.7: 종료 시간 설정
1. 스케줄 생성:
   - 시작: 2024-01-20 09:00
   - 종료: 2024-01-20 18:00
   - 반복: 매일
2. 09:00에 실행 확인
3. 18:00 이후 실행 안 됨 확인

**예상 결과:**
- ✅ 시작 시간에 실행
- ✅ 종료 시간 이후 실행 안 됨

---

### TS-3.8: 실행 이력 조회
1. 여러 번 실행된 스케줄 선택
2. 상세 페이지 또는 카드에서 실행 이력 확인
3. 실행 시간, 템플릿, 결과 (성공/실패) 확인

**예상 결과:**
- ✅ 실행 이력 목록 표시
- ✅ 시간순 정렬
- ✅ 성공/실패 상태 표시

---

## 기술적 고려사항

### 1. 시간대 처리
- 모든 시간은 **한국 표준시 (KST, UTC+9)** 사용
- ISO 8601 형식 저장: `2024-01-20T09:00:00+09:00`
- 서버에서 `Intl.DateTimeFormat` 또는 `date-fns-tz` 사용

### 2. 중복 실행 방지
- `last_executed_at` 필드로 마지막 실행 시간 기록
- 1분 이내 재실행 방지
- Idempotency key 사용 (선택사항)

### 3. 성능 최적화
- 활성 스케줄만 체크 (`schedules:active` 인덱스)
- 스케줄 수가 많을 경우 페이징 (Phase 4+)
- KV Store 조회 최소화 (캐싱 고려)

### 4. 에러 처리
- 템플릿 송출 실패 시 재시도 로직 (3회)
- 에러 메시지 ScheduleExecution에 기록
- 디버그 로거에 에러 출력

### 5. Audit Log
- 모든 스케줄 생성/수정/삭제 기록
- 자동 실행도 SEND 액션으로 기록 (기존 로직 활용)

---

## 제약사항 및 해결 방안

### 제약 1: Figma Make 환경에서 백그라운드 작업 불가
**문제**: Node.js cron job 또는 setInterval 사용 불가

**해결**:
- **옵션 A**: GitHub Actions Cron (권장)
  - `.github/workflows/schedule-cron.yml` 생성
  - 매 1분마다 `/schedules/check-and-execute` API 호출
  - GitHub Secrets에 서비스 키 저장
  
- **옵션 B**: Vercel Cron Jobs
  - `vercel.json` 설정
  - 매 1분마다 API 호출
  
- **옵션 C**: 외부 Cron 서비스 (cron-job.org, EasyCron 등)
  - 무료 티어로 1분 간격 설정
  - Webhook으로 API 호출

**권장**: GitHub Actions (무료, 안정적, 버전 관리 가능)

---

### 제약 2: KV Store만 사용 (SQL 테이블 생성 불가)
**문제**: 복잡한 쿼리 (범위 검색, JOIN 등) 어려움

**해결**:
- 인덱스 키 사용 (`schedules:all`, `schedules:active`)
- 클라이언트 사이드 필터링 (스케줄 수가 적을 때)
- getByPrefix로 범위 조회
- 필요시 여러 키로 데이터 중복 저장 (비정규화)

---

### 제약 3: Supabase Edge Function 실행 시간 제한 (10분)
**문제**: 스케줄 체크 로직이 너무 오래 걸리면 타임아웃

**해결**:
- 활성 스케줄만 체크 (비활성 스케줄 제외)
- 스케줄 수 제한 (최대 1,000개)
- 체크 로직 최적화 (O(n) 시간 복잡도)
- 1회 실행당 10초 이내 완료 목표

---

## 다음 단계 (Phase 4)

Phase 3 완료 후, Phase 4에서 다음 기능을 추가합니다:

1. **우선순위 시스템**:
   - EMERGENCY > NOTICE > WEATHER
   - 긴급 템플릿 자동 우선 표시
   - 스케줄 충돌 해결 로직

2. **고급 반복 설정**:
   - 사용자 정의 간격 (2일마다, 3일마다 등)
   - 월별 반복 (매월 1일, 마지막 날 등)
   - 제외 날짜 설정 (공휴일 제외 등)

3. **스케줄 우선순위**:
   - 동시 실행 가능한 스케줄 중 우선순위 높은 것 선택
   - 긴급 스케줄 즉시 실행 (기존 스케줄 중단)

---

**문서 작성일**: 2024-01-XX  
**최종 업데이트**: 2024-01-XX  
**작성자**: AI System Architect  
**버전**: 1.0.0 (Phase 3 계획)
