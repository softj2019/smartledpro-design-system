# 01_planning / 02_requirements.md

# 최상위 목표 및 절대 원칙

## 1. 최상위 목표 (운영자 관점)

본 시스템은 다음 질문에 **모두 "예"로 답할 수 있어야** 합니다.

이것이 **최종 납품 판정의 핵심 기준**입니다.

### 1.1 자립적 콘텐츠 제작

**질문**: 개발자 도움 없이 운영자가 콘텐츠를 만들 수 있는가?

#### 검증 기준
- ✅ 템플릿 기반 메시지 생성 (드래그앤드롭 불필요)
- ✅ 입력 필드 최소화 (3~6개 이내)
- ✅ 사전 정의된 색상/폰트/레이아웃 선택
- ✅ 복잡한 HTML/CSS 지식 불필요
- ✅ 저장 후 즉시 재사용 가능

#### 납품 판정 시연 시나리오
1. 운영자가 로그인
2. "템플릿 생성" 버튼 클릭
3. 제목, 본문, 강조 문구 입력 (총 3개 필드)
4. 색상 팔레트에서 선택 (코드 입력 없음)
5. "저장" 클릭 → 템플릿 목록에 즉시 표시
6. 5분 이내 완료

### 1.2 실시간 미리보기

**질문**: 실제 전광판과 동일한 화면을 미리 볼 수 있는가?

#### 검증 기준
- ✅ **픽셀 단위 정확도**: 전광판 해상도 정확히 반영
- ✅ **실시간 반영**: 설정 변경 시 리로드 없이 즉시 반영
- ✅ **프레임 표시**: 10px 프레임 ON/OFF 토글 (실측용)
- ✅ **안전영역 가이드**: 텍스트 잘림 방지 가이드라인 표시
- ✅ **다중 해상도 지원**: 전광판별 해상도 자동 적용

#### 납품 판정 시연 시나리오
1. Preview Studio 진입
2. 템플릿 선택 → 우측에 전광판 해상도로 즉시 렌더링
3. 텍스트 수정 → 타이핑 중에도 실시간 반영
4. "프레임 표시" 토글 → 10px 경계선 표시/숨김
5. 스크린샷 촬영 → 실제 전광판 송출 화면과 비교 (100% 일치)

### 1.3 송출 방식의 명확성

**질문**: 지금/예약/반복/긴급 송출이 명확히 구분되는가?

#### 검증 기준
- ✅ **즉시 송출 (Apply Now)**: 클릭 즉시 전광판에 반영
- ✅ **예약 송출**: start_at/end_at 캘린더 선택
- ✅ **반복 송출**: 매일/매주/매월 규칙 설정
- ✅ **긴급 송출**: 별도 빨간 버튼, 모든 스케줄 무시
- ✅ **긴급 해제**: 권한자만 가능, 해제 즉시 이전 상태 복원

#### 납품 판정 시연 시나리오
1. **즉시 송출**: "지금 송출" 버튼 → 5초 내 전광판 변경 확인
2. **예약 송출**: 내일 오전 9시~12시 설정 → 스케줄 목록 확인
3. **반복 송출**: 매주 월요일 9시 반복 → 캘린더에 표시
4. **긴급 송출**: "긴급 송출" 버튼 → 모든 전광판에 즉시 표시
5. **긴급 해제**: "긴급 해제" 버튼 → 이전 NOTICE로 복원

### 1.4 데이터 자동화 및 안정성

**질문**: 공공데이터가 자동으로 들어오고 실패 시에도 안정적인가?

#### 검증 기준
- ✅ **자동 수집**: 10분 간격 Supabase Edge Function 실행
- ✅ **실패 복원력**: API 실패 시 2~3회 재시도
- ✅ **Fallback**: 최종 실패 시 마지막 성공 데이터 유지
- ✅ **상태 표시**: Dashboard에 "정상/지연/실패" 표시
- ✅ **마지막 갱신 시각**: 데이터 신뢰도 판단 가능

#### 납품 판정 시연 시나리오
1. Dashboard에서 "마지막 갱신: 5분 전" 확인
2. 공기질 측정소 변경 → 다음 수집 주기에 자동 반영
3. API 실패 시뮬레이션 → Fallback 데이터 표시 확인
4. 재시도 로그 확인 (Supabase 로그)
5. 성공률 통계 확인 (95% 이상)

### 1.5 감사 추적 및 증빙

**질문**: 누가, 언제, 무엇을 했는지 증빙이 남는가?

#### 검증 기준
- ✅ **전체 행위 로깅**: 생성/수정/삭제/송출/긴급송출/해제 전부 기록
- ✅ **사용자 추적**: user_id, user_email, user_role 포함
- ✅ **타임스탬프**: 정확한 시각 기록 (timezone 포함)
- ✅ **변경 내용**: before/after 또는 action_detail JSON
- ✅ **CSV Export**: 버튼 클릭으로 즉시 다운로드

#### 납품 판정 시연 시나리오
1. 운영자 A가 템플릿 생성 → audit_logs에 기록
2. 운영자 B가 긴급 송출 → audit_logs에 기록
3. 관리자가 긴급 해제 → audit_logs에 기록
4. "감사 로그" 메뉴 진입 → 전체 이력 테이블 표시
5. "CSV 내보내기" 클릭 → 중간/최종 보고서에 첨부 가능

---

## 2. 절대 원칙 (전 영역 공통 · 변경 불가)

다음 원칙은 **어떠한 상황에서도 변경할 수 없습니다**.

### 2.1 운영자 중심 원칙

#### 원칙 선언
**모든 기능은 관리자 UI에서 완결되어야 한다.**

#### 금지 사항
- ❌ SQL 직접 실행 요구
- ❌ 서버 SSH 접속 요구
- ❌ CLI 명령어 실행 요구
- ❌ 환경 변수 직접 수정 요구
- ❌ API 직접 호출 요구

#### 허용 사항
- ✅ 웹 브라우저만으로 모든 작업 가능
- ✅ 드롭다운/버튼/입력창으로 모든 설정 가능
- ✅ 미리보기로 결과 확인 후 적용
- ✅ 실수 시 되돌리기 가능

#### 검증 방법
평가위원이 운영자 계정으로 로그인하여 다음을 확인:
1. 템플릿 생성 → UI만으로 완료
2. 송출 설정 → UI만으로 완료
3. 측정소 변경 → UI만으로 완료
4. 로그 확인 → UI만으로 완료

**단 한 번이라도 SQL/CLI/서버 접속이 필요하면 납품 불가.**

### 2.2 단일 송출 URL 원칙

#### URL 규칙
```
/display/{display_id}
```

#### 설명
- **{display_id}**: displays 테이블의 id (UUID 또는 순차 번호)
- **예시**: `/display/park-main-001`, `/display/123e4567-e89b-12d3-a456-426614174000`
- **변경 금지**: 쿼리 파라미터 금지 (`?mode=emergency` 등 불가)

#### 동작 방식
1. 송출 페이지는 **항상** `display_id`를 기준으로 렌더링
2. 우선순위 판단은 **서버 측(Supabase)에서 처리**
3. 클라이언트는 결과만 받아서 표시

#### 납품 판정 시연
1. 브라우저에서 `/display/park-main-001` 접속
2. NOTICE 송출 중 확인
3. 관리자가 긴급 송출 클릭
4. **URL 변경 없이** 동일 페이지에서 긴급 메시지 표시
5. 긴급 해제
6. **URL 변경 없이** 이전 NOTICE로 복원

**URL 변경이 발생하면 납품 불가.**

### 2.3 송출 우선순위 원칙 (강제 규칙)

#### 우선순위 규칙
```
EMERGENCY(300) > NOTICE(200) > WEATHER(100)
```

#### 상세 규칙

| 우선순위 | 타입 | priority 값 | 설명 |
|----------|------|-------------|------|
| 최고 | EMERGENCY | 300 | 재난·안전 긴급 메시지 |
| 중간 | NOTICE | 200 | 운영자 공지 사항 |
| 기본 | WEATHER | 100 | 기상청·AirKorea 자동 데이터 |

#### 처리 로직
```sql
-- display_state 테이블에서 현재 송출 콘텐츠 결정
SELECT * FROM display_state
WHERE display_id = {display_id}
  AND (start_at IS NULL OR start_at <= NOW())
  AND (end_at IS NULL OR end_at >= NOW())
ORDER BY priority DESC, updated_at DESC
LIMIT 1;
```

#### 예외 상황

**EMERGENCY 송출 시**
- 기존 NOTICE/WEATHER 무시
- 모든 전광판에 즉시 반영
- **audit_logs에 "emergency_override" 기록**

**EMERGENCY 해제 시**
- 이전에 송출 중이던 NOTICE/WEATHER로 복원
- **audit_logs에 "emergency_release" 기록**

#### 충돌 경고

| 상황 | 경고 메시지 | 동작 |
|------|-------------|------|
| NOTICE ↔ NOTICE 시간 겹침 | "기존 공지와 시간이 겹칩니다. 계속하시겠습니까?" | 사용자 확인 후 진행 |
| NOTICE ↔ WEATHER 겹침 | (경고 없음) | NOTICE가 우선 송출 |
| EMERGENCY 송출 | (경고 없음) | 모든 충돌 무시하고 즉시 송출 |

#### 납품 판정 시연
1. **시나리오 1**: WEATHER 자동 송출 중 → NOTICE 예약 송출 → NOTICE 표시 확인
2. **시나리오 2**: NOTICE 송출 중 → EMERGENCY 긴급 송출 → EMERGENCY 즉시 표시 확인
3. **시나리오 3**: EMERGENCY 해제 → 이전 NOTICE 복원 확인
4. **시나리오 4**: audit_logs에서 우선순위 변경 이력 확인

**우선순위 규칙 위반 시 납품 불가.**

### 2.4 실증 증빙 원칙

#### 증빙 요구사항
- **모든 행위는 audit_logs에 기록**
- **CSV Export 가능**
- **중간/최종 보고서에 바로 활용 가능해야 함**

#### audit_logs 필수 컬럼

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_role TEXT, -- ADMIN, OPERATOR, VIEWER
  action TEXT, -- CREATE, UPDATE, DELETE, SEND, EMERGENCY_SEND, EMERGENCY_RELEASE
  resource_type TEXT, -- template, schedule, display, display_state
  resource_id UUID,
  action_detail JSONB, -- before/after, 변경 내용
  ip_address INET,
  user_agent TEXT
);
```

#### 기록 대상 행위

| 행위 | action | resource_type | action_detail 예시 |
|------|--------|---------------|---------------------|
| 템플릿 생성 | CREATE | template | `{"name": "방역 안내"}` |
| 템플릿 수정 | UPDATE | template | `{"before": {...}, "after": {...}}` |
| 템플릿 삭제 | DELETE | template | `{"template_id": "uuid"}` |
| 즉시 송출 | SEND | display_state | `{"display_ids": ["uuid"], "content_type": "NOTICE"}` |
| 예약 송출 | SEND | schedule | `{"start_at": "2024-06-01 09:00", "end_at": "..."}` |
| 긴급 송출 | EMERGENCY_SEND | display_state | `{"display_ids": ["all"], "message": "..."}` |
| 긴급 해제 | EMERGENCY_RELEASE | display_state | `{"previous_state": {...}}` |
| 측정소 변경 | UPDATE | display_config | `{"air_station_id": "uuid"}` |

#### CSV Export 요구사항

**버튼 위치**: Audit Logs 페이지 우측 상단  
**파일명**: `audit_logs_{시작일}_{종료일}.csv`  
**인코딩**: UTF-8 BOM (Excel 호환)  
**컬럼 순서**:
```
created_at, user_email, user_role, action, resource_type, action_detail
```

#### 납품 판정 시연
1. Audit Logs 페이지 진입
2. 날짜 범위 선택 (예: 2024-06-01 ~ 2024-06-30)
3. "CSV 내보내기" 버튼 클릭
4. 다운로드된 파일을 Excel로 열기
5. 한글 깨짐 없이 표시 확인
6. 중간평가 보고서에 첨부 가능 확인

**CSV Export 실패 시 납품 불가.**

---

## 3. 송출 시스템 전체 요구사항

### 3.1 송출 타입 (Content Type)

#### WEATHER (자동 수집 데이터)

**데이터 소스**
- 기상청 단기예보 API
- AirKorea 실시간 측정정보 조회 API

**수집 주기**: 10분  
**표시 항목**:
- 기온 (°C)
- 강수확률 (%)
- 하늘 상태 (맑음/구름/흐림)
- 미세먼지 (PM10)
- 초미세먼지 (PM2.5)
- 통합대기환경지수

**우선순위**: 100 (가장 낮음)

#### NOTICE (운영자 공지)

**생성 방법**: 템플릿 기반  
**필수 필드**:
- 제목 (title)
- 본문 (body)
- 강조 문구 (highlight, 선택)
- 색상 (color)
- 배경 (background)

**송출 방식**:
- 즉시 송출
- 예약 송출 (start_at/end_at)
- 반복 송출

**우선순위**: 200

#### EMERGENCY (긴급 메시지)

**생성 방법**: 간소화된 템플릿 (제목+본문만)  
**색상**: 빨강 (고정)  
**송출 대상**: 전체 전광판 (개별 선택 불가)  
**송출 방식**: 즉시 송출만 가능  
**해제**: EMERGENCY 권한자만 가능

**우선순위**: 300 (최고)

### 3.2 송출 방식

#### 즉시 송출 (Apply Now)

**동작**:
1. "지금 송출" 버튼 클릭
2. 선택한 전광판에 즉시 반영
3. display_state 테이블 업데이트
4. audit_logs 기록

**제한사항**: 없음

#### 예약 송출 (Scheduled)

**설정 항목**:
- **start_at**: 송출 시작 시각 (필수)
- **end_at**: 송출 종료 시각 (필수)
- **timezone**: Asia/Seoul (고정)

**동작**:
1. schedules 테이블에 저장
2. start_at 도달 시 자동으로 display_state 업데이트
3. end_at 도달 시 자동으로 제거

**UI**: 캘린더 또는 타임라인 뷰 제공

#### 반복 송출 (Recurring)

**규칙**:
- 매일 (DAILY): 매일 동일 시간
- 매주 (WEEKLY): 특정 요일 선택 (월~일)
- 매월 (MONTHLY): 특정 날짜 선택 (1~31)

**저장 형식**: RRULE 유사 포맷 또는 JSON
```json
{
  "frequency": "WEEKLY",
  "byday": ["MO", "WE", "FR"],
  "start_time": "09:00",
  "end_time": "12:00"
}
```

**처리**: Supabase Edge Function에서 cron 형태로 실행

### 3.3 송출 대상

#### 전체 전광판 (All Displays)

**사용 사례**: EMERGENCY 긴급 메시지  
**동작**: displays 테이블의 모든 활성 전광판에 송출

#### 그룹 (Display Groups)

**사용 사례**: 지역별 공지 (예: 동별, 공원별)  
**구현**: displays.group_name 컬럼 활용

#### 개별 전광판 (Single Display)

**사용 사례**: 특정 전광판 테스트, 지역 특화 메시지  
**선택 방법**: 드롭다운 또는 체크박스

---

## 4. 납품 판정 체크리스트

최종 납품 시 다음 **모든 항목**을 시연해야 합니다.

### 4.1 기능 시연 체크리스트

- [ ] **운영자 계정으로 로그인**
- [ ] **템플릿 생성** (3분 이내)
- [ ] **Preview Studio에서 미리보기** (픽셀 정확도 확인)
- [ ] **프레임 표시 토글** (10px ON/OFF)
- [ ] **안전영역 가이드 확인**
- [ ] **즉시 송출** (5초 내 전광판 반영)
- [ ] **예약 송출 설정** (캘린더 UI)
- [ ] **반복 송출 설정** (매주 월요일 예시)
- [ ] **긴급 송출** (모든 전광판 즉시 반영)
- [ ] **긴급 해제** (이전 상태 복원)
- [ ] **전광판별 공기질 측정소 선택**
- [ ] **Dashboard에서 마지막 갱신 시각 확인**
- [ ] **Audit Logs에서 전체 이력 확인**
- [ ] **CSV Export** (Excel 호환 확인)
- [ ] **송출 우선순위 검증** (EMERGENCY > NOTICE > WEATHER)

### 4.2 증빙 자료 체크리스트

- [ ] **audit_logs CSV 파일** (실증 기간 전체)
- [ ] **송출 이력 스크린샷**
- [ ] **긴급 송출/해제 로그**
- [ ] **데이터 수집 성공률 통계** (95% 이상)
- [ ] **운영자 교육 이수 확인서**

### 4.3 기술 검증 체크리스트

- [ ] **Supabase RLS 정책 활성화 확인**
- [ ] **Edge Function 정상 동작 확인**
- [ ] **API 실패 시 Fallback 동작 확인**
- [ ] **다중 브라우저 호환성** (Chrome, Safari, Edge)
- [ ] **반응형 UI** (1920x1080, 1366x768)

---

## 5. 비기능 요구사항

### 5.1 성능 요구사항

| 항목 | 기준 | 측정 방법 |
|------|------|-----------|
| 페이지 로딩 시간 | 3초 이내 | Lighthouse |
| API 응답 시간 | 500ms 이내 | Supabase Dashboard |
| 미리보기 렌더링 | 100ms 이내 | Chrome DevTools |
| 긴급 송출 반영 | 5초 이내 | 수동 측정 |

### 5.2 보안 요구사항

| 항목 | 요구사항 |
|------|----------|
| 인증 | Supabase Auth (Email/Password) |
| 권한 | RBAC + RLS 동시 적용 |
| HTTPS | 필수 (Vercel 자동 적용) |
| API 키 보호 | 환경 변수 사용, 클라이언트 노출 금지 |
| SQL Injection | Supabase Prepared Statements |

### 5.3 가용성 요구사항

| 항목 | 기준 |
|------|------|
| 시스템 가용성 | 99.5% 이상 (월간 기준) |
| 데이터 백업 | Supabase 자동 백업 (일 1회) |
| 복구 시간 | 1시간 이내 (RTO) |
| 복구 시점 | 최대 1일 (RPO) |

### 5.4 사용성 요구사항

| 항목 | 기준 |
|------|------|
| 학습 시간 | 30분 이내 (운영자 기준) |
| 오류 메시지 | 한글, 해결 방법 포함 |
| 도움말 | 주요 화면마다 툴팁 제공 |
| 키보드 단축키 | 선택 사항 (Tab, Enter) |

---

## 6. 제약사항 (Constraints)

### 6.1 기술 제약사항

- **프론트엔드**: Figma Make (React + Tailwind CSS)만 사용
- **백엔드**: Supabase만 사용 (별도 서버 금지)
- **데이터베이스**: PostgreSQL (Supabase 제공)
- **API**: 공공데이터포털 API만 사용
- **배포**: Vercel 또는 Netlify (권장)

### 6.2 데이터 제약사항

- **개인정보**: 수집 금지 (운영자 이메일만 허용)
- **데이터 보관 기간**: 실증 종료 후 1년
- **로그 용량**: audit_logs 월 1만 건 이하 예상
- **이미지/동영상**: 현재 버전에서 제외 (텍스트만)

### 6.3 운영 제약사항

- **운영 시간**: 24/7 (무인 운영)
- **관리자 수**: 3명 이하
- **전광판 수**: 10개 이하 (파일럿)
- **동시 접속자**: 10명 이하

---

## 7. 문서 히스토리

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0.0 | 2024-12-16 | 프로젝트팀 | 초안 작성 (완성형) |

---

**이전 문서**: [01_overview.md](./01_overview.md)  
**다음 문서**: [03_api_integration.md](./03_api_integration.md)
