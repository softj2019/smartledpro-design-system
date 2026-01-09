# 고양 스마트시티 전광판 시스템 - Phase 개발 계획

## 📋 문서 정보
- **작성일**: 2024-12-16
- **버전**: v1.0.0
- **작성자**: 시스템 아키텍트
- **목적**: 전체 시스템을 7개 Phase로 분리하여 순차적 개발 및 문서화

---

## 🎯 Phase 개발 원칙

### 1. 완전성 (Completeness)
- 각 Phase는 독립적으로 동작 가능한 완전한 기능 단위
- 모든 CRUD 작업에 대한 audit_logs 기록 필수
- RLS 정책 준수 및 권한 검증

### 2. 점진적 확장 (Progressive Enhancement)
- 이전 Phase 기능을 기반으로 확장
- 하위 호환성 유지
- 코드 재사용 극대화

### 3. 문서화 우선 (Documentation First)
- 각 Phase 시작 전 상세 명세 문서 작성
- 구현 후 테스트 가이드 및 체크리스트 제공
- 실증 증빙을 위한 스크린샷/로그 수집 가이드

### 4. 실증 대응 (Demo Ready)
- 중간점검/중간평가/최종평가 시연 시나리오 포함
- 납품 판정 기준 충족 여부 자동 체크
- PM/평가위원 대상 설명 자료

---

## 📊 Phase 전체 구조

```
Phase 1: 기반 구축 & 인증 [✅ 진행 중]
├─ Supabase 연결 ✅
├─ 인증 시스템 ✅
└─ 공통 컴포넌트 & 훅 [다음]

Phase 2: 데이터 관리 - Templates
├─ Templates CRUD
├─ 카테고리 관리
└─ 실시간 미리보기

Phase 3: 전광판 관리 - Displays
├─ Displays CRUD
├─ 측정소 연결 설정
└─ 그룹 관리

Phase 4: 송출 시스템 - Preview Studio
├─ 실시간 미리보기 (픽셀 단위)
├─ 즉시/예약/긴급 송출
└─ 우선순위 처리 로직

Phase 5: 자동화 - Schedules
├─ 캘린더 뷰
├─ 반복 일정 (매일/매주/매월)
└─ 충돌 감지 및 해소

Phase 6: 송출 페이지
├─ /display/:id 단일 URL
├─ Realtime 구독 자동 갱신
└─ 우선순위 기반 콘텐츠 표시

Phase 7: 모니터링 & 증빙
├─ Dashboard (통계, 최근 이력)
├─ Audit Logs (필터링, Export)
└─ 실증 리포트 생성
```

---

## 📅 Phase 1: 기반 구축 & 인증

### 목표
Supabase 연결, 사용자 인증, 공통 컴포넌트 구축

### 완료 항목 ✅
- [x] Supabase 클라이언트 설정 (`/lib/supabase.ts`)
- [x] TypeScript 타입 정의 (`/lib/types.ts`)
- [x] 인증 Provider (`/components/AuthProvider.tsx`)
- [x] 로그인 화면 (`/components/Login.tsx`)
- [x] 연결 테스트 컴포넌트 (`/components/SupabaseTest.tsx`)
- [x] 환경 변수 설정 (`.env.example`)

### 진행 예정
- [ ] 공통 UI 컴포넌트 (버튼, 입력, 모달 등)
- [ ] 공통 훅 (`useToast`, `useConfirm`, `useRealtime`)
- [ ] 레이아웃 컴포넌트 (헤더, 사이드바, 네비게이션)
- [ ] 라우터 설정 (React Router)
- [ ] 권한 검증 유틸리티
- [ ] 에러 핸들링 시스템

### 산출물
- [x] `/lib/supabase.ts` - Supabase 클라이언트
- [x] `/lib/types.ts` - 타입 정의
- [x] `/components/AuthProvider.tsx` - 인증 컨텍스트
- [x] `/components/Login.tsx` - 로그인 화면
- [x] `/FRONTEND_SETUP.md` - 프론트엔드 설정 가이드
- [ ] `/docs/03_implementation/phase1/PHASE1_SPEC.md` - Phase 1 상세 명세
- [ ] `/docs/03_implementation/phase1/PHASE1_TEST.md` - Phase 1 테스트 가이드
- [ ] `/components/ui/*` - 공통 UI 컴포넌트
- [ ] `/lib/hooks/*` - 공통 훅

### 완료 기준
- ✅ Supabase 연결 테스트 4개 모두 통과
- ✅ 로그인/로그아웃 정상 동작
- [ ] 공통 컴포넌트 Storybook 문서화
- [ ] 권한별(ADMIN/OPERATOR/VIEWER) 접근 제어 검증
- [ ] 에러 발생 시 사용자 친화적 메시지 표시

### 예상 소요 시간
- 완료: 2시간 (Supabase 연결 + 인증)
- 남은 작업: 3시간 (공통 컴포넌트 + 레이아웃)

---

## 📅 Phase 2: 데이터 관리 - Templates

### 목표
메시지 템플릿 CRUD, 카테고리 관리, 스타일 설정, 미리보기

### 구현 범위
- **Templates 목록 조회**
  - 페이지네이션 (20개/페이지)
  - 카테고리 필터링
  - 검색 (이름, 제목, 본문)
  - 정렬 (최신순, 이름순, 카테고리순)

- **Template 생성**
  - 이름, 제목, 본문, 하이라이트 입력
  - 카테고리 선택/생성
  - 스타일 설정 (색상, 폰트 크기, 배경)
  - 실시간 미리보기
  - 저장 시 audit_logs 기록

- **Template 수정**
  - 기존 템플릿 로드
  - 버전 관리 (version 자동 증가)
  - 변경 사항 미리보기
  - 수정 시 audit_logs 기록

- **Template 삭제**
  - 연결된 스케줄 확인
  - 확인 모달 (사용 중인 경우 경고)
  - 소프트 삭제 또는 하드 삭제
  - 삭제 시 audit_logs 기록

- **Template 미리보기**
  - 실시간 렌더링 (1920x1080 기준)
  - 반응형 스케일링
  - 스타일 실시간 적용

### 기술 스택
- React Hook Form (폼 관리)
- Zod (유효성 검증)
- TanStack Query (데이터 페칭)
- Sonner (토스트 알림)

### 산출물
- `/docs/03_implementation/phase2/PHASE2_SPEC.md`
- `/docs/03_implementation/phase2/PHASE2_TEST.md`
- `/components/templates/TemplateList.tsx`
- `/components/templates/TemplateForm.tsx`
- `/components/templates/TemplatePreview.tsx`
- `/components/templates/TemplateCard.tsx`
- `/lib/hooks/useTemplates.ts`
- `/lib/validations/template.ts`

### 완료 기준
- [ ] 템플릿 생성/조회/수정/삭제 정상 동작
- [ ] 모든 작업에 대한 audit_logs 기록
- [ ] 카테고리 필터링 및 검색 정상 동작
- [ ] 미리보기가 실제 송출 화면과 동일
- [ ] 권한별 접근 제어 (VIEWER는 조회만 가능)
- [ ] 에러 발생 시 롤백 및 사용자 알림

### 예상 소요 시간
4시간

---

## 📅 Phase 3: 전광판 관리 - Displays

### 목표
전광판 CRUD, 측정소 연결, 그룹 관리

### 구현 범위
- **Displays 목록 조회**
  - 활성/비활성 필터링
  - 그룹별 필터링
  - 해상도별 정렬

- **Display 생성**
  - 이름, 위치, 해상도 입력
  - 그룹 선택/생성
  - 기상 측정소 선택
  - 대기질 측정소 선택
  - 레이아웃 설정 (기본값 제공)
  - 생성 시 audit_logs 기록

- **Display 수정**
  - 측정소 변경
  - 레이아웃 설정 업데이트
  - 활성/비활성 토글
  - 수정 시 audit_logs 기록

- **Display 삭제**
  - 연결된 스케줄 확인
  - 확인 모달
  - CASCADE 삭제 (display_config, display_state 자동 삭제)
  - 삭제 시 audit_logs 기록

- **측정소 관리**
  - Weather Stations 목록 조회
  - Air Stations 목록 조회
  - 지역별 필터링 (시도, 시군구)

### 산출물
- `/docs/03_implementation/phase3/PHASE3_SPEC.md`
- `/docs/03_implementation/phase3/PHASE3_TEST.md`
- `/components/displays/DisplayList.tsx`
- `/components/displays/DisplayForm.tsx`
- `/components/displays/DisplayCard.tsx`
- `/components/displays/StationSelector.tsx`
- `/lib/hooks/useDisplays.ts`
- `/lib/hooks/useStations.ts`

### 완료 기준
- [ ] 전광판 생성/조회/수정/삭제 정상 동작
- [ ] 측정소 선택 및 연결 정상 동작
- [ ] 그룹 관리 기능 정상 동작
- [ ] 모든 작업에 대한 audit_logs 기록
- [ ] 권한별 접근 제어

### 예상 소요 시간
3시간

---

## 📅 Phase 4: 송출 시스템 - Preview Studio

### 목표
실시간 미리보기, 즉시/예약/긴급 송출, 우선순위 처리

### 구현 범위
- **Preview Studio UI**
  - 좌측: 템플릿 선택 + 설정
  - 중앙: 실시간 미리보기 (픽셀 단위 정확도)
  - 우측: 전광판 선택 + 송출 옵션

- **즉시 송출**
  - 선택한 템플릿 즉시 송출
  - display_state INSERT (priority=200)
  - 송출 성공 알림
  - audit_logs 기록

- **예약 송출**
  - 시작/종료 시간 설정
  - schedules INSERT
  - Edge Function 트리거 (시간 도달 시 display_state 업데이트)
  - audit_logs 기록

- **긴급 송출**
  - can_emergency=true 사용자만 가능
  - display_state INSERT (priority=1000)
  - 기존 콘텐츠 즉시 대체
  - 긴급 해제 버튼 제공
  - audit_logs 기록

- **우선순위 처리 로직**
  ```
  EMERGENCY (1000) > NOTICE (200) > WEATHER (100)
  ```
  - display_state 조회 시 priority DESC 정렬
  - 우선순위가 높은 콘텐츠 자동 표시
  - 시간 만료 시 자동 제거

- **실시간 미리보기**
  - 템플릿 변경 시 즉시 반영
  - 스타일 변경 시 즉시 반영
  - 기상/대기질 데이터 실시간 표시

### 산출물
- `/docs/03_implementation/phase4/PHASE4_SPEC.md`
- `/docs/03_implementation/phase4/PHASE4_TEST.md`
- `/components/studio/PreviewStudio.tsx`
- `/components/studio/TemplateSelector.tsx`
- `/components/studio/DisplaySelector.tsx`
- `/components/studio/BroadcastControls.tsx`
- `/components/studio/LivePreview.tsx`
- `/lib/hooks/useBroadcast.ts`
- `/lib/hooks/usePriority.ts`

### 완료 기준
- [ ] 즉시/예약/긴급 송출 모두 정상 동작
- [ ] 우선순위 처리 로직 정확히 동작
- [ ] 미리보기가 실제 송출 화면과 100% 일치
- [ ] 긴급 권한 검증 정상 동작
- [ ] 모든 송출에 대한 audit_logs 기록
- [ ] 동시 송출 시 충돌 처리

### 예상 소요 시간
5시간 (핵심 기능)

---

## 📅 Phase 5: 자동화 - Schedules

### 목표
캘린더 뷰, 반복 일정, 충돌 감지

### 구현 범위
- **캘린더 뷰**
  - 월간 캘린더
  - 일정 클릭 → 상세 보기
  - 일정 드래그 앤 드롭 (시간 변경)

- **일정 생성**
  - 템플릿 선택
  - 전광판 다중 선택
  - 시작/종료 시간 설정
  - 반복 규칙 설정
    - 매일 (특정 시간)
    - 매주 (요일 선택)
    - 매월 (날짜 선택)
  - 우선순위 설정
  - audit_logs 기록

- **반복 일정 처리**
  - recurrence_rule JSON 저장
  - Edge Function에서 반복 일정 계산
  - 다음 발생 시간 자동 계산

- **충돌 감지**
  - 같은 전광판, 같은 시간대 확인
  - 우선순위 비교
  - 경고 메시지 표시
  - 강제 덮어쓰기 옵션

- **일정 수정/삭제**
  - 단일 일정 수정
  - 반복 일정 전체 수정
  - 특정 날짜만 제외
  - audit_logs 기록

### 산출물
- `/docs/03_implementation/phase5/PHASE5_SPEC.md`
- `/docs/03_implementation/phase5/PHASE5_TEST.md`
- `/components/schedules/ScheduleCalendar.tsx`
- `/components/schedules/ScheduleForm.tsx`
- `/components/schedules/RecurrenceEditor.tsx`
- `/components/schedules/ConflictDetector.tsx`
- `/lib/hooks/useSchedules.ts`
- `/lib/utils/recurrence.ts`

### 완료 기준
- [ ] 일정 생성/조회/수정/삭제 정상 동작
- [ ] 반복 일정 정확히 처리
- [ ] 충돌 감지 및 경고 정상 동작
- [ ] 캘린더 UI 직관적
- [ ] 모든 작업에 대한 audit_logs 기록

### 예상 소요 시간
4시간

---

## 📅 Phase 6: 송출 페이지

### 목표
전광판에서 접속하는 단일 URL, Realtime 자동 갱신

### 구현 범위
- **송출 페이지 라우트**
  - `/display/:id` 단일 URL
  - 전광판 ID 기반 콘텐츠 조회
  - 존재하지 않는 ID → 404 페이지

- **우선순위 기반 콘텐츠 표시**
  ```sql
  SELECT * FROM v_current_display_content
  WHERE display_id = :id
  ORDER BY priority DESC, updated_at DESC
  LIMIT 1
  ```
  - EMERGENCY 우선 표시
  - NOTICE 다음 표시
  - WEATHER 기본 표시

- **Realtime 구독**
  ```typescript
  supabase
    .channel(`display_${displayId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'display_state',
      filter: `display_id=eq.${displayId}`
    }, (payload) => {
      // 콘텐츠 자동 갱신
    })
    .subscribe()
  ```

- **콘텐츠 렌더링**
  - 템플릿 기반 렌더링
  - 스타일 설정 적용
  - 기상/대기질 데이터 표시
  - 애니메이션 효과

- **네트워크 끊김 대응**
  - 마지막 콘텐츠 캐싱
  - 재연결 시 자동 갱신
  - 오프라인 표시

- **시간 만료 처리**
  - end_at 도달 시 자동 제거
  - 다음 우선순위 콘텐츠 표시
  - WEATHER 기본 폴백

### 산출물
- `/docs/03_implementation/phase6/PHASE6_SPEC.md`
- `/docs/03_implementation/phase6/PHASE6_TEST.md`
- `/pages/Display.tsx`
- `/components/display/ContentRenderer.tsx`
- `/components/display/WeatherDisplay.tsx`
- `/components/display/NoticeDisplay.tsx`
- `/components/display/EmergencyDisplay.tsx`
- `/lib/hooks/useDisplayContent.ts`

### 완료 기준
- [ ] /display/:id URL 정상 동작
- [ ] 우선순위 기반 콘텐츠 표시 정확
- [ ] Realtime 구독 자동 갱신 정상 동작
- [ ] 네트워크 끊김 시 대응 정상 동작
- [ ] 시간 만료 시 자동 전환
- [ ] 모든 전광판 해상도 대응

### 예상 소요 시간
4시간

---

## 📅 Phase 7: 모니터링 & 증빙

### 목표
Dashboard, Audit Logs, 실증 리포트

### 구현 범위
- **Dashboard**
  - 최근 송출 이력 (타임라인)
  - 활성 전광판 상태
  - 금일 송출 통계
  - 빠른 작업 버튼
  - 시스템 상태 모니터링

- **Audit Logs**
  - 전체 작업 이력 조회
  - 필터링
    - 날짜 범위
    - 사용자
    - 액션 (CREATE/UPDATE/DELETE)
    - 리소스 타입
  - 정렬 (최신순, 사용자순)
  - CSV Export
  - 상세 보기 모달

- **통계 차트**
  - 일별 송출 건수 (라인 차트)
  - 콘텐츠 타입별 비율 (파이 차트)
  - 사용자별 작업 통계 (바 차트)
  - 전광판별 활용도 (히트맵)

- **실증 리포트 생성**
  - 기간별 리포트
  - 송출 이력 요약
  - 사용자 활동 요약
  - PDF Export

### 산출물
- `/docs/03_implementation/phase7/PHASE7_SPEC.md`
- `/docs/03_implementation/phase7/PHASE7_TEST.md`
- `/pages/Dashboard.tsx`
- `/pages/AuditLogs.tsx`
- `/components/dashboard/RecentActivity.tsx`
- `/components/dashboard/StatsChart.tsx`
- `/components/dashboard/QuickActions.tsx`
- `/components/audit/AuditLogTable.tsx`
- `/components/audit/AuditLogFilter.tsx`
- `/lib/hooks/useAuditLogs.ts`
- `/lib/utils/export.ts`

### 완료 기준
- [ ] Dashboard 모든 위젯 정상 표시
- [ ] Audit Logs 필터링 및 검색 정상 동작
- [ ] CSV Export 정상 동작
- [ ] 통계 차트 정확한 데이터 표시
- [ ] 실증 리포트 생성 정상 동작

### 예상 소요 시간
4시간

---

## 📊 전체 개발 일정

| Phase | 기능 | 예상 시간 | 상태 |
|-------|------|-----------|------|
| Phase 1 | 기반 구축 & 인증 | 5h | 🟡 진행 중 (2h 완료) |
| Phase 2 | Templates 관리 | 4h | ⚪ 대기 |
| Phase 3 | Displays 관리 | 3h | ⚪ 대기 |
| Phase 4 | Preview Studio | 5h | ⚪ 대기 |
| Phase 5 | Schedules 관리 | 4h | ⚪ 대기 |
| Phase 6 | 송출 페이지 | 4h | ⚪ 대기 |
| Phase 7 | 모니터링 & 증빙 | 4h | ⚪ 대기 |
| **합계** | | **29h** | **7%** |

---

## 🎓 실증 대응 전략

### 중간점검 (Phase 3 완료 후)
- **시연 내용**
  1. 템플릿 생성 및 미리보기
  2. 전광판 등록 및 측정소 연결
  3. Audit Logs 확인
- **준비 자료**
  - Phase 1~3 기능 명세서
  - 데이터베이스 ERD
  - 화면 흐름도

### 중간평가 (Phase 5 완료 후)
- **시연 내용**
  1. 전체 워크플로우 (템플릿 → 송출 → 확인)
  2. 예약 송출 및 반복 일정
  3. 우선순위 처리 (긴급 송출)
- **준비 자료**
  - 전체 시스템 아키텍처
  - API 문서
  - 테스트 리포트

### 최종평가 (Phase 7 완료 후)
- **시연 내용**
  1. 실제 전광판 URL 접속
  2. Realtime 자동 갱신 시연
  3. Dashboard 통계 확인
  4. Audit Logs 및 실증 리포트
- **준비 자료**
  - 완전한 시스템 문서
  - 실증 증빙 자료
  - 사용자 매뉴얼

---

## 📝 문서 체계

```
/docs/
├── 00_meta/
│   ├── PHASE_PLAN.md           ← 현재 문서
│   └── DELIVERY_CHECKLIST.md   ← 납품 체크리스트
│
├── 01_planning/
│   ├── 01_overview.md          ✅
│   ├── 02_requirements.md      ✅
│   └── 03_constraints.md       ✅
│
├── 02_design/
│   ├── 01_architecture.md      ✅
│   ├── 02_erd.md               ✅
│   ├── 03_api_design.md        ✅
│   ├── 04_priority_rule.md     ✅
│   └── 05_ui_ux.md             ✅
│
├── 03_implementation/
│   ├── phase1/
│   │   ├── PHASE1_SPEC.md
│   │   └── PHASE1_TEST.md
│   ├── phase2/
│   │   ├── PHASE2_SPEC.md
│   │   └── PHASE2_TEST.md
│   ├── ... (phase3~7)
│   └── INTEGRATION.md
│
├── 04_testing/
│   ├── UNIT_TEST.md
│   ├── INTEGRATION_TEST.md
│   └── E2E_TEST.md
│
├── 05_deployment/
│   ├── SUPABASE_SETUP.md       ✅
│   ├── FRONTEND_DEPLOY.md
│   └── EDGE_FUNCTIONS.md
│
└── 06_demo/
    ├── DEMO_SCENARIO.md
    ├── SCREENSHOT_GUIDE.md
    └── FINAL_REPORT.md
```

---

## ✅ Phase 완료 체크리스트 템플릿

각 Phase 완료 시 다음 항목을 체크:

### 기능 구현
- [ ] 모든 CRUD 작업 정상 동작
- [ ] Audit Logs 기록 확인
- [ ] 권한별 접근 제어 검증
- [ ] 에러 핸들링 및 사용자 알림

### 문서화
- [ ] 기능 명세서 작성
- [ ] 테스트 가이드 작성
- [ ] API 문서 업데이트
- [ ] 스크린샷 첨부

### 코드 품질
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 경고 없음
- [ ] 코드 리뷰 완료
- [ ] 주석 및 문서화

### 테스트
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 통과
- [ ] 브라우저 호환성 확인
- [ ] 반응형 디자인 검증

---

## 🚀 다음 단계

**현재 위치**: Phase 1 진행 중 (40% 완료)

**즉시 진행할 작업**:
1. Phase 1 상세 명세서 작성
2. 공통 UI 컴포넌트 구현
3. 레이아웃 및 라우터 설정
4. Phase 1 완료 후 Phase 2 진입

---

**승인**: _______________  
**날짜**: 2024-12-16  
**버전**: v1.0.0
