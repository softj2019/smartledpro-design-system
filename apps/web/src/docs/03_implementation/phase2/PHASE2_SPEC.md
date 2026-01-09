# Phase 2: Templates 관리 시스템 - 구현 명세서

## 📋 개요

**Phase**: 2  
**기능명**: Templates 관리 시스템  
**구현일**: 2024-12-16  
**상태**: ✅ 완료

## 🎯 구현 목표

메시지 템플릿의 생성, 조회, 수정, 삭제(CRUD) 기능을 제공하여 운영자가 전광판에 표시할 콘텐츠를 효율적으로 관리할 수 있도록 구현

## 📁 생성된 파일 목록

### Backend
- `/supabase/functions/server/index.tsx` (수정)
  - Templates CRUD API 엔드포인트 추가
  - 인증 미들웨어 구현
  - Audit Log 자동 기록

### Frontend - Hooks
- `/lib/hooks/useTemplates.ts`
  - Template CRUD 작업을 위한 커스텀 훅
  - 자동 새로고침 기능
  - 에러 처리 및 토스트 알림

### Frontend - Components
- `/components/templates/TemplateCard.tsx`
  - 템플릿 카드 UI 컴포넌트
  - 카테고리 배지, 버전 정보 표시
  - 편집/삭제/미리보기 액션

- `/components/templates/TemplatePreview.tsx`
  - 템플릿 미리보기 다이얼로그
  - 실제 전광판 비율(16:9) 시뮬레이션
  - 스타일 설정 정보 표시

- `/components/templates/TemplateFilter.tsx`
  - 카테고리별 필터링 UI
  - 전체/긴급/공지/이벤트/일반 필터

### Frontend - Pages
- `/pages/templates/TemplateListPage.tsx`
  - 템플릿 목록 페이지
  - 그리드 레이아웃
  - 카테고리 필터링
  - 새로고침 기능

- `/pages/templates/TemplateFormPage.tsx`
  - 템플릿 생성/수정 폼
  - 실시간 미리보기
  - 스타일 커스터마이징
  - 유효성 검증

### Documentation
- `/docs/03_implementation/phase2/PHASE2_SPEC.md` (본 문서)
- `/docs/03_implementation/phase2/PHASE2_TEST.md`

## 🔌 API 엔드포인트

### 1. GET /templates
**용도**: 템플릿 목록 조회  
**인증**: 필수 (Bearer Token)  
**권한**: 모든 인증된 사용자  
**쿼리 파라미터**:
- `category` (optional): 카테고리 필터 (all, emergency, notice, event, general)

**응답**:
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "템플릿명",
      "title": "제목",
      "body": "본문",
      "highlight": "강조 메시지",
      "style_config": {
        "backgroundColor": "#ffffff",
        "textColor": "#000000",
        "titleColor": "#1e40af",
        "fontSize": "16px"
      },
      "category": "notice",
      "version": 1,
      "created_by": "user-id",
      "created_at": "2024-12-16T00:00:00Z",
      "updated_at": "2024-12-16T00:00:00Z"
    }
  ]
}
```

### 2. GET /templates/:id
**용도**: 단일 템플릿 조회  
**인증**: 필수 (Bearer Token)  
**권한**: 모든 인증된 사용자

**응답**:
```json
{
  "template": {
    "id": "uuid",
    "name": "템플릿명",
    ...
  }
}
```

### 3. POST /templates
**용도**: 새 템플릿 생성  
**인증**: 필수 (Bearer Token)  
**권한**: OPERATOR 또는 ADMIN  
**요청 본문**:
```json
{
  "name": "템플릿명",
  "title": "제목",
  "body": "본문",
  "highlight": "강조 메시지 (optional)",
  "style_config": {
    "backgroundColor": "#ffffff",
    "textColor": "#000000",
    "titleColor": "#1e40af",
    "fontSize": "16px"
  },
  "category": "notice"
}
```

**응답**: HTTP 201 Created
```json
{
  "template": { ... }
}
```

**Audit Log 기록**:
- action: "CREATE"
- resource_type: "TEMPLATE"
- action_detail: { template_name, category }

### 4. PUT /templates/:id
**용도**: 템플릿 수정  
**인증**: 필수 (Bearer Token)  
**권한**: OPERATOR 또는 ADMIN  
**요청 본문**: POST와 동일

**응답**:
```json
{
  "template": { ... }
}
```

**Audit Log 기록**:
- action: "UPDATE"
- resource_type: "TEMPLATE"
- action_detail: { template_name, previous_version, new_version }

### 5. DELETE /templates/:id
**용도**: 템플릿 삭제  
**인증**: 필수 (Bearer Token)  
**권한**: OPERATOR 또는 ADMIN

**비즈니스 로직**:
- 스케줄에서 사용 중인 템플릿은 삭제 불가
- 삭제 전 schedules 테이블 확인

**응답**:
```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

**에러 응답** (400):
```json
{
  "error": "Cannot delete template. It is currently being used in schedules."
}
```

**Audit Log 기록**:
- action: "DELETE"
- resource_type: "TEMPLATE"
- action_detail: { template_name }

## 🎨 UI/UX 특징

### TemplateListPage
- **그리드 레이아웃**: 반응형 3컬럼 (모바일 1컬럼, 태블릿 2컬럼)
- **카테고리 필터**: 상단 필터 바로 즉시 필터링
- **빈 상태 처리**: 템플릿이 없을 때 안내 메시지 및 생성 버튼
- **권한 기반 UI**: OPERATOR/ADMIN만 생성/수정/삭제 버튼 표시

### TemplateFormPage
- **2컬럼 레이아웃**: 
  - 좌측(2/3): 기본 정보 입력
  - 우측(1/3): 스타일 설정 + 미리보기 버튼
- **실시간 색상 선택**: Color picker + HEX 입력
- **필수 필드 검증**: name, title, body
- **Edit 모드**: URL 파라미터로 기존 데이터 로드

### TemplateCard
- **카테고리 배지**: 색상 구분 (긴급=빨강, 공지=파랑, 이벤트=보라, 일반=회색)
- **본문 미리보기**: 3줄까지 표시 (line-clamp-3)
- **버전 및 날짜**: 하단에 작게 표시
- **호버 효과**: shadow-md로 강조

### TemplatePreview
- **16:9 비율**: aspect-ratio CSS로 전광판 비율 재현
- **실제 스타일 적용**: style_config 그대로 적용
- **메타데이터 표시**: 카테고리, 버전, 생성/수정일
- **스타일 정보**: 색상 견본과 함께 설정값 표시

## 🔐 권한 제어

### 페이지 접근
- `/templates`: 모든 인증된 사용자 (VIEWER 포함)
- `/templates/new`: OPERATOR 또는 ADMIN
- `/templates/edit/:id`: OPERATOR 또는 ADMIN

### API 접근
- GET: 모든 인증된 사용자
- POST/PUT/DELETE: OPERATOR 또는 ADMIN

### UI 요소
- "새 템플릿" 버튼: canEdit === true 일 때만 표시
- 편집/삭제 버튼: canEdit === true 일 때만 표시
- 미리보기 버튼: 모든 사용자에게 표시

## 📊 데이터 모델

### message_templates 테이블 활용
```typescript
interface MessageTemplate {
  id: string;              // UUID (자동 생성)
  name: string;            // 템플릿 이름
  title: string;           // 전광판 제목
  body: string;            // 전광판 본문
  highlight: string | null; // 강조 메시지 (선택)
  style_config: Json;      // 스타일 설정 객체
  category: string | null; // 카테고리 (general, notice, event, emergency)
  version: number;         // 버전 (자동 증가, 기본값 0)
  created_by: string | null; // 생성자 user ID
  created_at: string;      // 생성 일시 (자동)
  updated_at: string;      // 수정 일시 (자동)
}
```

### style_config 구조
```typescript
interface StyleConfig {
  backgroundColor: string; // 배경색 (HEX)
  textColor: string;       // 본문 색상 (HEX)
  titleColor: string;      // 제목 색상 (HEX)
  fontSize: string;        // 글자 크기 (예: "16px")
}
```

## 🔄 상태 관리

### useTemplates Hook
```typescript
const {
  templates,        // MessageTemplate[]
  loading,          // boolean
  error,            // string | null
  fetchTemplates,   // (category?: string) => Promise<MessageTemplate[]>
  getTemplate,      // (id: string) => Promise<MessageTemplate>
  createTemplate,   // (data) => Promise<MessageTemplate>
  updateTemplate,   // (id, data) => Promise<MessageTemplate>
  deleteTemplate,   // (id) => Promise<boolean>
} = useTemplates({ category: 'all', autoFetch: true });
```

### 자동 새로고침
- 생성/수정/삭제 후 자동으로 `fetchTemplates()` 호출
- 목록 페이지 최신 상태 유지

## 🧪 테스트 시나리오

상세한 테스트 시나리오는 `PHASE2_TEST.md` 참조

## 🚀 다음 단계 (Phase 3)

- **Displays 관리**: 전광판 등록/관리
- **Display Config**: 날씨/대기질 측정소 매핑
- **실시간 상태 모니터링**

## 📝 참고사항

### 카테고리 정의
- `general`: 일반 안내
- `notice`: 공지사항
- `event`: 이벤트 홍보
- `emergency`: 긴급 메시지 (최우선 송출)

### 버전 관리
- 템플릿 수정 시 자동으로 version++
- Audit Log에 이전/현재 버전 기록

### 삭제 제약
- schedules 테이블에서 참조 중인 템플릿은 삭제 불가
- 에러 메시지로 사용자에게 안내

### Audit Log 연동
- 모든 CUD 작업은 audit_logs에 자동 기록
- 실증 증빙용 필수 기능

## ✅ 완료 체크리스트

- [x] Backend API 구현 (5개 엔드포인트)
- [x] 인증/권한 미들웨어
- [x] Audit Log 자동 기록
- [x] useTemplates Hook
- [x] TemplateCard 컴포넌트
- [x] TemplatePreview 컴포넌트
- [x] TemplateFilter 컴포넌트
- [x] TemplateListPage
- [x] TemplateFormPage
- [x] 라우터 연결
- [x] 권한 기반 UI 제어
- [x] 에러 처리 및 토스트 알림
- [x] 반응형 레이아웃
- [x] 문서화

---

**작성자**: Figma Make AI  
**최종 수정**: 2024-12-16
