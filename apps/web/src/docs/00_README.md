# Figma Make + Supabase 고도화 계획 수립 문서

## 프로젝트 개요

**사업명**: 체육공원 전광판 활용 개선  
**사업유형**: 고양 스마트시티 리빙랩 실증사업  
**문서 버전**: v1.0.0 (완성형)  
**작성일**: 2024-12-16

---

## 문서 목적

이 문서는 다음 모든 기준을 **동시에** 만족하는 **단일·완성·최종 설계 문서**입니다:

- ✅ Figma Make 생성 기준
- ✅ Supabase DB/권한/로그 기준
- ✅ 고양 스마트시티 리빙랩 실증 평가 기준
- ✅ 중간점검·중간평가·최종평가 대응 기준
- ✅ 최종 납품 판정 기준

이 문서 하나가 다음 모든 기준 문서를 **대체**합니다:
- 기획서
- 요구사항 정의서
- 기능 명세서
- 설계 기준
- 실증 평가 기준
- 납품 판정 기준

---

## 문서 구조

### Phase 0: 메타 문서 (00_meta/)
시스템 현황, 검수 결과, 마이그레이션 기록 등을 관리합니다.

- [SCHEDULE_EXECUTION_FIX_COMPLETE.md](./00_meta/SCHEDULE_EXECUTION_FIX_COMPLETE.md) - 스케줄 실행 시스템 수정 완료 기록
- [SCHEDULE_SYSTEM_CHECKLIST.md](./00_meta/SCHEDULE_SYSTEM_CHECKLIST.md) - 스케줄 시스템 검수 체크리스트
- **[POSTGRESQL_MIGRATION_QUICKSTART.md](./00_meta/POSTGRESQL_MIGRATION_QUICKSTART.md)** ⭐ - PostgreSQL 마이그레이션 빠른 시작 (5분)
- [POSTGRESQL_MIGRATION_COMPLETE.md](./00_meta/POSTGRESQL_MIGRATION_COMPLETE.md) - PostgreSQL 마이그레이션 완료 보고서
- [POSTGRESQL_MIGRATION_CHECKLIST.md](./00_meta/POSTGRESQL_MIGRATION_CHECKLIST.md) - PostgreSQL 마이그레이션 체크리스트

### Phase 1: 기획 (01_planning/)
프로젝트의 정체성, 배경, 요구사항, API 연동, 운영 시나리오를 정의합니다.

- [01_overview.md](./01_planning/01_overview.md) - 프로젝트 개요 및 정체성
- [02_requirements.md](./01_planning/02_requirements.md) - 최상위 목표 및 절대 원칙
- [03_api_integration.md](./01_planning/03_api_integration.md) - 공공데이터 API 연동 계획
- [04_operating_scenarios.md](./01_planning/04_operating_scenarios.md) - 운영 시나리오 및 사용자 스토리

### Phase 2: 설계 (02_design/)
시스템 아키텍처, ERD, 데이터 사전, ETL, 권한 체계를 설계합니다.

- [01_architecture.md](./02_design/01_architecture.md) - 시스템 아키텍처
- [02_erd.md](./02_design/02_erd.md) - ERD 및 테이블 관계도
- [03_data_dictionary.md](./02_design/03_data_dictionary.md) - 데이터 사전 (전체 컬럼 정의)
- [04_etl_design.md](./02_design/04_etl_design.md) - ETL/데이터 수집 설계
- [05_auth_rbac_rls.md](./02_design/05_auth_rbac_rls.md) - 인증/권한/RLS 설계

### Phase 3: 기능 명세 (03_features/)
핵심 기능, 통합 구현 계획, 우선순위 및 충돌 규칙을 정의합니다.

- [01_feature_spec.md](./03_features/01_feature_spec.md) - 전체 기능 명세
- [02_integrated_impl_plan.md](./03_features/02_integrated_impl_plan.md) - 통합 구현 계획
- [03_priority_conflict_rules.md](./03_features/03_priority_conflict_rules.md) - 송출 우선순위 및 충돌 처리 규칙

### Phase 4: UI/UX 설계 (04_design_uiux/)
정보구조, 와이어프레임, Figma Make 디자인 시스템을 정의합니다.

- [01_ia.md](./04_design_uiux/01_ia.md) - 정보구조(IA) 및 메뉴 구조
- [02_wireframe.md](./04_design_uiux/02_wireframe.md) - 화면 와이어프레임
- [03_figma_design_system.md](./04_design_uiux/03_figma_design_system.md) - Figma Make 디자인 시스템 적용

### Phase 5: 개발 (05_development/)
API 명세, ETL DAG, 환경 설정, CI/CD, DB 마이그레이션을 정의합니다.

- [01_api_spec.md](./05_development/01_api_spec.md) - API 명세서
- [02_etl_dag.md](./05_development/02_etl_dag.md) - ETL DAG 및 스케줄링
- [03_environment.md](./05_development/03_environment.md) - 환경 변수 및 설정
- [04_ci_cd.md](./05_development/04_ci_cd.md) - CI/CD 파이프라인
- [05_db_migrations.sql.md](./05_development/05_db_migrations.sql.md) - DB 마이그레이션 스크립트

### Phase 6: 테스트 및 검증 (06_testing/)
테스트 계획, 통합 테스트, 버그 관리, 이슈 추적을 정의합니다.

- [01_test_plan.md](./06_testing/01_test_plan.md) - 테스트 계획 및 시나리오
- [02_integration_test.md](./06_testing/02_integration_test.md) - 통합 테스트 시나리오
- [03_bug_report.md](./06_testing/03_bug_report.md) - 버그 리포트 템플릿
- [04_issue_tracking.md](./06_testing/04_issue_tracking.md) - 이슈 트래킹 및 관리

### Phase 7: 부록 (99_appendix/)
감사 로그 정책, 실증 증빙 매핑, 인수인계 매뉴얼을 정의합니다.

- [audit_log_policy.md](./99_appendix/audit_log_policy.md) - 감사 로그 정책
- [gov_evidence_mapping.md](./99_appendix/gov_evidence_mapping.md) - 실증 증빙 매핑
- **[OPERATOR_USER_GUIDE.md](./99_appendix/OPERATOR_USER_GUIDE.md)** ⭐ - 현업담당자 운영 가이드 (v2.0)
- **[OPERATOR_GUIDE_UPDATES.md](./99_appendix/OPERATOR_GUIDE_UPDATES.md)** 📝 - 운영 가이드 업데이트 내역

---

## 최종 납품 판정 기준

다음 조건을 **모두** 만족해야 "완료"로 간주됩니다:

- ✅ 운영자가 직접 템플릿 생성 가능
- ✅ 미리보기 확인 가능
- ✅ 즉시/예약 송출 가능
- ✅ 긴급 송출 및 해제 가능
- ✅ 전광판별 공기질 측정소 선택 가능
- ✅ 모든 행위 로그화
- ✅ 실증 보고서 증빙 가능

---

## 절대 원칙 (전 영역 공통 · 변경 불가)

### 1. 운영자 중심
- 모든 기능은 관리자 UI에서 완결되어야 한다.
- SQL 직접 실행, 서버 접속, CLI 조작을 요구해서는 안 된다.

### 2. 단일 송출 URL
```
/display/{display_id}
```

### 3. 송출 우선순위 (강제 규칙)
```
EMERGENCY(300) > NOTICE(200) > WEATHER(100)
```

### 4. 실증 증빙
- 모든 행위는 audit_logs에 기록
- CSV Export 가능
- 중간/최종 보고서에 바로 활용 가능해야 함

---

## 문서 사용 가이드

### 개발자용
1. `02_design/`에서 전체 시스템 구조 파악
2. `03_features/`에서 구현 기능 확인
3. `05_development/`에서 기술 스펙 확인
4. `06_testing/`에서 테스트 시나리오 확인

### PM/기획자용
1. `01_planning/`에서 사업 배경 및 요구사항 확인
2. `03_features/`에서 기능 명세 확인
3. `04_design_uiux/`에서 화면 구조 확인
4. `99_appendix/`에서 증빙 자료 확인

### 평가위원/감리용
1. `01_planning/02_requirements.md`에서 납품 판정 기준 확인
2. `99_appendix/gov_evidence_mapping.md`에서 증빙 자료 매핑 확인
3. `06_testing/01_test_plan.md`에서 실증 검증 항목 확인

---

## 프로젝트 역할 정의

이 문서는 다음 역할을 **동시에** 수행합니다:

- **총괄 PM**: 전체 프로젝트 관리 및 이해관계자 조율
- **시스템 아키텍트**: 기술 스택 및 시스템 구조 설계
- **UX 설계자**: 운영자 중심 사용자 경험 설계
- **백엔드 설계자**: Supabase 기반 데이터베이스 및 API 설계

---

## 라이선스 및 공개 정책

- 본 문서는 **고양시 스마트시티 리빙랩 실증사업** 공식 산출물입니다.
- 외부 공개 시 고양시 승인 필요
- 타 지자체 확산 시 사전 협의 필요

---

**문서 작성**: Figma Make + Supabase 고도화 프로젝트팀  
**최종 검토**: 2024-12-16  
**문서 상태**: 완성형 (Production Ready)