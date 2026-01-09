# 크롤링 Audit Log 확인 가이드

## 📊 Audit Logs에 기록되는 크롤링 이벤트

### 백엔드 이벤트 (서버에서 자동 기록)

#### 1. `CRAWL_SUCCESS`
- **발생 시점**: 크롤링이 성공적으로 완료되었을 때
- **user_id**: 실행한 사용자 또는 'SYSTEM'
- **action_detail**:
  ```json
  {
    "date": "2023-12-21",
    "total_parsed": 5,
    "upserted": 5,
    "failed": 0,
    "timestamp": "2023-12-21T14:30:00Z"
  }
  ```

#### 2. `CRAWL_FAILED`
- **발생 시점**: 크롤링이 실패했을 때
- **user_id**: 실행한 사용자 또는 'SYSTEM'
- **action_detail**:
  ```json
  {
    "error": "Failed to fetch HTML",
    "timestamp": "2023-12-21T14:30:00Z"
  }
  ```

#### 3. `CRAWL_ERROR`
- **발생 시점**: 예외가 발생했을 때
- **user_id**: 'SYSTEM'
- **action_detail**:
  ```json
  {
    "error": "Network timeout",
    "stack": "Error: timeout...",
    "timestamp": "2023-12-21T14:30:00Z"
  }
  ```

### 프론트엔드 이벤트 (자동 크롤러에서 기록)

#### 4. `AUTO_CRAWL_SUCCESS`
- **발생 시점**: 자동 크롤링이 성공했을 때
- **user_id**: 'SYSTEM'
- **user_email**: 'system@auto'
- **action_detail**:
  ```json
  {
    "scheduled_time": "06:00",
    "executed_at": "2023-12-21T06:00:15Z",
    "total_parsed": 5,
    "upserted": 5,
    "failed": 0
  }
  ```

#### 5. `AUTO_CRAWL_FAILED`
- **발생 시점**: 자동 크롤링이 실패했을 때
- **user_id**: 'SYSTEM'
- **user_email**: 'system@auto'
- **action_detail**:
  ```json
  {
    "scheduled_time": "06:00",
    "executed_at": "2023-12-21T06:00:15Z",
    "error": "API returned error"
  }
  ```

#### 6. `AUTO_CRAWL_ERROR`
- **발생 시점**: 자동 크롤링에서 예외가 발생했을 때
- **user_id**: 'SYSTEM'
- **user_email**: 'system@auto'
- **action_detail**:
  ```json
  {
    "scheduled_time": "06:00",
    "executed_at": "2023-12-21T06:00:15Z",
    "error": "Network error"
  }
  ```

---

## 🔍 Audit Logs 확인 방법

### 1. 웹 UI에서 확인

1. **Audit Logs 페이지 접속**
2. **Event Type 필터 사용**:
   - `CRAWL_SUCCESS` 입력 → 성공한 크롤링만 표시
   - `CRAWL_` 입력 → 모든 크롤링 이벤트 표시
   - `AUTO_CRAWL_` 입력 → 자동 크롤링만 표시

3. **상세 정보 확인**:
   - 각 로그 클릭 → JSON 상세 보기
   - `action_detail`에서 크롤링 결과 확인

### 2. 디버그 로그에서 실시간 확인

1. **디버그 로그 열기** (화면 우측 플로팅 버튼)
2. **필터 사용**:
   - `JoongsanCrawler`: 수동 크롤링 로그
   - `AutoCrawler`: 자동 크롤링 로그
3. **실시간 모니터링**: 크롤링 실행 시 즉시 로그 확인

---

## ✅ 테스트 시나리오

### 시나리오 1: 수동 크롤링 성공

**절차**:
1. 시스템 설정 → 중산 경기 크롤링
2. "크롤링 시작" 버튼 클릭
3. 성공 메시지 확인

**확인**:
1. Audit Logs → Event Type: `CRAWL_SUCCESS`
2. `action_detail` 확인:
   - `total_parsed`: 파싱된 경기 수
   - `upserted`: 저장된 경기 수
   - `failed`: 실패 수
3. `user_id`: 현재 사용자 ID
4. `user_email`: 현재 사용자 이메일

---

### 시나리오 2: 자동 크롤링 성공

**절차**:
1. 시스템 설정 → 자동 크롤링 시간 설정
2. 현재 시간 + 2분으로 설정
3. 저장 후 새로고침
4. 2분 대기

**확인**:
1. Audit Logs → Event Type: `AUTO_CRAWL_SUCCESS`
2. `user_id`: 'SYSTEM'
3. `user_email`: 'system@auto'
4. `action_detail` 확인:
   - `scheduled_time`: "06:00" (또는 설정한 시간)
   - `executed_at`: 실제 실행 시간
   - `total_parsed`, `upserted`, `failed`

---

### 시나리오 3: 크롤링 실패 (사이트 접근 불가)

**절차**:
1. 네트워크 차단 또는 사이트 다운 상태에서 크롤링 실행

**확인**:
1. Audit Logs → Event Type: `CRAWL_FAILED` 또는 `CRAWL_ERROR`
2. `action_detail` → `error` 필드 확인
3. 에러 메시지 분석:
   - `Failed to fetch HTML`: 네트워크 문제
   - `HTTP 500`: 서버 오류
   - `Timeout`: 타임아웃

---

## 📈 로그 분석

### 크롤링 성공률 확인

```
총 크롤링 시도: CRAWL_* 이벤트 수
성공: CRAWL_SUCCESS + AUTO_CRAWL_SUCCESS
실패: CRAWL_FAILED + AUTO_CRAWL_FAILED
에러: CRAWL_ERROR + AUTO_CRAWL_ERROR

성공률 = 성공 / 총 시도 * 100%
```

### 자동 크롤링 실행 이력

```
Event Type = AUTO_CRAWL_SUCCESS
정렬: created_at DESC
→ 최근 7일간 자동 크롤링 이력 확인
```

### 크롤링 데이터 품질

```
action_detail.upserted > 0: 데이터 수집 성공
action_detail.failed > 0: 일부 데이터 수집 실패
action_detail.total_parsed = 0: 데이터 없음
```

---

## 🚨 문제 해결

### Audit Log가 저장되지 않음

**원인 1: audit_logs 테이블이 없음**
- Supabase에서 테이블 존재 확인
- 필요 시 테이블 생성

**원인 2: 권한 문제**
- `SUPABASE_SERVICE_ROLE_KEY` 확인
- 서버에서 Supabase 클라이언트 초기화 확인

**원인 3: 네트워크 오류**
- 디버그 로그에서 에러 확인
- 서버 로그 확인

---

### 로그는 있지만 상세 정보가 없음

**확인**:
- `action_detail` 필드가 null인지 확인
- 백엔드 코드에서 `action_detail` 구성 확인

---

### 중복 로그가 생성됨

**원인**: 프론트엔드와 백엔드 모두에서 로그 생성

**정상 동작**:
- 백엔드: `CRAWL_SUCCESS` (실제 크롤링 결과)
- 프론트엔드: `AUTO_CRAWL_SUCCESS` (자동 실행 기록)

**이유**: 실증 증빙을 위해 이중 기록

---

## 📝 체크리스트

### 수동 크롤링 로그 확인

- [ ] Event Type: `CRAWL_SUCCESS`
- [ ] `user_id`: 현재 사용자
- [ ] `action_detail.total_parsed` > 0
- [ ] `action_detail.upserted` > 0
- [ ] `timestamp` 정확함

### 자동 크롤링 로그 확인

- [ ] Event Type: `AUTO_CRAWL_SUCCESS` (프론트엔드)
- [ ] Event Type: `CRAWL_SUCCESS` (백엔드)
- [ ] `user_id`: 'SYSTEM'
- [ ] `user_email`: 'system@auto'
- [ ] `scheduled_time`: 설정한 시간
- [ ] `executed_at`: 실제 실행 시간

### 실패 로그 확인

- [ ] Event Type: `*_FAILED` 또는 `*_ERROR`
- [ ] `action_detail.error`: 에러 메시지 존재
- [ ] 에러 원인 파악 가능
- [ ] 필요 시 재시도

---

**작성일**: 2023-12-21  
**버전**: 1.0  
**관련 문서**: JOONGSAN_AUTO_SYSTEM.md
