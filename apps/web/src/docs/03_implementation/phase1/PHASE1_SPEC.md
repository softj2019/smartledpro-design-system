# Phase 1: 기반 구축 & 인증 - 상세 명세서

## 📋 문서 정보
- **Phase**: 1 / 7
- **버전**: v1.0.0
- **작성일**: 2024-12-16
- **상태**: 🟡 진행 중 (40% 완료)

---

## 🎯 Phase 1 목표

### 핵심 목표
전체 시스템의 기반이 되는 **Supabase 연결, 인증 시스템, 공통 컴포넌트**를 구축합니다.

### 세부 목표
1. ✅ **Supabase 연결**: 데이터베이스, 인증, Realtime 연결 설정
2. ✅ **사용자 인증**: 로그인, 로그아웃, 세션 관리, 권한 검증
3. **공통 컴포넌트**: 재사용 가능한 UI 컴포넌트 라이브러리
4. **레이아웃 시스템**: 헤더, 사이드바, 네비게이션
5. **라우터 설정**: React Router 기반 페이지 라우팅
6. **에러 핸들링**: 전역 에러 핸들링 및 사용자 알림
7. **공통 훅**: 데이터 페칭, 상태 관리, Realtime 구독

---

## ✅ 완료된 작업 (40%)

### 1. Supabase 클라이언트 설정

**파일**: `/lib/supabase.ts`

```typescript
// 주요 기능
- createClient() - Supabase 클라이언트 생성
- getCurrentUser() - 현재 사용자 조회
- getUserRole() - 사용자 역할 조회
- signIn() - 로그인
- signOut() - 로그아웃
- onAuthStateChange() - 세션 변경 구독
- logAction() - 감사 로그 기록
```

**특징**:
- 환경 변수 검증 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- 자동 토큰 갱신 (`autoRefreshToken: true`)
- 세션 지속성 (`persistSession: true`)
- Realtime 이벤트 제한 (`eventsPerSecond: 10`)

### 2. TypeScript 타입 정의

**파일**: `/lib/types.ts`

```typescript
// Database 타입
- Database.public.Tables.*
- Database.public.Views.*
- Database.public.Functions.*

// Helper 타입
- UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER'
- ContentType = 'WEATHER' | 'NOTICE' | 'EMERGENCY'
- DataType = 'WEATHER' | 'AIR_QUALITY'
```

**특징**:
- Supabase 스키마와 100% 일치
- Insert/Update/Row 타입 분리
- JSON 타입 안전성 보장

### 3. 인증 Provider

**파일**: `/components/AuthProvider.tsx`

```typescript
// AuthContext
interface AuthContextType {
  user: CurrentUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

**기능**:
- ✅ 초기 세션 확인
- ✅ 세션 변경 자동 감지
- ✅ 사용자 역할 및 권한 조회
- ✅ 로그인/로그아웃 처리
- ✅ 전역 상태 관리

### 4. 로그인 화면

**파일**: `/components/Login.tsx`

**기능**:
- ✅ 이메일/비밀번호 입력
- ✅ 로딩 상태 표시
- ✅ 에러 메시지 표시
- ✅ 테스트 계정 안내

**UI 컴포넌트 사용**:
- `Card`, `CardHeader`, `CardContent`
- `Input`, `Label`, `Button`
- `Alert`, `AlertDescription`

### 5. Supabase 연결 테스트

**파일**: `/components/SupabaseTest.tsx`

**테스트 항목**:
1. ✅ Supabase 연결 확인
2. ✅ displays 테이블 조회
3. ✅ weather_stations 조회
4. ✅ v_current_display_content 뷰 조회

**기능**:
- 테스트 결과 실시간 표시
- 환경 변수 확인
- 조회된 데이터 JSON 표시
- 재테스트 버튼

### 6. 환경 변수 설정

**파일**: `/.env.example`

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 7. 프론트엔드 설정 가이드

**파일**: `/FRONTEND_SETUP.md`

**내용**:
- Supabase 클라이언트 설치
- 환경 변수 설정
- 로그인 테스트
- 문제 해결 가이드

---

## 🚧 진행 예정 작업 (60%)

### 1. 공통 UI 컴포넌트 (shadcn/ui 기반)

#### 1.1 이미 생성된 컴포넌트 확인
다음 컴포넌트가 이미 존재하는지 확인 필요:
- `/components/ui/button.tsx`
- `/components/ui/input.tsx`
- `/components/ui/card.tsx`
- `/components/ui/alert.tsx`
- `/components/ui/badge.tsx`
- `/components/ui/label.tsx`

#### 1.2 추가 필요 컴포넌트
- **Dialog** (모달)
  - 확인 모달
  - 입력 모달
  - 경고 모달

- **Select** (드롭다운)
  - 단일 선택
  - 다중 선택
  - 검색 가능

- **Textarea** (텍스트 영역)
  - 자동 높이 조절
  - 글자 수 제한 표시

- **Checkbox** (체크박스)
  - 단일 체크박스
  - 체크박스 그룹

- **Radio Group** (라디오 버튼)

- **Switch** (토글)

- **Tabs** (탭)

- **Table** (테이블)
  - 정렬
  - 페이지네이션
  - 선택

- **Tooltip** (툴팁)

- **Popover** (팝오버)

- **Calendar** (캘린더)
  - 날짜 선택
  - 범위 선택

- **Toast** (토스트 알림)
  - Sonner 라이브러리 사용

### 2. 레이아웃 컴포넌트

#### 2.1 MainLayout
**파일**: `/components/layout/MainLayout.tsx`

```typescript
interface MainLayoutProps {
  children: React.ReactNode;
}

// 구조
- Header (고정)
- Sidebar (좌측, 접기 가능)
- Main Content (스크롤 가능)
```

**기능**:
- 반응형 레이아웃
- 사이드바 토글
- 모바일 메뉴

#### 2.2 Header
**파일**: `/components/layout/Header.tsx`

```typescript
// 포함 요소
- 로고
- 페이지 제목
- 사용자 정보 (이메일, 역할)
- 로그아웃 버튼
- 알림 아이콘 (추후 구현)
```

#### 2.3 Sidebar
**파일**: `/components/layout/Sidebar.tsx`

```typescript
// 메뉴 항목
- Dashboard (🏠)
- Templates (📝)
- Displays (🖥️)
- Preview Studio (🎨)
- Schedules (📅)
- Audit Logs (📊)
```

**기능**:
- 현재 페이지 하이라이트
- 권한별 메뉴 표시/숨김
- 접기/펼치기

#### 2.4 PageHeader
**파일**: `/components/layout/PageHeader.tsx`

```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// 예시
<PageHeader 
  title="Templates" 
  description="메시지 템플릿을 관리합니다"
  action={<Button>새 템플릿</Button>}
/>
```

### 3. 라우터 설정

#### 3.1 React Router 설치
```bash
npm install react-router-dom
```

#### 3.2 라우트 구조
**파일**: `/App.tsx` (수정)

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 라우트 구조
/                         → Dashboard (로그인 필요)
/login                    → Login 페이지
/templates                → Templates 목록
/templates/new            → Template 생성
/templates/:id            → Template 수정
/displays                 → Displays 목록
/displays/new             → Display 생성
/displays/:id             → Display 수정
/studio                   → Preview Studio
/schedules                → Schedules 캘린더
/schedules/new            → Schedule 생성
/audit-logs               → Audit Logs
/display/:id              → 송출 페이지 (인증 불필요)
```

#### 3.3 Protected Route
**파일**: `/components/ProtectedRoute.tsx`

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requireEmergency?: boolean;
}

// 기능
- 로그인 확인
- 권한 확인
- 미인증 시 /login 리다이렉트
- 권한 부족 시 403 페이지
```

### 4. 공통 훅 (Custom Hooks)

#### 4.1 useToast
**파일**: `/lib/hooks/useToast.ts`

```typescript
// Sonner 라이브러리 래핑
import { toast } from 'sonner';

export function useToast() {
  return {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    info: (message: string) => toast.info(message),
    warning: (message: string) => toast.warning(message),
  };
}
```

#### 4.2 useConfirm
**파일**: `/lib/hooks/useConfirm.ts`

```typescript
interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

// 사용 예시
const confirm = useConfirm();
const ok = await confirm({
  title: '정말 삭제하시겠습니까?',
  description: '이 작업은 되돌릴 수 없습니다.',
  confirmText: '삭제',
  cancelText: '취소',
  variant: 'destructive',
});
if (ok) {
  // 삭제 로직
}
```

#### 4.3 useRealtime
**파일**: `/lib/hooks/useRealtime.ts`

```typescript
interface UseRealtimeOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

// 사용 예시
useRealtime({
  table: 'display_state',
  filter: `display_id=eq.${displayId}`,
  onUpdate: (payload) => {
    console.log('Display state updated:', payload);
    refetchContent();
  },
});
```

#### 4.4 usePermissions
**파일**: `/lib/hooks/usePermissions.ts`

```typescript
export function usePermissions() {
  const { user } = useAuth();
  
  return {
    isAdmin: user?.role === 'ADMIN',
    isOperator: user?.role === 'OPERATOR' || user?.role === 'ADMIN',
    canEmergency: user?.canEmergency === true,
    canCreate: user?.role !== 'VIEWER',
    canUpdate: user?.role !== 'VIEWER',
    canDelete: user?.role === 'ADMIN',
  };
}
```

### 5. 에러 핸들링

#### 5.1 ErrorBoundary
**파일**: `/components/ErrorBoundary.tsx`

```typescript
// React Error Boundary
- 렌더링 에러 캐치
- 에러 로그 기록
- 사용자 친화적 에러 화면 표시
- 재시도 버튼
```

#### 5.2 에러 페이지

**404 페이지**: `/pages/NotFound.tsx`
- 페이지를 찾을 수 없음
- 홈으로 돌아가기 버튼

**403 페이지**: `/pages/Forbidden.tsx`
- 접근 권한 없음
- 필요 권한 안내
- 이전 페이지로 돌아가기

**500 페이지**: `/pages/ServerError.tsx`
- 서버 오류
- 재시도 버튼
- 관리자 연락처

#### 5.3 전역 에러 핸들러
**파일**: `/lib/utils/errorHandler.ts`

```typescript
export function handleError(error: any) {
  // Supabase 에러 처리
  if (error.code) {
    switch (error.code) {
      case '23505': // unique violation
        return '이미 존재하는 데이터입니다.';
      case '23503': // foreign key violation
        return '연결된 데이터가 존재합니다.';
      case 'PGRST116': // no rows returned
        return '데이터를 찾을 수 없습니다.';
      default:
        return error.message;
    }
  }
  
  // 네트워크 에러
  if (error.message === 'Failed to fetch') {
    return '네트워크 연결을 확인해주세요.';
  }
  
  return '알 수 없는 오류가 발생했습니다.';
}
```

### 6. 유틸리티 함수

#### 6.1 날짜 포맷팅
**파일**: `/lib/utils/date.ts`

```typescript
// date-fns 사용
export function formatDate(date: string, format?: string) {
  // 기본: 2024-12-16 14:30
  // 상대시간: 2시간 전
  // 커스텀: YYYY년 MM월 DD일
}
```

#### 6.2 검증 스키마
**파일**: `/lib/validations/*.ts`

```typescript
// Zod 사용
import { z } from 'zod';

export const templateSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
  title: z.string().min(1, '제목을 입력하세요'),
  body: z.string().min(1, '본문을 입력하세요'),
  category: z.string().optional(),
});
```

---

## 📁 Phase 1 파일 구조

```
/
├── lib/
│   ├── supabase.ts                 ✅
│   ├── types.ts                    ✅
│   │
│   ├── hooks/
│   │   ├── useToast.ts
│   │   ├── useConfirm.ts
│   │   ├── useRealtime.ts
│   │   └── usePermissions.ts
│   │
│   ├── utils/
│   │   ├── errorHandler.ts
│   │   └── date.ts
│   │
│   └── validations/
│       ├── template.ts
│       ├── display.ts
│       └── schedule.ts
│
├── components/
│   ├── AuthProvider.tsx            ✅
│   ├── Login.tsx                   ✅
│   ├── SupabaseTest.tsx            ✅
│   ├── ErrorBoundary.tsx
│   ├── ProtectedRoute.tsx
│   │
│   ├── ui/                         (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── checkbox.tsx
│   │   ├── radio-group.tsx
│   │   ├── switch.tsx
│   │   ├── tabs.tsx
│   │   ├── table.tsx
│   │   ├── tooltip.tsx
│   │   ├── popover.tsx
│   │   └── calendar.tsx
│   │
│   └── layout/
│       ├── MainLayout.tsx
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── PageHeader.tsx
│
├── pages/
│   ├── Dashboard.tsx
│   ├── NotFound.tsx
│   ├── Forbidden.tsx
│   └── ServerError.tsx
│
├── App.tsx                         ✅ (수정 필요)
├── .env.example                    ✅
└── FRONTEND_SETUP.md               ✅
```

---

## ✅ Phase 1 완료 기준

### 기능 검증
- [ ] Supabase 연결 테스트 4개 모두 통과 ✅
- [ ] 로그인/로그아웃 정상 동작 ✅
- [ ] 세션 자동 복원 정상 동작 ✅
- [ ] 권한별 메뉴 표시/숨김 정상 동작
- [ ] Protected Route 접근 제어 정상 동작
- [ ] 에러 발생 시 사용자 친화적 메시지 표시
- [ ] Toast 알림 정상 동작
- [ ] 확인 모달 정상 동작

### 코드 품질
- [ ] TypeScript 타입 에러 0개
- [ ] ESLint 경고 0개
- [ ] 모든 컴포넌트 props 타입 정의
- [ ] 주석 및 JSDoc 작성

### 문서화
- [x] Phase 1 상세 명세서 작성
- [ ] Phase 1 테스트 가이드 작성
- [ ] 컴포넌트 사용 예시 작성
- [ ] 스크린샷 첨부

### UI/UX
- [ ] 모든 UI 컴포넌트 일관된 스타일
- [ ] 반응형 디자인 (모바일, 태블릿, 데스크톱)
- [ ] 접근성 (a11y) 기본 준수
- [ ] 로딩 상태 표시

---

## 🔄 다음 단계

Phase 1 완료 후:

1. **Phase 1 테스트 가이드 작성**
   - `/docs/03_implementation/phase1/PHASE1_TEST.md`

2. **Phase 2 준비**
   - Templates CRUD 명세서 작성
   - 데이터 구조 확인
   - UI 목업 제작

3. **통합 문서 업데이트**
   - API 문서 업데이트
   - 아키텍처 다이어그램 업데이트

---

## 📞 문의 및 지원

**기술 문의**: 시스템 아키텍트  
**문서 버전**: v1.0.0  
**최종 수정**: 2024-12-16
