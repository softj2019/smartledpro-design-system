# 🖥️ 전광판 송출 시스템 전체 동작 방식

## 🎯 개요

고양 스마트시티 전광판은 **우선순위 기반 자동 송출 시스템**으로 동작합니다.

---

## 🔄 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        운영자 관리 시스템                        │
├─────────────────────────────────────────────────────────────────┤
│  1. 템플릿 관리     2. 스케줄 관리     3. 즉시/긴급 송출        │
│  /templates        /schedules         /broadcast (Phase 4)      │
└────────────┬────────────────┬──────────────────┬────────────────┘
             │                │                  │
             ▼                ▼                  ▼
    ┌────────────────────────────────────────────────┐
    │          Supabase Database (영구 저장)         │
    ├────────────────────────────────────────────────┤
    │ - message_templates  (템플릿)                  │
    │ - schedules          (스케줄)                  │
    │ - schedule_executions (실행 이력)              │
    │ - audit_logs         (감사 로그)               │
    └────────────┬───────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────────────────┐
    │     Schedule Executor (자동 실행 엔진)          │
    │     - Cron Job: 1분마다 실행                   │
    │     - /schedules/check-and-execute             │
    └────────────┬───────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────────────────┐
    │        KV Store (현재 송출 상태)                │
    │  - display:current_template = template_id      │
    │  - display:last_updated = timestamp            │
    └────────────┬───────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────────────────┐
    │         /display/view (전광판 화면)             │
    │    - 1초마다 KV Store 폴링                      │
    │    - 템플릿 변경 시 자동 갱신                    │
    │    - HTML 렌더링                                │
    └────────────────────────────────────────────────┘
```

---

## 📊 데이터 흐름 (Step-by-Step)

### **Phase 1: 템플릿 생성**

```
[운영자] → 템플릿 작성 (/templates/new)
    ↓
[Frontend] → POST /templates (API)
    ↓
[Backend] → Supabase DB에 저장 (message_templates)
    ↓
[Backend] → Audit Log 기록
    ↓
[Frontend] ← 성공 응답
```

### **Phase 2: 스케줄 등록**

```
[운영자] → 스케줄 생성 (/schedules/new)
    ├─ 템플릿 선택
    ├─ 시작 시간 설정
    ├─ 표시 시간 설정 (1분/5분/10분/종일/직접입력)
    ├─ 반복 설정 (없음/매일/매주)
    └─ 활성화 여부
    ↓
[Frontend] → POST /schedules (API)
    ↓
[Backend] → 검증
    ├─ 필수 필드 확인
    ├─ 템플릿 존재 확인
    ├─ 날짜 유효성 확인
    └─ ⚠️ 시간 충돌 체크
         ├─ 충돌 발견 → 409 에러 반환
         └─ 충돌 없음 → 계속
    ↓
[Backend] → Supabase DB에 저장 (schedules)
    ↓
[Backend] → Audit Log 기록
    ↓
[Frontend] ← 성공 응답
```

### **Phase 3: 자동 실행 (1분마다)**

```
[Cron Job] → POST /schedules/check-and-execute (1분마다)
    ↓
[Schedule Executor] → 활성 스케줄 조회 (is_active = true)
    ↓
[Schedule Executor] → 실행 조건 체크 (각 스케줄)
    ├─ 시작 시간 확인
    ├─ 종료 시간 확인
    ├─ 중복 실행 방지 (1분 이내 재실행 차단)
    └─ 반복 설정 확인
         ├─ 반복 없음: 한 번만 실행
         ├─ 매일: 시간 일치
         └─ 매주: 요일 + 시간 일치
    ↓
[Schedule Executor] → 실행 대상 필터링
    ↓
실행 대상이 있는가?
    ├─ NO → 종료
    └─ YES → 계속
    ↓
[Schedule Executor] → 우선순위 정렬 (priority 오름차순)
    ↓
[Schedule Executor] → 최고 우선순위 스케줄 선택
    ↓
[Schedule Executor] → 템플릿 송출
    ├─ KV Store에 저장
    │   ├─ display:current_template = template_id
    │   └─ display:last_updated = 현재 시간
    └─ 송출 성공 여부
    ↓
[Schedule Executor] → 실행 이력 기록
    ├─ Supabase DB에 저장 (schedule_executions)
    │   ├─ id
    │   ├─ schedule_id
    │   ├─ template_id
    │   ├─ executed_at
    │   ├─ status (success / failed)
    │   └─ error_message (실패 시)
    └─ 스케줄의 last_executed_at 업데이트
```

### **Phase 4: 전광판 표시 (/display/view)**

```
[전광판 화면] → 1초마다 폴링
    ↓
GET /display/current (API)
    ↓
[Backend] → KV Store 조회
    ├─ display:current_template 읽기
    └─ display:last_updated 읽기
    ↓
[Backend] → template_id로 템플릿 조회
    ↓
[Backend] → Supabase DB에서 템플릿 내용 가져오기
    ├─ id
    ├─ name
    ├─ content (HTML)
    ├─ type
    └─ variables
    ↓
[Frontend] ← 템플릿 데이터 수신
    ↓
[전광판 화면] → 템플릿 변경 감지
    ├─ template_id 변경됨? → 화면 갱신
    └─ 변경 없음? → 유지
    ↓
[전광판 화면] → HTML 렌더링
    ├─ content를 dangerouslySetInnerHTML로 렌더링
    └─ 변수 치환 (variables)
```

---

## 🖥️ /display/view 동작 방식 상세

### **1. 초기 로드**

```typescript
// 페이지 접속
/display/view

↓

// 1초마다 현재 템플릿 조회
useEffect(() => {
  const interval = setInterval(() => {
    fetchCurrentTemplate();
  }, 1000);
}, []);

↓

// API 호출
GET /display/current

↓

// KV Store 조회
const templateId = await kv.get('display:current_template');
const lastUpdated = await kv.get('display:last_updated');

↓

// 템플릿이 있으면 내용 가져오기
if (templateId) {
  const template = await supabase
    .from('message_templates')
    .select('*')
    .eq('id', templateId)
    .single();
}

↓

// 전광판에 표시
<div dangerouslySetInnerHTML={{ __html: template.content }} />
```

### **2. 자동 갱신 (스케줄 실행 시)**

```
[09:00:00] Schedule Executor 실행
    ↓
KV Store 업데이트
    ├─ display:current_template = "템플릿-A-ID"
    └─ display:last_updated = "2025-12-19T09:00:00Z"

↓

[09:00:01] /display/view 폴링 (1초 후)
    ↓
GET /display/current
    ↓
template_id가 변경되었는가?
    ├─ 이전: "템플릿-B-ID"
    └─ 현재: "템플릿-A-ID" → 변경됨!
    ↓
화면 자동 갱신
    ├─ 템플릿-B 제거
    └─ 템플릿-A 표시
```

### **3. 표시 시간 관리**

```
스케줄 설정: 표시 시간 = 5분

[09:00:00] 스케줄 실행
    ↓
템플릿-A 송출
    ↓
display:current_template = "템플릿-A-ID"
display:display_until = "2025-12-19T09:05:00Z" (Phase 4에서 구현 예정)

↓

[09:00:01 ~ 09:04:59] 템플릿-A 계속 표시
    ├─ /display/view가 1초마다 폴링
    └─ template_id 변경 없음 → 유지

↓

[09:05:00] 표시 시간 종료 (Phase 4에서 자동 처리)
    ↓
기본 화면으로 복귀
    ├─ display:current_template = "기본-템플릿-ID"
    └─ 또는 다음 우선순위 콘텐츠 표시
```

---

## 🚨 우선순위 시스템 (Phase 4)

### **우선순위 순서**

```
1. EMERGENCY (긴급)     - priority: 1
    ├─ 재난 알림
    └─ 긴급 공지
    ↓
2. NOTICE (공지)        - priority: 3
    ├─ 중요 공지
    └─ 안내 사항
    ↓
3. SCHEDULE (스케줄)    - priority: 5
    ├─ 일반 스케줄
    └─ 반복 콘텐츠
    ↓
4. WEATHER (날씨)       - priority: 7
    ├─ 날씨 정보
    └─ 기본 정보
```

### **우선순위 적용 예시**

```
[09:00:00] 스케줄 A 실행 (priority: 5)
    ↓
템플릿-A 표시 (일반 공지)

↓

[09:02:30] 긴급 메시지 송출 (priority: 1) ⚠️
    ↓
즉시 화면 전환!
    ├─ 템플릿-A 중단
    └─ 긴급 템플릿 표시

↓

[09:05:00] 긴급 메시지 표시 종료
    ↓
다음 우선순위 콘텐츠로 복귀
    ├─ 스케줄 A가 아직 유효? → 템플릿-A 재개
    └─ 만료됨? → 기본 화면
```

---

## 📝 실제 사용 시나리오

### **시나리오 1: 매일 아침 운영시간 안내**

```
[설정]
- 스케줄명: "매일 아침 운영시간"
- 템플릿: "공원 운영시간 09:00-18:00"
- 시작 시간: 2025-12-20 09:00
- 표시 시간: 5분
- 반복: 매일
- 우선순위: 5

[실행]
매일 09:00:00 → Schedule Executor 실행
    ↓
KV Store 업데이트
    ├─ display:current_template = "운영시간-템플릿-ID"
    └─ display:last_updated = "2025-12-20T09:00:00Z"
    ↓
/display/view가 자동 감지 (1초 이내)
    ↓
전광판에 "공원 운영시간 09:00-18:00" 표시
    ↓
5분 후 (09:05:00) 기본 화면으로 복귀
```

### **시나리오 2: 주말 행사 안내**

```
[설정]
- 스케줄명: "주말 행사"
- 템플릿: "토요일 공원 음악회"
- 시작 시간: 2025-12-21 10:00 (토요일)
- 표시 시간: 종일
- 반복: 매주 (토, 일)
- 우선순위: 5

[실행]
매주 토/일요일 10:00:00 → Schedule Executor 실행
    ↓
KV Store 업데이트
    ↓
/display/view가 자동 감지
    ↓
전광판에 "토요일 공원 음악회" 표시
    ↓
종일 표시 (다른 우선순위 높은 콘텐츠로 변경 가능)
```

---

## 🔧 핵심 컴포넌트

### **1. KV Store (현재 송출 상태)**
- **역할**: 실시간 송출 상태 저장
- **키**:
  - `display:current_template` - 현재 표시 중인 템플릿 ID
  - `display:last_updated` - 마지막 업데이트 시간
- **특징**: 빠른 읽기/쓰기, 휘발성 데이터

### **2. Supabase Database (영구 데이터)**
- **역할**: 템플릿, 스케줄, 이력 저장
- **테이블**:
  - `message_templates` - 템플릿 원본
  - `schedules` - 스케줄 설정
  - `schedule_executions` - 실행 이력
  - `audit_logs` - 감사 로그
- **특징**: 영구 저장, 트랜잭션, 백업 가능

### **3. Schedule Executor (자동 실행 엔진)**
- **역할**: 스케줄 자동 실행
- **실행 주기**: 1분마다 (Cron Job)
- **프로세스**:
  1. 활성 스케줄 조회
  2. 실행 조건 체크
  3. 우선순위 정렬
  4. 템플릿 송출
  5. 이력 기록

### **4. /display/view (전광판 화면)**
- **역할**: 템플릿 표시
- **폴링 주기**: 1초마다
- **기능**:
  - 현재 템플릿 조회
  - 변경 감지
  - HTML 렌더링
  - 자동 갱신

---

## ⏱️ 타이밍 다이어그램

```
Timeline (시간 흐름)

08:59:00  ─────────────────────────────────
          [/display/view] 기본 화면 표시
          
09:00:00  ─────────────────────────────────
          [Schedule Executor] 실행 (Cron)
          ├─ 스케줄 체크
          ├─ "매일 아침 운영시간" 실행 대상
          └─ KV Store 업데이트
          
09:00:01  ─────────────────────────────────
          [/display/view] 폴링
          ├─ template_id 변경 감지
          └─ "운영시간" 템플릿으로 전환
          
09:00:02  ─────────────────────────────────
09:00:03  ─────────────────────────────────
...       [/display/view] 계속 표시
09:04:59  ─────────────────────────────────
          
09:05:00  ─────────────────────────────────
          [Phase 4] 표시 시간 종료 처리
          └─ 기본 화면으로 복귀
          
09:05:01  ─────────────────────────────────
          [/display/view] 폴링
          └─ 기본 화면 표시
```

---

## 🎯 핵심 정리

### **✅ 스케줄 → 전광판 연결 과정**

1. **운영자가 스케줄 생성** → Supabase DB 저장
2. **1분마다 Cron Job 실행** → 실행 조건 체크
3. **조건 만족 시 템플릿 송출** → KV Store 업데이트
4. **전광판이 1초마다 폴링** → 변경 감지 & 화면 갱신
5. **실행 이력 기록** → Supabase DB 저장

### **✅ 데이터 흐름**

```
Supabase DB (영구)  ←→  KV Store (실시간)  ←→  /display/view (화면)
    ↑                       ↑                       ↑
템플릿/스케줄 저장    현재 송출 상태            1초마다 폴링
실행 이력 기록        빠른 읽기/쓰기            자동 갱신
```

### **✅ 응답 시간**

- **스케줄 실행**: 1분 이내 (Cron 주기)
- **화면 갱신**: 1초 이내 (폴링 주기)
- **총 지연 시간**: 최대 61초 (최악의 경우)

---

## 🚀 Phase 4 예정 기능

1. **즉시/긴급 송출** - 스케줄 무시하고 즉시 표시
2. **표시 시간 자동 관리** - display_duration에 따라 자동 종료
3. **우선순위 자동 전환** - 높은 우선순위 콘텐츠 자동 표시
4. **실시간 알림** - WebSocket으로 즉시 반영 (폴링 대체)

---

이제 전체 시스템의 동작 방식을 완벽하게 이해하셨을 겁니다! 🎉
