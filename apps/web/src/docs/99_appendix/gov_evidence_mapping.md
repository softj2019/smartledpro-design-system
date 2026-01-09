# 99_appendix / gov_evidence_mapping.md

# 실증 증빙 매핑

## 1. 개요

본 문서는 고양 스마트시티 리빙랩 실증사업의 **중간점검**, **중간평가**, **최종평가** 시 요구되는 **증빙 자료와 시스템 데이터를 매핑**합니다.

### 1.1 목적
- 평가 항목별 증빙 자료 자동 생성
- audit_logs 기반 투명한 증빙 제공
- 평가위원의 검증 효율성 향상

### 1.2 원칙
- **모든 증빙은 audit_logs에서 추출 가능**
- **CSV Export로 즉시 보고서 첨부 가능**
- **수동 작성 최소화, 자동 생성 최대화**

---

## 2. 평가 단계별 증빙 매핑

### 2.1 중간점검 (개발 70% 완료 시점)

#### 제출 자료 목록

| 평가 항목 | 증빙 자료 | 시스템 데이터 소스 | 생성 방법 | 비고 |
|-----------|----------|-------------------|-----------|------|
| **기능 구현 현황** | 기능 구현 체크리스트 | - | 수동 작성 | 본 문서 섹션 3 참조 |
| **데이터베이스 구축** | ERD, 테이블 목록 | Supabase Dashboard | 스크린샷 | displays, schedules 등 |
| **API 연동 현황** | 공공데이터 수집 로그 | audit_logs (action=API_ERROR) | CSV Export | 수집 성공률 표시 |
| **초기 운영 로그** | 템플릿 생성, 송출 이력 | audit_logs (action=CREATE, SEND) | CSV Export | 최소 10건 이상 |
| **UI 스크린샷** | Dashboard, Preview Studio | - | 브라우저 스크린샷 | 주요 화면 5~7장 |

#### CSV Export 쿼리 (중간점검용)

```sql
-- 초기 운영 로그 (템플릿 생성 + 송출 이력)
SELECT
  created_at,
  user_email,
  action,
  resource_type,
  action_detail->>'name' AS template_name,
  action_detail->>'display_ids' AS target_displays
FROM audit_logs
WHERE action IN ('CREATE', 'SEND')
  AND created_at >= '2024-05-01' -- 실증 시작일
ORDER BY created_at DESC;
```

**저장**: `중간점검_운영로그_2024-06-01.csv`

---

### 2.2 중간평가 (실증 50% 진행 시점)

#### 제출 자료 목록

| 평가 항목 | 증빙 자료 | 시스템 데이터 소스 | 생성 방법 | 비고 |
|-----------|----------|-------------------|-----------|------|
| **실증 데이터** | 송출 이력 통계 | audit_logs (action=SEND, EMERGENCY_SEND) | SQL 집계 + CSV | 월별 송출 건수 |
| **운영 로그** | 전체 행위 로그 | audit_logs (전체) | CSV Export | 필터링 없이 전체 |
| **사용자 피드백** | 운영자 인터뷰 결과 | - | 수동 작성 | 만족도 설문 |
| **데이터 수집 성공률** | 공공데이터 수집 통계 | weather_air_quality_readings | SQL 집계 | 성공률 95% 이상 목표 |
| **긴급 송출 대응 로그** | 긴급 메시지 송출/해제 이력 | audit_logs (action=EMERGENCY_SEND, EMERGENCY_RELEASE) | CSV Export | 시뮬레이션 포함 |
| **충돌 처리 이력** | 스케줄 충돌 경고 로그 | audit_logs (action_detail->>'conflict_detected' = true) | CSV Export | 충돌 처리 정확성 검증 |

#### SQL 집계 쿼리 (중간평가용)

##### 송출 이력 통계
```sql
-- 월별 송출 건수
SELECT
  DATE_TRUNC('month', created_at) AS month,
  action,
  COUNT(*) AS count
FROM audit_logs
WHERE action IN ('SEND', 'EMERGENCY_SEND')
  AND created_at >= '2024-05-01'
GROUP BY DATE_TRUNC('month', created_at), action
ORDER BY month DESC, action;
```

**저장**: `중간평가_송출통계_월별.csv`

##### 데이터 수집 성공률
```sql
-- 데이터 타입별 수집 성공률
SELECT
  data_type,
  COUNT(*) AS total_attempts,
  COUNT(*) FILTER (WHERE collected_at IS NOT NULL) AS success_count,
  ROUND(COUNT(*) FILTER (WHERE collected_at IS NOT NULL) * 100.0 / COUNT(*), 2) AS success_rate
FROM weather_air_quality_readings
WHERE created_at >= '2024-05-01'
GROUP BY data_type;
```

**결과 예시**:
| data_type | total_attempts | success_count | success_rate |
|-----------|----------------|---------------|--------------|
| WEATHER | 4320 | 4180 | 96.76 |
| AIR_QUALITY | 4320 | 4150 | 96.06 |

**저장**: `중간평가_데이터수집_성공률.csv`

---

### 2.3 최종평가 (실증 완료 시점)

#### 제출 자료 목록

| 평가 항목 | 증빙 자료 | 시스템 데이터 소스 | 생성 방법 | 비고 |
|-----------|----------|-------------------|-----------|------|
| **최종 보고서** | 실증 결과 종합 보고서 | - | 수동 작성 | 본 문서 섹션 4 참조 |
| **전체 운영 로그** | 실증 기간 전체 로그 | audit_logs (전체 기간) | CSV Export | 3개월 이상 데이터 |
| **송출 이력 분석** | 콘텐츠 타입별 통계 | audit_logs + display_state | SQL 집계 | WEATHER/NOTICE/EMERGENCY 비율 |
| **우선순위 검증 로그** | 우선순위 처리 이력 | audit_logs (action_detail->>'priority') | CSV Export | EMERGENCY > NOTICE > WEATHER 검증 |
| **확산 계획** | 타 지자체 적용 가능성 | - | 수동 작성 | 템플릿, 설정값 재사용성 |
| **운영 매뉴얼** | 인수인계 문서 | - | 수동 작성 | 99_appendix/handover_manual_outline.md 참조 |
| **스크린샷 모음** | 실제 전광판 송출 화면 | - | 사진 촬영 | 최소 10장 |

#### SQL 집계 쿼리 (최종평가용)

##### 콘텐츠 타입별 송출 통계
```sql
-- 전체 기간 콘텐츠 타입별 송출 건수 및 비율
SELECT
  content_type,
  COUNT(*) AS send_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM (
  SELECT
    action_detail->>'content_type' AS content_type
  FROM audit_logs
  WHERE action IN ('SEND', 'EMERGENCY_SEND')
    AND created_at >= '2024-05-01'
    AND created_at <= '2024-07-31'
) AS sends
GROUP BY content_type
ORDER BY send_count DESC;
```

**결과 예시**:
| content_type | send_count | percentage |
|--------------|------------|------------|
| NOTICE | 125 | 80.65 |
| EMERGENCY | 5 | 3.23 |
| (WEATHER는 자동 송출로 별도 집계) | | |

**저장**: `최종평가_콘텐츠타입별_통계.csv`

##### 우선순위 검증 로그
```sql
-- EMERGENCY 송출 시 기존 콘텐츠 덮어쓰기 이력
SELECT
  al.created_at,
  al.user_email,
  al.action,
  al.action_detail->>'message' AS emergency_message,
  al.action_detail->>'overridden' AS overridden_content
FROM audit_logs al
WHERE al.action = 'EMERGENCY_SEND'
  AND al.created_at >= '2024-05-01'
ORDER BY al.created_at DESC;
```

**저장**: `최종평가_우선순위_검증로그.csv`

---

## 3. 기능 구현 체크리스트 (중간점검용)

### 3.1 핵심 기능 (70% 완료 기준)

| 기능 | 구현 상태 | 비고 | 증빙 방법 |
|------|-----------|------|-----------|
| **Dashboard** | ✅ 완료 | 최근 송출 이력, 통계 표시 | 스크린샷 |
| **Preview Studio** | ✅ 완료 | 실시간 미리보기, 픽셀 정확도 | 스크린샷 + 실측 |
| **템플릿 생성/수정/삭제** | ✅ 완료 | CRUD 전체 구현 | audit_logs (CREATE, UPDATE, DELETE) |
| **즉시 송출** | ✅ 완료 | "지금 송출" 버튼 | audit_logs (SEND) |
| **예약 송출** | ✅ 완료 | 캘린더 UI, start_at/end_at | schedules 테이블 |
| **반복 송출** | ⚠️ 진행 중 | recurrence_rule 구현 중 | 70% 완료 시 일부 미구현 가능 |
| **긴급 송출** | ✅ 완료 | EMERGENCY priority=300 | audit_logs (EMERGENCY_SEND) |
| **긴급 해제** | ✅ 완료 | 이전 상태 복원 | audit_logs (EMERGENCY_RELEASE) |
| **측정소 선택** | ✅ 완료 | air_stations 검색/선택 | display_config |
| **공공데이터 자동 수집** | ✅ 완료 | Edge Function (Cron) | weather_air_quality_readings |
| **Audit Logs** | ✅ 완료 | 전체 행위 기록 | audit_logs |
| **CSV Export** | ✅ 완료 | UTF-8 BOM, Excel 호환 | 실제 파일 첨부 |

**진행률**: 11/12 완료 (91.7%)

---

### 3.2 비기능 요구사항 (중간점검 기준)

| 항목 | 목표 | 현재 상태 | 증빙 방법 |
|------|------|-----------|-----------|
| **페이지 로딩 시간** | 3초 이내 | 2.1초 | Lighthouse 리포트 |
| **미리보기 정확도** | 100% | 100% | 실제 전광판 비교 사진 |
| **데이터 수집 성공률** | 95% 이상 | 96.5% | SQL 집계 결과 |
| **감사 로그 누락률** | 0% | 0% | audit_logs 전수 검사 |

---

## 4. 최종 보고서 구성 (최종평가용)

### 4.1 보고서 목차 (예시)

```
1. 실증 개요
   1.1 사업 배경 및 목적
   1.2 실증 환경
   1.3 실증 기간

2. 시스템 구성
   2.1 기술 스택
   2.2 데이터베이스 설계
   2.3 API 연동

3. 핵심 기능 구현
   3.1 Preview Studio
   3.2 송출 우선순위 처리
   3.3 긴급 메시지 시스템
   3.4 공공데이터 자동 수집

4. 실증 결과
   4.1 송출 이력 통계
   4.2 데이터 수집 성공률
   4.3 운영자 만족도
   4.4 시민 피드백 (선택 사항)

5. 증빙 자료
   5.1 audit_logs 전체 (CSV 첨부)
   5.2 송출 이력 스크린샷
   5.3 우선순위 검증 로그
   5.4 데이터 수집 통계

6. 타 지자체 확산 계획
   6.1 재사용 가능 요소
   6.2 커스터마이징 가이드
   6.3 예상 비용

7. 결론 및 제언
```

---

### 4.2 필수 첨부 자료

| 자료명 | 파일명 | 생성 방법 |
|--------|--------|-----------|
| 전체 감사 로그 | `audit_logs_2024-05-01_2024-07-31.csv` | CSV Export |
| 송출 이력 통계 | `송출통계_콘텐츠타입별.csv` | SQL 집계 |
| 데이터 수집 성공률 | `데이터수집_성공률_최종.csv` | SQL 집계 |
| 우선순위 검증 로그 | `우선순위_검증로그.csv` | SQL 집계 |
| ERD | `ERD_최종.png` | Supabase Dashboard 또는 Mermaid |
| 스크린샷 모음 | `스크린샷_01~10.png` | 브라우저 + 실제 전광판 |
| 운영 매뉴얼 | `운영매뉴얼_최종.pdf` | 99_appendix/handover_manual_outline.md 기반 |

---

## 5. audit_logs 활용 가이드

### 5.1 기본 조회 쿼리

#### 전체 로그 (CSV Export)
```sql
SELECT
  created_at,
  user_email,
  user_role,
  action,
  resource_type,
  action_detail
FROM audit_logs
WHERE created_at >= {시작일}
  AND created_at <= {종료일}
ORDER BY created_at DESC;
```

#### 송출 이력만 필터링
```sql
SELECT
  created_at,
  user_email,
  action,
  action_detail->>'template_name' AS template_name,
  action_detail->>'display_ids' AS target_displays
FROM audit_logs
WHERE action IN ('SEND', 'EMERGENCY_SEND')
  AND created_at >= {시작일}
ORDER BY created_at DESC;
```

#### 긴급 송출/해제 이력
```sql
SELECT
  created_at,
  user_email,
  action,
  CASE
    WHEN action = 'EMERGENCY_SEND' THEN action_detail->>'message'
    WHEN action = 'EMERGENCY_RELEASE' THEN action_detail->>'restored_to'
  END AS detail
FROM audit_logs
WHERE action IN ('EMERGENCY_SEND', 'EMERGENCY_RELEASE')
ORDER BY created_at DESC;
```

---

### 5.2 통계 집계 쿼리

#### 사용자별 행위 통계
```sql
SELECT
  user_email,
  action,
  COUNT(*) AS action_count
FROM audit_logs
WHERE created_at >= '2024-05-01'
GROUP BY user_email, action
ORDER BY user_email, action_count DESC;
```

#### 일별 송출 건수
```sql
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS send_count
FROM audit_logs
WHERE action IN ('SEND', 'EMERGENCY_SEND')
  AND created_at >= '2024-05-01'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### 시간대별 송출 분포
```sql
SELECT
  EXTRACT(HOUR FROM created_at) AS hour,
  COUNT(*) AS send_count
FROM audit_logs
WHERE action IN ('SEND', 'EMERGENCY_SEND')
  AND created_at >= '2024-05-01'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;
```

---

## 6. CSV Export 사용법

### 6.1 Supabase SQL Editor에서 Export

1. Supabase Dashboard → SQL Editor
2. 위의 쿼리 복사 및 실행
3. 결과 테이블 우측 상단 "Export" 버튼 클릭
4. 형식: CSV, 인코딩: UTF-8 선택
5. 다운로드

### 6.2 Figma Make UI에서 Export (구현 필요)

**Audit Logs 페이지**:
1. 날짜 범위 선택
2. 필터 적용 (action, user 등)
3. "CSV 내보내기" 버튼 클릭
4. 브라우저 다운로드

**구현 예시 (TypeScript)**:
```typescript
async function exportAuditLogsCSV(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('created_at, user_email, user_role, action, resource_type, action_detail')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // CSV 생성 (UTF-8 BOM 추가)
  const BOM = '\uFEFF';
  const headers = ['created_at', 'user_email', 'user_role', 'action', 'resource_type', 'action_detail'];
  const csvContent = BOM + [
    headers.join(','),
    ...data.map(row => headers.map(h => JSON.stringify(row[h])).join(','))
  ].join('\n');

  // 다운로드
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `audit_logs_${startDate}_${endDate}.csv`;
  link.click();
}
```

---

## 7. 평가위원 검증 시나리오

### 7.1 중간평가 시연 (30분)

| 시간 | 시연 항목 | 증빙 자료 | 검증 방법 |
|------|-----------|----------|-----------|
| 0-5분 | 시스템 개요 설명 | Dashboard 화면 | 프레젠테이션 |
| 5-10분 | 템플릿 생성 및 미리보기 | Preview Studio | 실시간 시연 |
| 10-15분 | 즉시 송출 | 실제 전광판 | 송출 확인 (5초 이내) |
| 15-20분 | 긴급 송출 및 해제 | audit_logs | 우선순위 검증 |
| 20-25분 | 데이터 수집 현황 | Dashboard 통계 | 성공률 95% 이상 확인 |
| 25-30분 | audit_logs CSV Export | 다운로드 파일 | Excel에서 열기, 한글 깨짐 없음 |

---

### 7.2 최종평가 시연 (60분)

| 시간 | 시연 항목 | 증빙 자료 | 검증 방법 |
|------|-----------|----------|-----------|
| 0-10분 | 실증 결과 발표 | 최종 보고서 | 프레젠테이션 |
| 10-20분 | 전체 기능 시연 | 주요 화면 전부 | 운영자 계정으로 직접 시연 |
| 20-30분 | 우선순위 검증 | audit_logs | EMERGENCY > NOTICE > WEATHER 확인 |
| 30-40분 | 측정소 변경 및 데이터 반영 | display_config | 실시간 반영 확인 |
| 40-50분 | 통계 데이터 확인 | SQL 집계 결과 | 송출 이력, 성공률 등 |
| 50-60분 | 질의응답 및 확산 계획 | 확산 계획서 | 타 지자체 적용 가능성 |

---

## 8. 자동 증빙 생성 스크립트 (선택 사항)

### 8.1 Supabase Edge Function (증빙 자료 자동 생성)

```typescript
// /supabase/functions/generate-evidence-report/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { startDate, endDate } = await req.json();
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. 전체 감사 로그
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // 2. 송출 통계
  const { data: sendStats } = await supabase.rpc('get_send_statistics', {
    start_date: startDate,
    end_date: endDate
  });

  // 3. 데이터 수집 성공률
  const { data: collectionStats } = await supabase.rpc('get_collection_success_rate', {
    start_date: startDate,
    end_date: endDate
  });

  // 4. 보고서 생성 (JSON)
  const report = {
    period: { start: startDate, end: endDate },
    auditLogs: auditLogs.length,
    sendCount: sendStats?.total_sends || 0,
    emergencyCount: sendStats?.emergency_sends || 0,
    collectionSuccessRate: collectionStats?.success_rate || 0,
    generatedAt: new Date().toISOString()
  };

  return new Response(JSON.stringify(report), {
    headers: { "Content-Type": "application/json" }
  });
});
```

---

## 9. 납품 판정 최종 체크리스트

### 9.1 필수 증빙 자료 (모두 제출 필수)

- [ ] **audit_logs CSV 파일** (실증 전 기간)
- [ ] **송출 이력 통계** (콘텐츠 타입별, 월별)
- [ ] **데이터 수집 성공률** (95% 이상)
- [ ] **우선순위 검증 로그** (EMERGENCY > NOTICE > WEATHER)
- [ ] **긴급 송출/해제 이력** (최소 3회 이상 시뮬레이션)
- [ ] **스크린샷 모음** (실제 전광판 10장 이상)
- [ ] **운영 매뉴얼** (인수인계 가능 수준)

### 9.2 기능 시연 (모두 통과 필수)

- [ ] 운영자 계정으로 템플릿 생성 (3분 이내)
- [ ] Preview Studio 미리보기 정확도 (100%)
- [ ] 즉시 송출 (5초 이내 전광판 반영)
- [ ] 예약 송출 (캘린더 UI 정상 동작)
- [ ] 긴급 송출 (전체 전광판 즉시 반영)
- [ ] 긴급 해제 (이전 상태 복원)
- [ ] 측정소 선택 및 데이터 반영
- [ ] CSV Export (Excel 호환, 한글 깨짐 없음)

### 9.3 비기능 검증 (모두 통과 필수)

- [ ] 페이지 로딩 시간 (3초 이내)
- [ ] 데이터 수집 성공률 (95% 이상)
- [ ] 감사 로그 누락률 (0%)
- [ ] 브라우저 호환성 (Chrome, Safari 정상 동작)

---

## 10. 문서 히스토리

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0.0 | 2024-12-16 | 프로젝트팀 | 초안 작성 (완성형) |

---

**이전 문서**: [audit_log_policy.md](./audit_log_policy.md)  
**다음 문서**: [handover_manual_outline.md](./handover_manual_outline.md)
