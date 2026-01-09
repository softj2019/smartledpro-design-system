# Frontend Guide - 전광판 관리 시스템

## 📋 목차
- [개요](#개요)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [주요 페이지](#주요-페이지)
- [컴포넌트 설명](#컴포넌트-설명)
- [상태 관리](#상태-관리)
- [API 통신](#api-통신)
- [디버그 시스템](#디버그-시스템)
- [스타일링](#스타일링)
- [베스트 프랙티스](#베스트-프랙티스)

---

## 개요

이 프론트엔드는 **Figma Make** 환경에서 실행되며, React + TypeScript + Tailwind CSS를 사용합니다.

### 특징
- ✅ **완전한 TypeScript 지원**
- ✅ **Tailwind CSS v4.0 사용**
- ✅ **Supabase Auth 통합**
- ✅ **실시간 디버그 시스템**
- ✅ **스켈레톤 로딩 애니메이션**
- ✅ **반응형 디자인**

---

## 기술 스택

### 코어 라이브러리
- **React**: 18.x
- **TypeScript**: 최신 버전
- **Tailwind CSS**: v4.0

### UI 라이브러리
- **Lucide React**: 아이콘
- **Recharts**: 차트 (Phase 5)
- **React Hook Form**: 폼 관리

### 상태 관리
- **React Hooks** (useState, useEffect, useContext)
- **Local Storage**: 로그인 세션 유지

### 네트워킹
- **Fetch API**: REST API 호출
- **Supabase JS Client**: 인증 및 데이터베이스

---

## 프로젝트 구조

```
/
├── App.tsx                      # 메인 앱 컴포넌트 (라우팅)
├── pages/                       # 페이지 컴포넌트
│   ├── Login.tsx                # 로그인
│   ├── Templates.tsx            # 템플릿 목록
│   ├── TemplateForm.tsx         # 템플릿 생성/수정
│   ├── Schedules.tsx            # 스케줄 목록
│   ├── ScheduleForm.tsx         # 스케줄 생성/수정
│   ├── DisplayControl.tsx       # 송출 제어 패널
│   ├── DisplayView.tsx          # 전광판 뷰어
│   └── AuditLogs.tsx            # 감사 로그
├── components/                  # 재사용 컴포넌트
│   ├── common/                  # 공통 컴포넌트
│   │   ├── Header.tsx
│   │   ├── Navigation.tsx
│   │   ├── DebugDrawer.tsx      # 디버그 로그 시스템
│   │   └── LoadingSkeleton.tsx  # 로딩 스켈레톤
│   ├── templates/               # 템플릿 컴포넌트
│   │   ├── TemplateCard.tsx
│   │   └── TemplatePreview.tsx
│   ├── schedules/               # 스케줄 컴포넌트
│   │   ├── ScheduleCard.tsx
│   │   ├── RepeatSelector.tsx
│   │   └── DurationSelector.tsx
│   └── display/                 # 전광판 컴포넌트
│       ├── CurrentDisplay.tsx
│       └── SendButton.tsx
├── utils/                       # 유틸리티
│   ├── supabase/
│   │   └── info.tsx             # Supabase 설정
│   └── api.ts                   # API 헬퍼
├── styles/                      # 스타일
│   └── globals.css              # 전역 CSS + Tailwind 설정
└── imports/                     # Figma 임포트 파일 (있는 경우)
```

---

## 주요 페이지

### 1. Login.tsx - 로그인 페이지

**경로**: `/`

**기능**:
- 이메일/비밀번호 로그인
- Supabase Auth 사용
- 역할별 접근 제어 (ADMIN/OPERATOR/VIEWER)

**주요 코드**:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (data.session) {
  localStorage.setItem('access_token', data.session.access_token);
  localStorage.setItem('user', JSON.stringify(data.user));
  navigate('/templates');
}
```

**테스트 계정**:
- `admin@goyang.go.kr` / `Admin1234!`
- `operator@goyang.go.kr` / `Operator1234!`
- `viewer@goyang.go.kr` / `Viewer1234!`

---

### 2. Templates.tsx - 템플릿 목록

**경로**: `/templates`

**기능**:
- 템플릿 목록 조회
- 카테고리별 필터 (전체/긴급/공지/날씨/일반/이벤트)
- 템플릿 생성/수정/삭제
- 미리보기

**주요 컴포넌트**:
- `TemplateCard`: 템플릿 카드
- `TemplatePreview`: 미리보기 모달

**권한**:
- VIEWER: 조회만
- OPERATOR/ADMIN: 생성/수정/삭제

---

### 3. TemplateForm.tsx - 템플릿 생성/수정

**경로**: `/templates/new`, `/templates/:id/edit`

**기능**:
- 템플릿 생성/수정 폼
- 실시간 미리보기
- 유효성 검증

**폼 필드**:
- 템플릿 이름 (필수)
- 제목 (필수)
- 본문 (필수)
- 강조 문구 (선택)
- 카테고리 (필수)

**유효성 검증**:
```typescript
if (!name || !title || !body) {
  addDebugLog('error', 'Validation', '필수 필드를 입력해주세요.');
  return;
}
```

---

### 4. Schedules.tsx - 스케줄 목록

**경로**: `/schedules`

**기능**:
- 스케줄 목록 조회
- 활성/비활성 필터
- 스케줄 활성화/비활성화 토글
- 스케줄 삭제

**주요 기능**:
- 활성 스케줄 표시 (토글 버튼)
- 다음 실행 시간 계산
- 실행 이력 확인

---

### 5. ScheduleForm.tsx - 스케줄 생성/수정

**경로**: `/schedules/new`, `/schedules/:id/edit`

**기능**:
- 스케줄 생성/수정 폼
- 템플릿 선택
- 시작 날짜/시간 설정
- 반복 설정 (반복없음/매일/매주)
- 템플릿 표시 시간 설정

**폼 필드**:
- 스케줄 이름 (필수)
- 템플릿 선택 (필수)
- 시작 날짜/시간 (필수)
- 종료 날짜 (선택, 없으면 무기한)
- 템플릿 표시 시간 (1분/5분/10분/종일/직접입력)
- 반복 설정
  - 반복 없음
  - 매일 반복
  - 매주 반복 (요일 선택)

**컴포넌트**:
- `RepeatSelector`: 반복 설정 UI
- `DurationSelector`: 표시 시간 설정 UI

---

### 6. DisplayControl.tsx - 송출 제어 패널

**경로**: `/display`

**기능**:
- 현재 송출 상태 확인
- 템플릿 수동 송출
- 송출 이력 확인

**주요 기능**:
```typescript
const handleSend = async (templateId: string) => {
  const response = await fetch(`${API_URL}/display/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ template_id: templateId }),
  });
  
  if (response.ok) {
    addDebugLog('success', 'Display', '전광판으로 전송되었습니다.');
  }
};
```

---

### 7. DisplayView.tsx - 전광판 뷰어

**경로**: `/display/view`

**기능**:
- 현재 송출 중인 템플릿 표시
- 10초마다 자동 새로고침
- 전체 화면 모드

**주요 코드**:
```typescript
useEffect(() => {
  const fetchCurrentDisplay = async () => {
    const response = await fetch(`${API_URL}/display/current`);
    const data = await response.json();
    setCurrentTemplate(data.template);
  };

  fetchCurrentDisplay();
  const interval = setInterval(fetchCurrentDisplay, 10000); // 10초마다

  return () => clearInterval(interval);
}, []);
```

**디자인**:
- 전체 화면 배경
- 중앙 정렬 템플릿
- 애니메이션 효과

---

### 8. AuditLogs.tsx - 감사 로그

**경로**: `/audit-logs`

**기능**:
- 감사 로그 조회
- 액션별/리소스별 필터
- 날짜 범위 필터
- 상세 정보 모달

**필터**:
- 액션: CREATE/UPDATE/DELETE/EXECUTE/DISPLAY_SEND
- 리소스: TEMPLATE/SCHEDULE/DISPLAY
- 사용자
- 날짜 범위

---

## 컴포넌트 설명

### Header.tsx

**위치**: `/components/common/Header.tsx`

**기능**:
- 로고 표시
- 사용자 정보 표시
- 로그아웃 버튼

**Props**:
```typescript
interface HeaderProps {
  user: {
    email: string;
    user_metadata: {
      role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
    };
  };
  onLogout: () => void;
}
```

---

### Navigation.tsx

**위치**: `/components/common/Navigation.tsx`

**기능**:
- 페이지 네비게이션
- 역할별 메뉴 필터링
- 현재 페이지 하이라이트

**메뉴 구조**:
```typescript
const menuItems = [
  { path: '/templates', label: '템플릿', roles: ['ADMIN', 'OPERATOR', 'VIEWER'] },
  { path: '/schedules', label: '스케줄', roles: ['ADMIN', 'OPERATOR', 'VIEWER'] },
  { path: '/display', label: '송출 제어', roles: ['ADMIN', 'OPERATOR'] },
  { path: '/audit-logs', label: '감사 로그', roles: ['ADMIN', 'OPERATOR', 'VIEWER'] },
];
```

---

### DebugDrawer.tsx

**위치**: `/components/common/DebugDrawer.tsx`

**기능**:
- 디버그 로그 표시
- 타입별 필터 (INFO/SUCCESS/WARNING/ERROR)
- 검색 기능
- JSON 복사 기능
- 전체 삭제

**사용법**:
```typescript
import { addDebugLog } from './components/common/DebugDrawer';

// 로그 추가
addDebugLog('success', 'API', '템플릿 생성 성공', { templateId: 'abc123' });
addDebugLog('error', 'Validation', '필수 필드 누락', { fields: ['name', 'title'] });
```

**로그 타입**:
- `info`: 일반 정보
- `success`: 성공 메시지
- `warning`: 경고
- `error`: 에러

**UI**:
- 우측 하단 플로팅 버튼
- 클릭 시 드로어 열림
- 로그 목록, 필터, 검색

---

### LoadingSkeleton.tsx

**위치**: `/components/common/LoadingSkeleton.tsx`

**기능**:
- 로딩 중 스켈레톤 애니메이션 표시
- 다양한 레이아웃 지원

**Props**:
```typescript
interface LoadingSkeletonProps {
  type: 'list' | 'form' | 'card' | 'table';
  count?: number; // 반복 개수 (list/card)
}
```

**사용 예시**:
```typescript
{loading ? (
  <LoadingSkeleton type="list" count={5} />
) : (
  <div>실제 콘텐츠</div>
)}
```

---

### TemplateCard.tsx

**위치**: `/components/templates/TemplateCard.tsx`

**기능**:
- 템플릿 카드 표시
- 카테고리 배지
- 수정/삭제 버튼
- 미리보기 버튼

**Props**:
```typescript
interface TemplateCardProps {
  template: Template;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (template: Template) => void;
}
```

---

### ScheduleCard.tsx

**위치**: `/components/schedules/ScheduleCard.tsx`

**기능**:
- 스케줄 카드 표시
- 활성/비활성 토글
- 다음 실행 시간 표시
- 수정/삭제 버튼

**Props**:
```typescript
interface ScheduleCardProps {
  schedule: Schedule;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
```

---

### RepeatSelector.tsx

**위치**: `/components/schedules/RepeatSelector.tsx`

**기능**:
- 반복 설정 UI
- 반복 타입 선택 (반복없음/매일/매주)
- 요일 선택 (매주일 때)

**Props**:
```typescript
interface RepeatSelectorProps {
  value: 'none' | 'daily' | 'weekly';
  daysOfWeek?: number[]; // 0=월, 1=화, ..., 6=일
  onChange: (type: string, config?: any) => void;
}
```

**UI**:
- 라디오 버튼 (반복 타입)
- 체크박스 (요일 선택)

---

### DurationSelector.tsx

**위치**: `/components/schedules/DurationSelector.tsx`

**기능**:
- 템플릿 표시 시간 설정 UI
- 프리셋 선택 (1분/5분/10분/종일)
- 직접 입력 (custom)

**Props**:
```typescript
interface DurationSelectorProps {
  value: '1min' | '5min' | '10min' | 'all-day' | 'custom';
  customMinutes?: number;
  onChange: (type: string, minutes?: number) => void;
}
```

**UI**:
- 라디오 버튼 (프리셋)
- 숫자 입력 필드 (custom)

---

## 상태 관리

### Local State (useState)

각 컴포넌트는 자체 로컬 상태를 관리합니다.

**예시**:
```typescript
const [templates, setTemplates] = useState<Template[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### Global State (Context API)

**인증 상태 관리**:
```typescript
interface AuthContext {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

### Local Storage

**저장 항목**:
- `access_token`: Supabase 액세스 토큰
- `user`: 사용자 정보 (JSON)

**사용 예시**:
```typescript
// 저장
localStorage.setItem('access_token', token);
localStorage.setItem('user', JSON.stringify(user));

// 조회
const token = localStorage.getItem('access_token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// 삭제
localStorage.removeItem('access_token');
localStorage.removeItem('user');
```

---

## API 통신

### API Base URL

```typescript
const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f`;
```

### 인증 헤더

모든 API 요청에 Authorization 헤더 추가:

```typescript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
};
```

### 공통 API 헬퍼

**GET 요청**:
```typescript
const fetchTemplates = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_URL}/templates`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    
    const data = await response.json();
    setTemplates(data.templates);
    addDebugLog('success', 'API', 'Templates loaded', data);
  } catch (error) {
    addDebugLog('error', 'API', 'Failed to fetch templates', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

**POST 요청**:
```typescript
const createTemplate = async (templateData: any) => {
  try {
    const response = await fetch(`${API_URL}/templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create template');
    }
    
    const data = await response.json();
    addDebugLog('success', 'API', 'Template created', data);
    return data.template;
  } catch (error) {
    addDebugLog('error', 'API', 'Failed to create template', error);
    throw error;
  }
};
```

**에러 처리**:
```typescript
try {
  // API 호출
} catch (error) {
  if (error.message.includes('401')) {
    // 인증 실패 → 로그인 페이지로 이동
    localStorage.removeItem('access_token');
    navigate('/');
  } else if (error.message.includes('403')) {
    // 권한 부족
    addDebugLog('error', 'Auth', '권한이 부족합니다.');
  } else {
    // 기타 에러
    addDebugLog('error', 'API', error.message);
  }
}
```

---

## 디버그 시스템

### addDebugLog 함수

**위치**: `/components/common/DebugDrawer.tsx`

**함수 시그니처**:
```typescript
function addDebugLog(
  type: 'info' | 'success' | 'warning' | 'error',
  category: string,
  message: string,
  data?: any
): void
```

**사용 예시**:
```typescript
// 성공 로그
addDebugLog('success', 'Template', '템플릿 생성 완료', { id: 'abc123' });

// 에러 로그
addDebugLog('error', 'API', '네트워크 오류', { status: 500 });

// 정보 로그
addDebugLog('info', 'Schedule', '스케줄 실행 시작', { scheduleId: 'xyz789' });

// 경고 로그
addDebugLog('warning', 'Validation', '일부 필드가 비어있습니다.', { fields: ['highlight'] });
```

### 디버그 로그 구조

```typescript
interface DebugLog {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: string;
  message: string;
  data?: any;
  timestamp: string; // ISO 8601
}
```

### 디버그 드로어 UI

**플로팅 버튼**:
- 위치: 우측 중앙
- 아이콘: 버그 아이콘
- 배지: 에러 개수 (빨간색)

**드로어**:
- 우측에서 슬라이드 인
- 폭: 400px
- 최대 높이: 80vh

**필터**:
- 전체 / INFO / SUCCESS / WARNING / ERROR

**검색**:
- 메시지 및 카테고리 검색

**JSON 복사**:
- 각 로그의 data를 JSON 형식으로 복사

---

## 스타일링

### Tailwind CSS v4.0

**설정 파일**: `/styles/globals.css`

**주요 토큰**:
```css
@theme {
  --color-primary: #2563eb;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  --font-sans: 'Pretendard', -apple-system, sans-serif;
}
```

### 타이포그래피 기본값

**중요**: 폰트 크기, 두께, 줄 높이는 `/styles/globals.css`에 정의되어 있으므로 **임의로 Tailwind 클래스를 사용하지 마세요**.

```css
h1 { font-size: 2rem; font-weight: 700; line-height: 1.2; }
h2 { font-size: 1.5rem; font-weight: 600; line-height: 1.3; }
h3 { font-size: 1.25rem; font-weight: 600; line-height: 1.4; }
p { font-size: 1rem; line-height: 1.6; }
```

### 공통 클래스

**버튼**:
```css
.btn-primary {
  @apply bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700;
}

.btn-secondary {
  @apply bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300;
}

.btn-danger {
  @apply bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700;
}
```

**카드**:
```css
.card {
  @apply bg-white rounded-lg shadow-md p-6;
}
```

**입력 필드**:
```css
.input {
  @apply border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500;
}
```

---

## 베스트 프랙티스

### 1. 항상 디버그 로그 추가

```typescript
// ❌ 나쁜 예
const createTemplate = async (data) => {
  const response = await fetch(...);
  return response.json();
};

// ✅ 좋은 예
const createTemplate = async (data) => {
  addDebugLog('info', 'Template', '템플릿 생성 시작', data);
  
  try {
    const response = await fetch(...);
    const result = await response.json();
    addDebugLog('success', 'Template', '템플릿 생성 완료', result);
    return result;
  } catch (error) {
    addDebugLog('error', 'Template', '템플릿 생성 실패', error);
    throw error;
  }
};
```

### 2. 로딩 상태에는 스켈레톤 사용

```typescript
// ❌ 나쁜 예
{loading ? <div>로딩 중...</div> : <TemplateList />}

// ✅ 좋은 예
{loading ? <LoadingSkeleton type="list" count={5} /> : <TemplateList />}
```

### 3. 에러 처리 필수

```typescript
// ❌ 나쁜 예
const fetchData = async () => {
  const response = await fetch(...);
  const data = await response.json();
  setState(data);
};

// ✅ 좋은 예
const fetchData = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await fetch(...);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    setState(data);
  } catch (error) {
    setError(error.message);
    addDebugLog('error', 'API', error.message);
  } finally {
    setLoading(false);
  }
};
```

### 4. 타입 안전성 확보

```typescript
// ❌ 나쁜 예
const template: any = { ... };

// ✅ 좋은 예
interface Template {
  id: string;
  name: string;
  title: string;
  body: string;
  category: 'emergency' | 'notice' | 'weather' | 'general' | 'event';
}

const template: Template = { ... };
```

### 5. 컴포넌트 분리

```typescript
// ❌ 나쁜 예: 모든 로직을 한 컴포넌트에
const Templates = () => {
  // 200 lines of code
};

// ✅ 좋은 예: 기능별 컴포넌트 분리
const Templates = () => {
  return (
    <>
      <TemplateFilters />
      <TemplateList />
      <TemplatePagination />
    </>
  );
};
```

### 6. 접근성 (a11y)

```tsx
// ✅ 좋은 예
<button
  aria-label="템플릿 삭제"
  onClick={handleDelete}
>
  <Trash2 />
</button>

<input
  type="text"
  id="template-name"
  aria-describedby="name-help"
/>
<span id="name-help">템플릿의 고유한 이름을 입력하세요.</span>
```

---

## 트러블슈팅

### 문제 1: 디버그 로그가 표시되지 않음

**원인**: `addDebugLog` 함수가 import되지 않음

**해결**:
```typescript
import { addDebugLog } from './components/common/DebugDrawer';
```

### 문제 2: 401 Unauthorized 에러

**원인**: 액세스 토큰 만료

**해결**:
```typescript
if (response.status === 401) {
  localStorage.removeItem('access_token');
  navigate('/');
}
```

### 문제 3: CORS 에러

**원인**: 서버에서 CORS 헤더 누락

**해결**: 서버 코드 확인 (`/supabase/functions/server/index.tsx`)

---

**문서 버전**: 1.0  
**최종 업데이트**: 2024-12-19  
**다음 업데이트**: Phase 5 완료 후
