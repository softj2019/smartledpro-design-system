# 고양 스마트시티 전광판 관리 시스템 - 완전 문서

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [아키텍처](#아키텍처)
3. [Phase 1: 템플릿 관리 시스템](#phase-1-템플릿-관리-시스템)
4. [Phase 2: 전광판 송출 시스템](#phase-2-전광판-송출-시스템)
5. [API 명세](#api-명세)
6. [데이터 모델](#데이터-모델)
7. [컴포넌트 구조](#컴포넌트-구조)
8. [사용 가이드](#사용-가이드)
9. [트러블슈팅](#트러블슈팅)

---

## 시스템 개요

### 프로젝트 정보

- **프로젝트명**: 고양 스마트시티 리빙랩 실증사업 - 체육공원 전광판 활용 개선 프로젝트
- **기술 스택**: Figma Make + Supabase
- **아키텍처**: 3-tier (Frontend → Server → Database)
- **개발 환경**: Figma Make (브라우저 콘솔 불가, window.confirm 불가)

### 핵심 원칙

1. **운영자 중심 콘텐츠 관리**: OPERATOR/ADMIN 권한으로만 콘텐츠 생성/수정/삭제
2. **단일 송출 URL**: `/display/{display_id}` 하나의 URL로 모든 전광판 제어
3. **송출 우선순위**: EMERGENCY > NOTICE > WEATHER
4. **실증 증빙**: 모든 주요 작업을 `audit_logs` 테이블에 기록
5. **완전한 구현**: 축약·생략·임의 해석 없이 모든 요구사항 충족

### 개발 환경 제약사항

#### Figma Make 환경 특수성
- ❌ 브라우저 콘솔 사용 불가
- ❌ `window.confirm()` 사용 불가
- ❌ `console.log()` 출력 확인 불가
- ✅ 해결: 화면 우측 플로팅 디버그로그 버튼 + 드로어 UI
- ✅ 해결: 커스텀 ConfirmDialog 컴포넌트 (Zustand 기반)

---

## 아키텍처

### 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Dashboard   │  │  Templates   │  │ DisplayView  │       │
│  │              │  │   Manager    │  │  (/display)  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            ↓                                 │
│                 ┌─────────────────────┐                      │
│                 │  Supabase Client    │                      │
│                 │  (publicAnonKey)    │                      │
│                 └─────────────────────┘                      │
└─────────────────────────┬───────────────────────────────────┘
                          ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Function (Hono Server)           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /make-server-5231839f/                              │   │
│  │  ├─ /auth/signup                                     │   │
│  │  ├─ /auth/login                                      │   │
│  │  ├─ /templates (CRUD)                                │   │
│  │  ├─ /display/send                                    │   │
│  │  ├─ /display/current                                 │   │
│  │  └─ /display/settings                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  KV Store Helper (kv_store.tsx)                      │   │
│  │  - get, set, del                                     │   │
│  │  - mget, mset, mdel                                  │   │
│  │  - getByPrefix                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  kv_store_5231839f (Key-Value Table)                 │   │
│  │  ├─ display:current (현재 송출 중인 템플릿)         │   │
│  │  ├─ display:settings (전광판 위치/크기/테두리)      │   │
│  │  ├─ template:{id} (템플릿 데이터)                   │   │
│  │  └─ audit_log:{timestamp} (감사 로그)               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Supabase Auth (Users Table)                         │   │
│  │  - id, email, password                               │   │
│  │  - user_metadata: { name, role }                     │   │
│  │  - role: ADMIN | OPERATOR | VIEWER                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 데이터 흐름

#### 1. 템플릿 생성 흐름
```
[운영자] → [템플릿 폼] → [저장 버튼]
    ↓
POST /templates
    ↓
권한 확인 (OPERATOR/ADMIN)
    ↓
KV Store 저장: template:{id}
    ↓
Audit Log 기록: CREATE/TEMPLATE
    ↓
[템플릿 목록으로 리다이렉트]
```

#### 2. 전광판 송출 흐름
```
[운영자] → [템플릿 카드] → [전광판 전송 버튼]
    ↓
POST /display/send { template_id }
    ↓
권한 확인 (OPERATOR/ADMIN)
    ↓
템플릿 데이터 조회
    ↓
KV Store 저장: display:current
    ↓
Audit Log 기록: SEND/DISPLAY
    ↓
[3초 이내 전광판 반영]
```

#### 3. 전광판 조정 흐름
```
[운영자] → [전광판 컨트롤러] → [위치/크기/테두리 조정]
    ↓
PUT /display/settings
    ↓
권한 확인 (OPERATOR/ADMIN)
    ↓
KV Store 저장: display:settings
    ↓
Audit Log 기록: UPDATE/DISPLAY_SETTINGS
    ↓
[3초 이내 전광판 반영]
```

#### 4. 전광판 표시 흐름 (폴링)
```
[전광판 화면] (3초 폴링)
    ↓
GET /display/current
    ↓
KV Store 조회: display:current, display:settings
    ↓
템플릿 HTML 렌더링
    ↓
위치/크기/테두리 적용
    ↓
[화면 업데이트]
```

---

## Phase 1: 템플릿 관리 시스템

### 완료된 기능

#### 1.1 템플릿 CRUD
- ✅ 템플릿 목록 조회 (카테고리별 필터링)
- ✅ 템플릿 생성 (Rich Text Editor)
- ✅ 템플릿 수정
- ✅ 템플릿 삭제 (ConfirmDialog)
- ✅ 템플릿 미리보기

#### 1.2 Smart Editor
- ✅ 제목 입력 필드
- ✅ 본문 Rich Text Editor (Quill.js)
- ✅ 하이라이트 텍스트 입력
- ✅ 스타일 설정
  - 배경색 선택 (16가지 프리셋)
  - 텍스트 정렬 (left/center/right)
  - 글자 크기 조정 (0.5x ~ 2.5x, 0.1 단위)
- ✅ 실시간 미리보기 (430x260px)

#### 1.3 템플릿 카드
- ✅ 템플릿 썸네일 (HTML 렌더링)
- ✅ 카테고리 뱃지
- ✅ 생성일시 표시
- ✅ 활성 상태 표시 (현재 송출 중인 템플릿)
- ✅ 액션 버튼
  - 미리보기
  - 수정 (OPERATOR/ADMIN만)
  - 삭제 (OPERATOR/ADMIN만)
  - 전광판 전송

#### 1.4 카테고리 시스템
```typescript
const CATEGORIES = [
  { value: 'notice', label: '공지사항', color: 'bg-blue-500' },
  { value: 'event', label: '이벤트', color: 'bg-purple-500' },
  { value: 'emergency', label: '긴급', color: 'bg-red-500' },
  { value: 'weather', label: '날씨', color: 'bg-sky-500' },
  { value: 'facility', label: '시설안내', color: 'bg-green-500' },
  { value: 'general', label: '일반', color: 'bg-gray-500' },
];
```

### 주요 컴포넌트

#### SmartEditor.tsx
```typescript
interface SmartEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
  body: string;
  onBodyChange: (body: string) => void;
  highlight?: string;
  onHighlightChange: (highlight: string) => void;
  styleConfig: StyleConfig;
  onStyleConfigChange: (config: StyleConfig) => void;
}

interface StyleConfig {
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
  fontSize: number;
}
```

**특징:**
- Quill Editor 통합 (toolbar: bold, italic, underline, list)
- 16가지 배경색 프리셋 (빠른 선택)
- 텍스트 정렬 버튼 (아이콘으로 직관적 표시)
- 글자 크기 슬라이더 (실시간 미리보기 반영)

#### TemplatePreview.tsx
```typescript
interface TemplatePreviewProps {
  template: MessageTemplate | null;
  open: boolean;
  onClose: () => void;
}
```

**특징:**
- 430x260px 정확한 크기 미리보기
- HTML 렌더링 (dangerouslySetInnerHTML)
- 테두리 표시 (측정용)
- width: '100%' 설정으로 정렬 스타일 정확히 반영

### API 엔드포인트

#### GET /templates
```typescript
// Query: ?category=notice
// Response:
{
  templates: MessageTemplate[]
}

interface MessageTemplate {
  id: string;
  name: string;
  title: string;
  body: string;  // HTML
  highlight?: string;
  style_config: {
    backgroundColor: string;
    textAlign: 'left' | 'center' | 'right';
    fontSize: number;
  };
  category: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

#### GET /templates/:id
```typescript
// Response:
{
  template: MessageTemplate
}
```

#### POST /templates
```typescript
// Request:
{
  name: string;
  title: string;
  body: string;  // HTML
  highlight?: string;
  style_config: StyleConfig;
  category: string;
}

// Response:
{
  template: MessageTemplate
}
```

#### PUT /templates/:id
```typescript
// Request: (same as POST)
// Response:
{
  template: MessageTemplate
}
```

#### DELETE /templates/:id
```typescript
// Response:
{
  success: true
}
```

### Audit Logs (Phase 1)

| Action | Entity | Details |
|--------|--------|---------|
| CREATE | TEMPLATE | `{ template_name, category }` |
| UPDATE | TEMPLATE | `{ template_name, category }` |
| DELETE | TEMPLATE | `{ template_name, category }` |

---

## Phase 2: 전광판 송출 시스템

### 완료된 기능

#### 2.1 전광판 전송
- ✅ 템플릿 → 전광판 전송 버튼
- ✅ 전송 성공 토스트 알림
- ✅ 전송 실패 에러 처리
- ✅ 활성 템플릿 표시 (파란 테두리 + "송출 중" 뱃지)

#### 2.2 DisplayView (전광판 화면)
- ✅ `/display/{display_id}` URL 라우팅
- ✅ 3초 폴링으로 자동 업데이트
- ✅ 현재 송출 템플릿 표시
- ✅ 위치 조정 (X, Y 좌표)
- ✅ 크기 조정 (scaleX, scaleY)
- ✅ 테두리 표시/숨김 (showBorder)
- ✅ HTML 렌더링 (정확한 스타일 반영)

#### 2.3 DisplayControl (전광판 컨트롤러)
- ✅ 위치 조정 (상하좌우 10px 단위)
- ✅ 크기 조정 (비율 유지 / 가로 / 세로 개별)
- ✅ 0.01 단위 세밀 조정 (1% 단위)
- ✅ 직접 입력 필드 (0.50 ~ 2.00 범위)
- ✅ 현재 픽셀 크기 표시 (예: 100% (430px))
- ✅ 리셋 버튼 (초기값으로 복원)
- ✅ 테두리 표시/숨김 토글
- ✅ 실시간 저장 (변경 즉시 서버 전송)
- ✅ 모달 다이얼로그 UI

#### 2.4 전광판 설정 시스템

**기본 설정값:**
```typescript
const DEFAULT_SETTINGS = {
  position: { x: 0, y: 0 },
  scaleX: 1,    // 100%
  scaleY: 1,    // 100%
  showBorder: true,  // 빨간 테두리 표시
};
```

**조정 가능 범위:**
- **위치**: ±∞ (10px 단위)
- **크기**: 0.5 ~ 2.0 (50% ~ 200%, 0.01 단위)
- **테두리**: true / false

### 주요 컴포넌트

#### DisplayView.tsx
```typescript
export default function DisplayView() {
  const [template, setTemplate] = useState<DisplayTemplate | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    position: { x: 0, y: 0 },
    scaleX: 1,
    scaleY: 1,
    showBorder: true,
  });

  // 3초마다 폴링
  useEffect(() => {
    fetchCurrentDisplay();
    const interval = setInterval(fetchCurrentDisplay, 3000);
    return () => clearInterval(interval);
  }, []);

  // ...
}
```

**렌더링 구조:**
```tsx
<div
  id="active-area"
  style={{
    width: '430px',
    height: '260px',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: `translate(-50%, -50%) translate(${settings.position.x}px, ${settings.position.y}px) scale(${settings.scaleX}, ${settings.scaleY})`,
    transformOrigin: 'center center',
    border: settings.showBorder ? '10px solid red' : 'none',
    backgroundColor: template.style_config.backgroundColor,
    overflow: 'hidden',
  }}
>
  {/* 제목 */}
  <div style={{ width: '100%', textAlign: template.style_config.textAlign }}>
    <h1>{template.title}</h1>
  </div>
  
  {/* 본문 (HTML) */}
  <div 
    style={{ width: '100%', fontSize: `${template.style_config.fontSize}em` }}
    dangerouslySetInnerHTML={{ __html: template.body }}
  />
  
  {/* 하이라이트 */}
  {template.highlight && (
    <div style={{ width: '100%', textAlign: template.style_config.textAlign }}>
      <strong>{template.highlight}</strong>
    </div>
  )}
</div>
```

#### DisplayControl.tsx
```typescript
export function DisplayControl({ onClose }: DisplayControlProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [showBorder, setShowBorder] = useState(true);
  const [loading, setLoading] = useState(false);

  // 즉시 저장 함수
  const updateSettings = async (
    newPosition?: { x: number; y: number },
    newScaleX?: number,
    newScaleY?: number,
    newShowBorder?: boolean
  ) => {
    // PUT /display/settings
    // ...
  };

  // 위치 이동 (10px 단위)
  const movePosition = async (dx: number, dy: number) => {
    const newPosition = { x: position.x + dx, y: position.y + dy };
    setPosition(newPosition);
    await updateSettings(newPosition, undefined, undefined);
  };

  // 크기 조정 (0.01 단위)
  const changeScaleX = async (delta: number) => {
    const newScaleX = Math.max(0.5, Math.min(2, scaleX + delta));
    setScaleX(newScaleX);
    await updateSettings(undefined, newScaleX, undefined);
  };

  // 테두리 토글
  const toggleBorder = async () => {
    const newShowBorder = !showBorder;
    setShowBorder(newShowBorder);
    await updateSettings(undefined, undefined, undefined, newShowBorder);
  };

  // ...
}
```

**UI 구성:**
```
┌─────────────────────────────────────┐
│ 전광판 위치 및 크기 조정            │ [X]
├─────────────────────────────────────┤
│ 📊 현재 설정 표시                   │
│  • 위치 (X, Y): (0, 0)              │
│  • 가로 크기: 100% (430px)          │
│  • 세로 크기: 100% (260px)          │
├─────────────────────────────────────┤
│ 🎯 위치 조정                        │
│          [↑]                        │
│    [←]  [↻]  [→]                    │
│          [↓]                        │
├─────────────────────────────────────┤
│ 📏 크기 조정                        │
│  [축소 (비율 유지)] [확대 (비율 유지)]│
│  [축소 (X)] [확대 (X)]              │
│  [축소 (Y)] [확대 (Y)]              │
│                                     │
│  가로: [1.00] (직접 입력)           │
│  세로: [1.00] (직접 입력)           │
├─────────────────────────────────────┤
│ 🔲 테두리 표시                      │
│  [테두리 표시 중 (클릭하여 숨김)]   │
│  💡 빨간 테두리가 전광판에 표시됩니다│
└─────────────────────────────────────┘
```

### API 엔드포인트

#### POST /display/send
```typescript
// Request:
{
  template_id: string;
}

// Response:
{
  success: true;
  template: MessageTemplate;
  display_id: string;
  sent_at: string;
}
```

**처리 로직:**
1. 권한 확인 (OPERATOR/ADMIN)
2. 템플릿 존재 확인
3. KV Store 저장: `display:current`
4. Audit Log 기록
5. 응답 반환

#### GET /display/current
```typescript
// Response:
{
  success: true;
  template: MessageTemplate | null;
  last_updated: string | null;
  settings: {
    position: { x: number; y: number };
    scaleX: number;
    scaleY: number;
    showBorder: boolean;
  };
}
```

**처리 로직:**
1. KV Store 조회: `display:current`
2. KV Store 조회: `display:settings` (없으면 기본값)
3. 템플릿 데이터 병합
4. 응답 반환

#### PUT /display/settings
```typescript
// Request:
{
  position?: { x: number; y: number };
  scaleX?: number;
  scaleY?: number;
  showBorder?: boolean;
}

// Response:
{
  success: true;
  settings: {
    position: { x: number; y: number };
    scaleX: number;
    scaleY: number;
    showBorder: boolean;
  };
}
```

**처리 로직:**
1. 권한 확인 (OPERATOR/ADMIN)
2. 현재 설정 조회
3. 새로운 설정 병합
4. KV Store 저장: `display:settings`
5. Audit Log 기록
6. 응답 반환

### Audit Logs (Phase 2)

| Action | Entity | Details |
|--------|--------|---------|
| SEND | DISPLAY | `{ template_id, template_name, display_id }` |
| UPDATE | DISPLAY_SETTINGS | `{ settings: { position, scaleX, scaleY, showBorder } }` |

---

## API 명세

### 인증

모든 API 요청은 `Authorization` 헤더에 액세스 토큰을 포함해야 합니다 (일부 public 엔드포인트 제외).

```typescript
headers: {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json',
}
```

### 권한 시스템

| Role | Templates CRUD | Display Send | Display Settings | Audit Logs |
|------|----------------|--------------|------------------|------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| OPERATOR | ✅ | ✅ | ✅ | ❌ |
| VIEWER | 읽기만 | ❌ | ❌ | ❌ |

### 에러 응답

```typescript
// 401 Unauthorized
{
  error: "Unauthorized",
  details: "Invalid or missing token"
}

// 403 Forbidden
{
  error: "Insufficient permissions. OPERATOR or ADMIN role required."
}

// 404 Not Found
{
  error: "Template not found",
  details: "No template with id: abc123"
}

// 500 Internal Server Error
{
  error: "Internal server error",
  details: "Database connection failed"
}
```

---

## 데이터 모델

### KV Store 구조

#### 1. Template Data
```typescript
// Key: template:{uuid}
{
  id: string;               // UUID
  name: string;             // 템플릿 이름
  title: string;            // 제목
  body: string;             // HTML 본문
  highlight?: string;       // 하이라이트 텍스트
  style_config: {
    backgroundColor: string;   // HEX color
    textAlign: 'left' | 'center' | 'right';
    fontSize: number;          // em 단위 (0.5 ~ 2.5)
  };
  category: string;         // notice, event, emergency, etc.
  created_by: string;       // User ID
  created_at: string;       // ISO 8601
  updated_at: string;       // ISO 8601
}
```

#### 2. Display Current
```typescript
// Key: display:current
{
  template_id: string;
  display_id: string;      // "goyang-park-001"
  sent_at: string;         // ISO 8601
}
```

#### 3. Display Settings
```typescript
// Key: display:settings
{
  position: {
    x: number;  // pixels
    y: number;  // pixels
  };
  scaleX: number;    // 0.5 ~ 2.0
  scaleY: number;    // 0.5 ~ 2.0
  showBorder: boolean;
}
```

#### 4. Audit Log
```typescript
// Key: audit_log:{timestamp}
{
  id: string;
  user_id: string;
  user_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SEND';
  entity_type: 'TEMPLATE' | 'DISPLAY' | 'DISPLAY_SETTINGS';
  entity_id: string | null;
  details: object;
  created_at: string;
}
```

### Supabase Auth User

```typescript
{
  id: string;
  email: string;
  user_metadata: {
    name: string;
    role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  };
  created_at: string;
}
```

---

## 컴포넌트 구조

### 페이지 레벨

```
/pages
├─ Dashboard.tsx                  # 대시보드 (Phase 3+)
├─ DisplayView.tsx                # 전광판 화면 (/display/:display_id)
└─ /templates
   ├─ TemplateListPage.tsx        # 템플릿 목록
   └─ TemplateFormPage.tsx        # 템플릿 생성/수정
```

### 컴포넌트 레벨

```
/components
├─ /layout
│  ├─ MainLayout.tsx              # 메인 레이아웃 (헤더 + 사이드바)
│  ├─ PageHeader.tsx              # 페이지 제목 + 액션 버튼
│  └─ Sidebar.tsx                 # 좌측 네비게이션
├─ /templates
│  ├─ SmartEditor.tsx             # Rich Text Editor + 스타일 설정
│  ├─ TemplateCard.tsx            # 템플릿 카드
│  ├─ TemplateFilter.tsx          # 카테고리 필터
│  ├─ TemplatePreview.tsx         # 미리보기 다이얼로그
│  ├─ TemplateSkeleton.tsx        # 로딩 스켈레톤
│  └─ DisplayControl.tsx          # 전광판 컨트롤러
├─ /ui                            # shadcn/ui 컴포넌트
│  ├─ button.tsx
│  ├─ card.tsx
│  ├─ alert-dialog.tsx
│  ├─ badge.tsx
│  └─ ...
├─ AuthProvider.tsx               # 인증 컨텍스트
├─ ProtectedRoute.tsx             # 권한 기반 라우트 가드
├─ Login.tsx                      # 로그인 폼
└─ DebugLogger.tsx                # 플로팅 디버그 로거
```

### 훅 (Hooks)

```
/lib/hooks
├─ useTemplates.tsx               # 템플릿 CRUD 훅
├─ usePermissions.tsx             # 권한 체크 훅
└─ useConfirm.tsx                 # 확인 다이얼로그 훅 (Zustand)
```

### 유틸리티

```
/lib
├─ debug-logger.ts                # 디버그 로거 (console.log 대체)
└─ /hooks
    └─ ...

/utils/supabase
└─ info.tsx                       # Supabase 설정 (projectId, publicAnonKey)

/supabase/functions/server
├─ index.tsx                      # Hono 서버 메인
└─ kv_store.tsx                   # KV Store 헬퍼 (Protected)
```

---

## 사용 가이드

### 1. 템플릿 생성

1. **템플릿 목록 페이지** (`/templates`)로 이동
2. **"새 템플릿"** 버튼 클릭
3. **템플릿 정보 입력:**
   - 템플릿 이름 (내부 관리용)
   - 카테고리 선택 (공지사항, 이벤트, 긴급 등)
4. **콘텐츠 작성:**
   - 제목 입력
   - 본문 작성 (Rich Text Editor)
     - **볼드**, *이탤릭*, 밑줄, 목록 사용 가능
   - 하이라이트 텍스트 (선택사항)
5. **스타일 설정:**
   - 배경색 선택 (16가지 프리셋)
   - 텍스트 정렬 (왼쪽/가운데/오른쪽)
   - 글자 크기 (0.5x ~ 2.5x)
6. **실시간 미리보기** 확인
7. **"저장"** 버튼 클릭

### 2. 전광판 전송

1. **템플릿 목록**에서 송출할 템플릿 찾기
2. 템플릿 카드의 **"전광판 전송"** 버튼 클릭
3. 성공 토스트 확인: *"템플릿이 전광판으로 전송되었습니다"*
4. 템플릿 카드에 **"송출 중"** 뱃지 표시 확인
5. **3초 이내** 전광판 화면에 반영됨

### 3. 전광판 조정

1. **템플릿 수정 페이지**에서 **"전광판 컨트롤"** 버튼 클릭 (우측 하단 파란 버튼)
2. **전광판 컨트롤러 모달** 열림
3. **위치 조정:**
   - 화살표 버튼으로 10px 단위 이동
   - 가운데 리셋 버튼으로 초기화
4. **크기 조정:**
   - **비율 유지:** 가로/세로 동시 조정
   - **개별 조정:** X축, Y축 따로 조정
   - **직접 입력:** 정확한 값 입력 (0.50 ~ 2.00)
5. **테두리 표시:**
   - **"테두리 표시 중"** 버튼: 빨간 테두리 표시 (측정용)
   - **"테두리 숨김"** 버튼: 테두리 숨김 (실제 송출)
6. **자동 저장:** 모든 변경은 즉시 저장되며 3초 이내 반영됨

### 4. 템플릿 미리보기

1. 템플릿 카드의 **"미리보기"** 버튼 (눈 아이콘) 클릭
2. **430x260px 정확한 크기**로 미리보기 표시
3. 실제 전광판과 동일한 렌더링
4. **ESC** 또는 **"닫기"** 버튼으로 종료

### 5. 템플릿 수정

1. 템플릿 카드의 **"수정"** 버튼 (연필 아이콘) 클릭
2. 템플릿 수정 폼으로 이동
3. 내용 수정 후 **"저장"** 버튼 클릭
4. 템플릿 목록으로 리다이렉트

### 6. 템플릿 삭제

1. 템플릿 카드의 **"삭제"** 버튼 (휴지통 아이콘) 클릭
2. **확인 다이얼로그** 표시:
   ```
   템플릿 삭제
   
   "공원 운영시간 안내" 템플릿을 삭제하시겠습니까?
   이 작업은 되돌릴 수 없습니다.
   
   [취소]  [삭제]
   ```
3. **"삭제"** 버튼 클릭 (빨간색)
4. 성공 토스트 확인: *"템플릿이 삭제되었습니다"*

---

## 트러블슈팅

### 1. 템플릿 전송 실패

**증상:**
```
❌ TypeError: Cannot read property 'id' of undefined
템플릿 전송 오류
```

**원인:**
- 템플릿 데이터가 KV Store에 없음
- 템플릿 ID가 잘못됨

**해결:**
1. 디버그 로거 열기 (우측 플로팅 버튼)
2. "Error" 타입 필터링
3. 에러 메시지 확인
4. 템플릿 재생성 또는 ID 확인

### 2. 전광판 화면이 업데이트되지 않음

**증상:**
- 템플릿 전송했지만 전광판에 표시 안 됨
- "마지막 업데이트" 시간이 변경 안 됨

**원인:**
- 전광판 화면이 열려있지 않음
- 네트워크 오류로 폴링 실패
- KV Store 조회 실패

**해결:**
1. 전광판 화면 새로고침 (F5)
2. 네트워크 연결 확인
3. 디버그 로거에서 "Display" 컨텍스트 로그 확인
4. 서버 로그 확인 (Supabase Functions)

### 3. confirm is not a function 오류

**증상:**
```
❌ TypeError: confirm is not a function
템플릿 삭제 오류
```

**원인:**
- `useConfirm()` 훅을 잘못 사용함
- `const { confirm } = useConfirm()` (잘못된 destructure)

**해결:**
```typescript
// ❌ 잘못된 사용
const { confirm } = useConfirm();

// ✅ 올바른 사용
const confirm = useConfirm();
```

### 4. 텍스트 정렬이 미리보기에 반영 안 됨

**증상:**
- 에디터에서 정렬 변경했지만 미리보기는 왼쪽 정렬
- 전광판 화면도 왼쪽 정렬로만 표시

**원인:**
- 부모 div에 `textAlign` 하드코딩됨
- HTML 내부 스타일이 덮어쓰여짐

**해결:**
```tsx
// ❌ 잘못된 코드
<div style={{ textAlign: 'left' }}>
  <div dangerouslySetInnerHTML={{ __html: body }} />
</div>

// ✅ 올바른 코드
<div style={{ width: '100%' }}>
  <div 
    style={{ textAlign: styleConfig.textAlign }}
    dangerouslySetInnerHTML={{ __html: body }}
  />
</div>
```

### 5. 전광판 컨트롤러 변경사항이 저장 안 됨

**증상:**
- 위치/크기 조정했지만 전광판에 반영 안 됨
- "설정 업데이트 실패" 토스트 표시

**원인:**
- 인증 토큰 만료
- 권한 부족 (VIEWER 권한)
- 네트워크 오류

**해결:**
1. 다시 로그인
2. OPERATOR 또는 ADMIN 권한 확인
3. 네트워크 연결 확인
4. 디버그 로거에서 "DisplayControl" 로그 확인

### 6. 디버그 로거가 표시 안 됨

**증상:**
- 우측 플로팅 버튼이 보이지 않음
- 에러 메시지를 볼 수 없음

**원인:**
- `DebugLogger` 컴포넌트가 App.tsx에 없음
- z-index 문제로 다른 요소에 가려짐

**해결:**
```tsx
// App.tsx
return (
  <>
    {/* Routes... */}
    <Toaster richColors position="top-right" />
    <ConfirmDialog />
    <DebugLogger />  {/* ← 필수! */}
  </>
);
```

### 7. 템플릿 목록이 로딩 안 됨

**증상:**
- "등록된 템플릿이 없습니다" 메시지만 표시
- 스켈레톤 로딩 후 빈 화면

**원인:**
- 인증 토큰 없음 (로그인 안 됨)
- KV Store 조회 실패
- 카테고리 필터 오류

**해결:**
1. 로그인 상태 확인
2. 카테고리를 "전체"로 변경
3. 새로고침 버튼 클릭
4. 디버그 로거 확인

---

## 다음 Phase 계획

### Phase 3: 스케줄 관리 시스템 (예정)
- 템플릿 예약 송출
- 시간대별 자동 전환
- 반복 스케줄 설정
- 스케줄 목록 관리

### Phase 4: 우선순위 시스템 (예정)
- EMERGENCY > NOTICE > WEATHER 우선순위
- 긴급 메시지 자동 우선 표시
- 우선순위 충돌 해결 로직

### Phase 5: 날씨 연동 (예정)
- 기상청 API 연동
- 실시간 날씨 정보 표시
- 날씨 기반 자동 템플릿 전환

### Phase 6: 대시보드 고도화 (예정)
- 실시간 통계
- 송출 이력 조회
- Audit Log 시각화

### Phase 7: 시스템 최적화 & 배포 (예정)
- 성능 최적화
- 에러 처리 강화
- 프로덕션 배포 가이드

---

## 변경 이력

### 2024-01-XX (Phase 1 & 2 완료)

#### Phase 1: 템플릿 관리 시스템
- ✅ 템플릿 CRUD 구현
- ✅ Smart Editor 구현 (Quill.js)
- ✅ 카테고리 시스템 구현
- ✅ 템플릿 미리보기 구현
- ✅ 권한 기반 액세스 제어

#### Phase 2: 전광판 송출 시스템
- ✅ 전광판 전송 기능 구현
- ✅ DisplayView 폴링 시스템 구현
- ✅ DisplayControl 모달 구현
- ✅ 전광판 위치/크기 조정 구현
- ✅ 전광판 크기 조정 0.01 단위 개선
- ✅ 직접 입력 필드 추가
- ✅ 현재 픽셀 크기 표시 추가
- ✅ 실시간 저장 방식으로 변경
- ✅ 텍스트 정렬 미리보기 수정
- ✅ 전광판 테두리 표시/숨김 기능 추가
- ✅ confirm 다이얼로그 오류 수정

---

**문서 작성일**: 2024-01-XX  
**최종 업데이트**: 2024-01-XX  
**작성자**: AI System Architect  
**버전**: 1.0.0 (Phase 1 & 2 완료)
