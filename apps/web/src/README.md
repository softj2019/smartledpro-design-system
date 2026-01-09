# 고양 스마트시티 전광판 관리 시스템

[![Phase](https://img.shields.io/badge/Phase-1%2F7-blue)](docs/00_meta/PHASE_PLAN.md)
[![Status](https://img.shields.io/badge/Status-Phase%201%20Complete-success)](docs/00_meta/PHASE1_COMPLETE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](/)
[![Supabase](https://img.shields.io/badge/Supabase-Connected-green)](SUPABASE_SETUP.md)

> 고양 스마트시티 리빙랩 실증사업 - 체육공원 전광판 활용 개선 프로젝트

---

## 📋 프로젝트 개요

### 핵심 목표
운영자 중심의 콘텐츠 관리 시스템을 통해 체육공원 전광판을 효율적으로 활용하고, 실증 증빙을 위한 완전한 감사 로그 시스템을 구축합니다.

### 주요 특징
- ✅ **단일 송출 URL**: `/display/{display_id}` 하나로 모든 전광판 관리
- ✅ **우선순위 기반 송출**: `EMERGENCY (1000) > NOTICE (200) > WEATHER (100)`
- ✅ **실시간 Realtime 갱신**: Supabase Realtime으로 자동 콘텐츠 업데이트
- ✅ **완전한 감사 로그**: 모든 작업에 대한 audit_logs 자동 기록
- ✅ **권한 기반 접근 제어**: ADMIN, OPERATOR, VIEWER 역할 분리

---

## 🚀 빠른 시작 (5분)

### 1. 환경 변수 설정
`.env.local` 파일을 프로젝트 루트에 생성:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. 의존성 설치 및 실행
```bash
npm install
npm run dev
```

### 3. 테스트 계정으로 로그인
```
Email: admin@goyang.go.kr
Password: Admin1234!
```

**자세한 설정은** → [QUICK_START.md](QUICK_START.md)

---

## 📊 개발 진행 상황

### Phase 개발 현황

| Phase | 기능 | 상태 | 완료율 |
|-------|------|------|--------|
| **Phase 1** | 기반 구축 & 인증 | ✅ 완료 | 100% |
| **Phase 2** | Templates 관리 | 🔜 대기 | 0% |
| **Phase 3** | Displays 관리 | 🔜 대기 | 0% |
| **Phase 4** | Preview Studio | 🔜 대기 | 0% |
| **Phase 5** | Schedules 관리 | 🔜 대기 | 0% |
| **Phase 6** | 송출 페이지 | 🔜 대기 | 0% |
| **Phase 7** | 모니터링 & 증빙 | 🔜 대기 | 0% |

**전체 진행률**: 14% (Phase 1 완료)

### Phase 1 완료 항목 ✅
- [x] Supabase 연결 및 설정
- [x] 사용자 인증 시스템
- [x] 공통 UI 컴포넌트 (50+)
- [x] 레이아웃 시스템 (Header, Sidebar, MainLayout)
- [x] 공통 훅 (useToast, useConfirm, usePermissions, useRealtime)
- [x] 라우터 설정 (React Router)
- [x] 권한 기반 접근 제어
- [x] 에러 핸들링 시스템
- [x] 완전한 문서화

**상세 내역** → [PHASE1_COMPLETE.md](docs/00_meta/PHASE1_COMPLETE.md)

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    고양 스마트시티 전광판 시스템                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   운영자 PC      │    │   전광판 디바이스  │    │  외부 API       │
│  (관리 화면)     │    │  (/display/:id)  │    │  (기상/대기질)   │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                       │
         │  REST API            │  Realtime             │  Edge
         │  RLS 정책            │  Subscription         │  Functions
         ▼                      ▼                       ▼
┌──────────────────────────────────────────────────────────────┐
│                     Supabase Backend                         │
├──────────────────────────────────────────────────────────────┤
│  PostgreSQL 15  │  Realtime  │  Auth  │  Edge Functions     │
│  9개 테이블     │  자동 갱신   │ RLS   │  API 수집 (매시간)   │
│  2개 뷰         │            │       │                      │
└──────────────────────────────────────────────────────────────┘
```

**상세 아키텍처** → [01_architecture.md](docs/02_design/01_architecture.md)

---

## 🗂️ 프로젝트 구조

```
/
├── docs/                          # 📚 전체 문서
│   ├── 00_meta/                   # Phase 계획 및 완료 리포트
│   ├── 01_planning/               # 기획 및 요구사항
│   ├── 02_design/                 # 설계 (ERD, 아키텍처)
│   ├── 03_implementation/         # Phase별 구현 문서
│   └── 05_deployment/             # 배포 및 설정
│
├── lib/                           # 라이브러리
│   ├── supabase.ts               # Supabase 클라이언트
│   ├── types.ts                  # TypeScript 타입
│   ├── hooks/                    # Custom Hooks
│   └── utils/                    # 유틸리티 함수
│
├── components/                    # React 컴포넌트
│   ├── ui/                       # shadcn/ui 컴포넌트 (50+)
│   ├── layout/                   # 레이아웃 컴포넌트
│   ├── AuthProvider.tsx          # 인증 Provider
│   └── ProtectedRoute.tsx        # 보호된 라우트
│
├── pages/                         # 페이지 컴포넌트
│   ├── Dashboard.tsx             # 대시보드
│   └── NotFound.tsx              # 404 페이지
│
├── supabase/                      # Supabase 설정
│   ├── migrations/               # 데이터베이스 마이그레이션
│   ├── functions/                # Edge Functions
│   └── config.toml               # Supabase 설정
│
├── App.tsx                        # 메인 진입점
└── .env.example                   # 환경 변수 템플릿
```

---

## 🛠️ 기술 스택

### Frontend
- **프레임워크**: React 18 + TypeScript
- **라우팅**: React Router v6
- **스타일링**: Tailwind CSS v4
- **UI 컴포넌트**: shadcn/ui (50+ 컴포넌트)
- **상태 관리**: Zustand (확인 모달), React Context (인증)
- **알림**: Sonner (Toast)

### Backend
- **BaaS**: Supabase
- **데이터베이스**: PostgreSQL 15
- **실시간**: Supabase Realtime
- **인증**: Supabase Auth
- **서버리스**: Edge Functions (Deno)

### External APIs
- **기상청 API**: 단기예보 조회서비스
- **환경부 API**: 대기오염정보 조회서비스

---

## 📖 주요 문서

### 기획 및 설계
- [프로젝트 개요](docs/01_planning/01_overview.md) - 전체 시스템 개요
- [요구사항 정의](docs/01_planning/02_requirements.md) - 납품 판정 기준
- [ERD](docs/02_design/02_erd.md) - 데이터베이스 설계
- [우선순위 규칙](docs/03_features/03_priority_conflict_rules.md) - 송출 우선순위

### 개발 가이드
- [Phase 개발 계획](docs/00_meta/PHASE_PLAN.md) - 전체 7개 Phase 계획
- [Phase 1 명세서](docs/03_implementation/phase1/PHASE1_SPEC.md) - 기반 구축 상세
- [Phase 1 테스트](docs/03_implementation/phase1/PHASE1_TEST.md) - 테스트 가이드

### 설정 및 배포
- [빠른 시작](QUICK_START.md) - 5분 가이드
- [Supabase 설정](SUPABASE_SETUP.md) - 상세 설정 가이드
- [프론트엔드 설정](FRONTEND_SETUP.md) - 프론트엔드 설정

---

## 🎯 주요 기능

### Phase 1: 기반 구축 & 인증 ✅
- ✅ Supabase 연결 및 데이터베이스 설정
- ✅ 사용자 인증 (로그인/로그아웃)
- ✅ 권한별 접근 제어 (ADMIN/OPERATOR/VIEWER)
- ✅ 공통 컴포넌트 및 레이아웃
- ✅ 라우터 및 네비게이션

### Phase 2: Templates 관리 (다음 단계)
- 📝 메시지 템플릿 CRUD
- 📝 카테고리 관리
- 📝 실시간 미리보기
- 📝 스타일 설정 (색상, 폰트, 레이아웃)

### Phase 3: Displays 관리
- 🖥️ 전광판 CRUD
- 🖥️ 측정소 연결 설정
- 🖥️ 그룹 관리

### Phase 4: Preview Studio
- 🎨 실시간 미리보기 (픽셀 단위 정확도)
- 🎨 즉시/예약/긴급 송출
- 🎨 우선순위 처리 로직

### Phase 5: Schedules 관리
- 📅 캘린더 뷰
- 📅 반복 일정 (매일/매주/매월)
- 📅 충돌 감지 및 해소

### Phase 6: 송출 페이지
- 📺 `/display/:id` 단일 URL
- 📺 Realtime 자동 갱신
- 📺 우선순위 기반 콘텐츠 표시

### Phase 7: 모니터링 & 증빙
- 📊 Dashboard (통계, 최근 이력)
- 📊 Audit Logs (필터링, CSV Export)
- 📊 실증 리포트 생성

---

## 🔐 권한 체계

### 역할 정의
- **ADMIN**: 모든 기능 접근 가능 (사용자 관리, 삭제 권한)
- **OPERATOR**: 운영 기능 접근 가능 (템플릿, 전광판, 송출 관리)
- **VIEWER**: 읽기 전용 (조회만 가능)

### 긴급 송출 권한
`can_emergency: true` 설정 시 긴급 송출 기능 사용 가능

**상세 권한 체계** → [02_requirements.md](docs/01_planning/02_requirements.md)

---

## 🧪 테스트

### 테스트 계정
```
ADMIN:    admin@goyang.go.kr / Admin1234!
OPERATOR: operator@goyang.go.kr / Operator1234!
VIEWER:   viewer@goyang.go.kr / Viewer1234!
```

### Supabase 연결 테스트
```bash
npm run dev
# 브라우저에서 http://localhost:5173/test 접속
```

**테스트 가이드** → [PHASE1_TEST.md](docs/03_implementation/phase1/PHASE1_TEST.md)

---

## 📝 감사 로그 (Audit Logs)

모든 작업이 자동으로 `audit_logs` 테이블에 기록됩니다:

```typescript
// 예시: 템플릿 생성 시
await logAction({
  action: 'CREATE',
  resourceType: 'template',
  resourceId: templateId,
  actionDetail: { name: '방역 안내' },
});
```

**기록 항목**:
- user_id, user_email, user_role
- action (CREATE/UPDATE/DELETE/BROADCAST)
- resource_type, resource_id
- action_detail (JSON)
- ip_address, user_agent
- created_at

---

## 🚨 긴급 송출

### 우선순위 규칙
```
EMERGENCY (priority: 1000)
    ↓ 덮어씀
NOTICE (priority: 200)
    ↓ 덮어씀
WEATHER (priority: 100) ← 기본
```

### 긴급 송출 시나리오
1. OPERATOR가 긴급 메시지 작성
2. "긴급 송출" 버튼 클릭
3. `display_state` 테이블에 priority=1000으로 INSERT
4. Realtime 구독 → 전광판 즉시 갱신
5. Audit Log 기록

**상세 규칙** → [03_priority_conflict_rules.md](docs/03_features/03_priority_conflict_rules.md)

---

## 📦 배포

### 프론트엔드 빌드
```bash
npm run build
# dist/ 폴더 생성
```

### Supabase Edge Functions 배포
```bash
npx supabase functions deploy collect-weather-data
npx supabase functions deploy collect-air-quality-data
```

**배포 가이드** → [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

---

## 🤝 기여 및 이슈

### 이슈 리포팅
발견된 버그나 개선 사항은 GitHub Issues에 등록해 주세요.

### 코드 컨벤션
- **TypeScript**: 모든 파일에 타입 정의
- **ESLint**: 경고 0개 유지
- **Prettier**: 자동 포맷팅
- **주석**: JSDoc 스타일

---

## 📞 문의

**프로젝트 관리자**: 시스템 아키텍트  
**이메일**: [담당자 이메일]  
**문서 버전**: v1.0.0  
**최종 수정**: 2024-12-16

---

## 📄 라이선스

이 프로젝트는 고양시 스마트시티 리빙랩 실증사업의 일환으로 개발되었습니다.

---

## 🙏 Attributions

사용된 오픈소스 라이브러리 및 리소스는 [Attributions.md](Attributions.md)를 참조하세요.

---

**Made with ❤️ for 고양 스마트시티**
