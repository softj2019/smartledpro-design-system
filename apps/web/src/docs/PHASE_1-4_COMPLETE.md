# 고양 스마트시티 리빙랩 - 체육공원 전광판 시스템 Phase 1-4 완료 보고서

## 📋 프로젝트 개요

### 프로젝트명
**고양 스마트시티 리빙랩 실증사업 - 체육공원 전광판 활용 개선 프로젝트**

### 시스템명
**Figma Make + Supabase 고도화 전광판 관리 시스템**

### 프로젝트 기간
2024년 12월 19일 ~ 현재 진행 중

### 기술 스택
- **Frontend**: React, TypeScript, Tailwind CSS v4.0
- **Backend**: Supabase Edge Functions (Deno), Hono Web Framework
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase KV Store (설정용)

---

## 🎯 핵심 원칙

### 1. 운영자 중심 설계
- 모든 기능은 운영자의 편의성을 최우선으로 설계
- 직관적인 UI/UX
- 실시간 피드백

### 2. 단일 송출 URL
- **송출 URL**: `/display/view`
- 모든 전광판은 동일한 URL로 접속
- 서버에서 우선순위에 따라 콘텐츠 결정

### 3. 송출 우선순위
```
EMERGENCY (긴급공지, 우선순위 100)
    ↓
NOTICE (일반공지, 우선순위 200)
    ↓
WEATHER (날씨정보, 우선순위 300)
```

### 4. 완전한 감사 추적 (Audit Logs)
- 모든 생성/수정/삭제 작업 기록
- 송출 이력 기록
- 스케줄 실행 이력 기록
- 사용자 정보 포함

### 5. 디버그 우선 개발
- 브라우저 콘솔 사용 불가 환경
- 화면 우측 플로팅 디버그 로그 버튼
- 타입별 필터, 검색, JSON 복사 기능

---

## ✅ Phase 1-4 완료 기능

### Phase 1-2: 기본 인프라 & 템플릿 관리

#### 1.1 사용자 인증 시스템
- **역할 기반 접근 제어 (RBAC)**
  - `ADMIN`: 모든 권한 + 시스템 설정
  - `OPERATOR`: 템플릿/스케줄 관리 + 송출
  - `VIEWER`: 조회만 가능

- **테스트 계정**
  ```
  ADMIN:    admin@goyang.go.kr / Admin1234!
  OPERATOR: operator@goyang.go.kr / Operator1234!
  VIEWER:   viewer@goyang.go.kr / Viewer1234!
  ```

- **인증 API**
  - `POST /make-server-5231839f/setup-test-users` - 테스트 계정 생성
  - Supabase Auth 활용

#### 1.2 템플릿 관리 시스템
- **템플릿 구조**
  - 제목 (Title)
  - 본문 (Body)
  - 강조 문구 (Highlight, Optional)
  - 스타일 설정 (Style Config)
  - 카테고리 (Category: emergency/notice/weather/general/event)

- **템플릿 CRUD**
  - 생성: OPERATOR/ADMIN만 가능
  - 조회: 모든 역할 가능
  - 수정: OPERATOR/ADMIN만 가능
  - 삭제: OPERATOR/ADMIN만 가능 (스케줄 사용 중이면 불가)

- **프론트엔드 페이지**
  - `/pages/Templates.tsx` - 템플릿 목록
  - `/pages/TemplateForm.tsx` - 템플릿 생성/수정
  - `/components/templates/TemplateCard.tsx` - 템플릿 카드

### Phase 3: 스케줄 관리 시스템

#### 3.1 스케줄 기능
- **스케줄 설정 항목**
  - 스케줄 이름
  - 템플릿 선택
  - 시작 날짜/시간
  - 종료 날짜 (선택사항, 없으면 무기한)
  - 템플릿 표시 시간 (`display_duration_type`)
    - `1min`: 1분
    - `5min`: 5분
    - `10min`: 10분
    - `all-day`: 종일
    - `custom`: 직접 입력 (분 단위)
  - 반복 설정 (`recurrence_rule`)
    - `none`: 반복 없음 (1회만 실행)
    - `daily`: 매일 반복
    - `weekly`: 매주 반복 (요일 선택)
    - `custom`: 사용자 정의 (향후 확장)

#### 3.2 스케줄 충돌 검증
- 동일 시간에 활성 스케줄이 있으면 생성 불가
- 반복 타입별 충돌 검사
  - `none`: 날짜+시간 모두 일치하면 충돌
  - `daily`: 시간만 일치하면 충돌
  - `weekly`: 시간+요일 일치하면 충돌

#### 3.3 스케줄 자동 실행
- **실행 엔드포인트**: `POST /schedules/check-and-execute`
- **실행 주기**: 1분마다 (외부 Cron 또는 수동 트리거)
- **실행 로직**:
  1. 모든 활성 스케줄 조회
  2. 현재 시간에 실행해야 할 스케줄 필터링
  3. 반복 규칙 확인 (RRule 기반)
  4. 우선순위에 따라 전광판 송출
  5. 실행 이력 기록 (`schedule_executions` 테이블)

- **프론트엔드 페이지**
  - `/pages/Schedules.tsx` - 스케줄 목록
  - `/pages/ScheduleForm.tsx` - 스케줄 생성/수정
  - `/components/schedules/ScheduleCard.tsx` - 스케줄 카드

### Phase 4: 전광판 송출 관리

#### 4.1 수동 송출
- **송출 API**: `POST /display/send`
- **권한**: OPERATOR/ADMIN
- **동작**:
  1. 템플릿 선택
  2. 즉시 전광판으로 송출
  3. `display_current_state` 테이블에 현재 상태 저장
  4. Audit Log 기록 (source: 'manual')

#### 4.2 현재 송출 상태 조회
- **조회 API**: `GET /display/current`
- **권한**: 모든 역할
- **반환 정보**:
  - 현재 송출 중인 템플릿
  - 송출 소스 (manual/schedule/default/none)
  - 마지막 업데이트 시간

#### 4.3 송출 우선순위 시스템
- **우선순위 값**:
  - EMERGENCY: 100 (가장 높음)
  - NOTICE: 200
  - WEATHER: 300 (가장 낮음)

- **우선순위 처리**:
  - 스케줄 실행 시 현재 송출 중인 콘텐츠 우선순위 확인
  - 더 높은 우선순위면 교체, 낮으면 무시
  - 동일 우선순위면 최신 것으로 교체

#### 4.4 전광판 뷰어
- **뷰어 URL**: `/display/view`
- **동작**:
  1. 10초마다 자동 새로고침
  2. 서버에서 현재 송출 콘텐츠 조회
  3. 템플릿 렌더링
  4. 스켈레톤 로딩 애니메이션

- **프론트엔드 페이지**:
  - `/pages/DisplayView.tsx` - 전광판 뷰어
  - `/pages/DisplayControl.tsx` - 송출 제어 패널

---

## 🗄️ 데이터베이스 스키마

### PostgreSQL 테이블 구조

#### 1. `message_templates` - 메시지 템플릿
```sql
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  highlight TEXT,
  style_config JSONB DEFAULT '{}',
  category TEXT DEFAULT 'general',
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `schedules` - 스케줄
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_id UUID REFERENCES message_templates(id),
  content_type TEXT NOT NULL,
  display_ids JSONB DEFAULT '[]',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,  -- NULL이면 무기한
  recurrence_rule JSONB,
  priority INTEGER DEFAULT 200,
  is_active BOOLEAN DEFAULT TRUE,
  display_duration_type TEXT,  -- '1min', '5min', '10min', 'all-day', 'custom'
  display_duration_minutes INTEGER,  -- custom일 때만 사용
  last_executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. `schedule_executions` - 스케줄 실행 이력
```sql
CREATE TABLE schedule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id),
  template_id UUID REFERENCES message_templates(id),
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT,  -- 'success', 'failed', 'skipped'
  details JSONB
);
```

#### 4. `display_current_state` - 현재 송출 상태 (싱글톤)
```sql
CREATE TABLE display_current_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES message_templates(id),
  source TEXT,  -- 'manual', 'schedule', 'default'
  source_id UUID,
  content_type TEXT,
  priority INTEGER,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

#### 5. `display_settings` - 전광판 설정
```sql
CREATE TABLE display_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_template_id UUID REFERENCES message_templates(id),
  refresh_interval INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. `audit_logs` - 감사 로그
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'DISPLAY_SEND'
  resource_type TEXT NOT NULL,  -- 'TEMPLATE', 'SCHEDULE', 'DISPLAY'
  resource_id UUID,
  action_detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### KV Store (Supabase)
- `display:settings` - 전광판 위치/크기 설정
  ```json
  {
    "position": { "x": 0, "y": 0 },
    "scaleX": 1,
    "scaleY": 1,
    "showBorder": true
  }
  ```

---

## 🔌 API 엔드포인트 명세

자세한 API 명세는 [`DATABASE_SCHEMA.md`](./API_REFERENCE.md) 참조

### 주요 엔드포인트 요약

#### 인증
- `POST /make-server-5231839f/setup-test-users` - 테스트 계정 생성

#### 템플릿
- `GET /make-server-5231839f/templates` - 템플릿 목록
- `GET /make-server-5231839f/templates/:id` - 템플릿 상세
- `POST /make-server-5231839f/templates` - 템플릿 생성
- `PUT /make-server-5231839f/templates/:id` - 템플릿 수정
- `DELETE /make-server-5231839f/templates/:id` - 템플릿 삭제

#### 스케줄
- `GET /make-server-5231839f/schedules` - 스케줄 목록
- `GET /make-server-5231839f/schedules/:id` - 스케줄 상세
- `POST /make-server-5231839f/schedules` - 스케줄 생성
- `PUT /make-server-5231839f/schedules/:id` - 스케줄 수정
- `DELETE /make-server-5231839f/schedules/:id` - 스케줄 삭제
- `PUT /make-server-5231839f/schedules/:id/toggle` - 스케줄 활성화/비활성화
- `POST /make-server-5231839f/schedules/check-and-execute` - 스케줄 자동 실행
- `GET /make-server-5231839f/schedules/:id/executions` - 스케줄 실행 이력
- `GET /make-server-5231839f/schedules/executions/recent` - 최근 실행 이력

#### 전광판 송출
- `POST /make-server-5231839f/display/send` - 수동 송출
- `GET /make-server-5231839f/display/current` - 현재 송출 상태
- `PUT /make-server-5231839f/display/settings` - 전광판 설정
- `GET /make-server-5231839f/display/settings/history` - 설정 변경 이력

#### 감사 로그
- `GET /make-server-5231839f/audit-logs` - 감사 로그 조회
- `GET /make-server-5231839f/audit-logs/stats` - 통계
- `POST /make-server-5231839f/audit-logs/test-data` - 테스트 데이터 생성

---

## 🎨 프론트엔드 구조

### 페이지 구조
```
/                     - 로그인 페이지
/templates            - 템플릿 목록
/templates/new        - 템플릿 생성
/templates/:id/edit   - 템플릿 수정
/schedules            - 스케줄 목록
/schedules/new        - 스케줄 생성
/schedules/:id/edit   - 스케줄 수정
/display              - 송출 제어 패널
/display/view         - 전광판 뷰어 (송출용)
/audit-logs           - 감사 로그
```

### 컴포넌트 구조
```
/components
  /templates
    - TemplateCard.tsx
    - TemplatePreview.tsx
  /schedules
    - ScheduleCard.tsx
    - RepeatSelector.tsx
    - DurationSelector.tsx
  /display
    - CurrentDisplay.tsx
    - SendButton.tsx
  /common
    - Header.tsx
    - Navigation.tsx
    - DebugDrawer.tsx
    - LoadingSkeleton.tsx
```

### 주요 컴포넌트

#### DebugDrawer.tsx
- 우측 플로팅 버튼
- 타입별 필터 (INFO/SUCCESS/WARNING/ERROR)
- 검색 기능
- JSON 복사 기능
- 전체 삭제 기능

#### LoadingSkeleton.tsx
- 모든 로딩 상태에 스켈레톤 애니메이션 사용
- 페이지별 맞춤형 스켈레톤

---

## 🔧 주요 기능 설명

### 1. 템플릿 표시 시간 관리

스케줄 생성 시 템플릿이 전광판에 표시되는 시간을 설정:

```typescript
display_duration_type: '1min' | '5min' | '10min' | 'all-day' | 'custom'
display_duration_minutes: number | null  // custom일 때만 사용
```

**예시**:
- `5min` 선택 → 템플릿이 5분간 표시됨
- `all-day` 선택 → 해당 날짜 종일 표시
- `custom` + `30` 입력 → 30분간 표시

### 2. 스케줄 종료일 관리

```typescript
end_at: string | null
```

- **NULL**: 무기한 반복
- **날짜 지정**: 해당 날짜까지만 반복

**예시**:
- 매일 오전 9시 공지 (무기한) → `end_at: null`
- 2025년 1월 31일까지 매일 공지 → `end_at: '2025-01-31T23:59:59'`

### 3. 반복 규칙 (Recurrence Rule)

RRule 기반 반복 설정:

```typescript
recurrence_rule: {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY',
  interval: number,
  byweekday?: number[],  // 0=월, 1=화, ..., 6=일
  bymonthday?: number[],
  count?: number,
  until?: string
} | null
```

**예시**:
```json
{
  "freq": "WEEKLY",
  "interval": 1,
  "byweekday": [0, 2, 4]  // 월/수/금
}
```

### 4. 우선순위 기반 송출

```typescript
// schedule_executor.ts
function shouldReplace(currentPriority: number, newPriority: number): boolean {
  return newPriority <= currentPriority;  // 숫자가 작을수록 우선순위 높음
}
```

**시나리오**:
1. NOTICE(200) 송출 중
2. EMERGENCY(100) 스케줄 실행 → 즉시 교체 ✅
3. WEATHER(300) 스케줄 실행 → 무시 ❌

---

## 📦 설치 및 실행

### 1. 환경 변수 설정
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. 데이터베이스 초기화
1. Supabase 프로젝트 생성
2. SQL 편집기에서 테이블 생성 (DATABASE_SCHEMA.md 참조)
3. RLS 정책 설정 (선택사항)

### 3. 테스트 계정 생성
```bash
POST https://your-project.supabase.co/functions/v1/make-server-5231839f/setup-test-users
Authorization: Bearer YOUR_ANON_KEY
```

### 4. 프론트엔드 실행
Figma Make 환경에서 자동 실행

---

## 🧪 테스트 시나리오

### 시나리오 1: 템플릿 생성 및 수동 송출
1. OPERATOR로 로그인
2. 템플릿 생성 (카테고리: NOTICE)
3. 송출 제어 패널에서 템플릿 선택
4. "즉시 송출" 버튼 클릭
5. `/display/view`에서 확인

### 시나리오 2: 매일 반복 스케줄
1. OPERATOR로 로그인
2. 스케줄 생성:
   - 이름: "아침 안내방송"
   - 시작 시간: 09:00
   - 반복: 매일
   - 종료일: 없음 (무기한)
   - 표시 시간: 5분
3. 스케줄 활성화
4. `/schedules/check-and-execute` 호출 (Cron 시뮬레이션)
5. 실행 이력 확인

### 시나리오 3: 긴급 공지 우선순위
1. NOTICE 스케줄 송출 중
2. EMERGENCY 템플릿 수동 송출
3. 즉시 교체 확인
4. Audit Log에서 교체 이력 확인

---

## 🐛 트러블슈팅

### 문제 1: "end_at must be after start_at" 오류
**원인**: 종료 시간이 시작 시간보다 이전  
**해결**: `end_at`을 비우거나(무기한) 시작 시간 이후로 설정

### 문제 2: 스케줄이 실행되지 않음
**체크리스트**:
- [ ] 스케줄이 활성화 상태인가?
- [ ] `start_at`이 과거 시간인가?
- [ ] `/schedules/check-and-execute`가 호출되고 있는가?
- [ ] 반복 규칙이 올바른가?

### 문제 3: 템플릿 삭제 불가
**원인**: 스케줄에서 사용 중  
**해결**: 해당 스케줄 먼저 삭제 또는 템플릿 변경

### 문제 4: 디버그 로그가 보이지 않음
**원인**: 로그가 기록되지 않음  
**해결**: `addDebugLog()` 호출 확인, 브라우저 새로고침

---

## 📊 Phase 1-4 성과

### 구현 완료율
- ✅ Phase 1: 100% (인증, 기본 인프라)
- ✅ Phase 2: 100% (템플릿 관리)
- ✅ Phase 3: 100% (스케줄 관리)
- ✅ Phase 4: 100% (전광판 송출)

### 코드 통계
- Backend 파일: 4개
  - `/supabase/functions/server/index.tsx` (메인 서버)
  - `/supabase/functions/server/schedule_db_helpers.ts` (스케줄 DB)
  - `/supabase/functions/server/schedule_executor.ts` (스케줄 실행)
  - `/supabase/functions/server/kv_store.tsx` (보호 파일)

- Frontend 페이지: 8개
- 컴포넌트: 15개 이상
- API 엔드포인트: 30개 이상

### 데이터베이스
- 테이블: 6개
- 총 컬럼: 60개 이상
- 인덱스: 자동 생성 (Primary Key, Foreign Key)

---

## 🚀 다음 단계: Phase 5 준비

### Phase 5 예상 기능
1. 실시간 대시보드
2. 송출 통계 및 분석
3. 스케줄 실행 이력 뷰어
4. 실시간 알림 시스템
5. 자동 새로고침

### Phase 5 시작 전 체크리스트
- [x] Phase 1-4 완전 문서화
- [x] 데이터베이스 스키마 최종 확인
- [x] API 테스트 완료
- [x] 프론트엔드 주요 기능 테스트
- [ ] Phase 5 상세 요구사항 정의
- [ ] Phase 5 일정 수립

---

## 📝 변경 이력

### 2024-12-19
- KV Store → PostgreSQL 완전 마이그레이션
- `display_duration_type`, `display_duration_minutes` 컬럼 추가
- `end_at` NULL 허용으로 변경 (무기한 반복 지원)
- 스케줄 종료일 설정 문제 해결
- Phase 1-4 문서화 완료

---

## 👥 팀 정보

### 개발팀
- AI Assistant (Claude) - 전체 시스템 설계 및 구현
- 프로젝트 담당자 - 요구사항 정의 및 검수

### 문의
고양시 스마트시티 리빙랩 담당 부서

---

**문서 버전**: 1.0  
**최종 업데이트**: 2024-12-19  
**다음 업데이트 예정**: Phase 5 완료 후
