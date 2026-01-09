# 중산 경기 자동 크롤링 및 송출 시스템

## 📋 시스템 개요

고양시 인조잔디구장 '중산' 경기 데이터를 자동으로 크롤링하여 전광판에 송출하는 완전 자동화 시스템입니다.

---

## 🔄 전체 프로세스

```
매일 06:00 자동 크롤링
    ↓
today_matches 테이블 저장
    ↓
1분마다 활성 경기 확인
    ↓
경기 시작 10분 전: 템플릿 + 스케줄 자동 생성
    ↓
전광판 30초씩 자동 송출 (다른 템플릿과 섞임)
    ↓
경기 종료: 템플릿 + 스케줄 자동 삭제
    ↓
모든 기록 Audit Logs 저장
```

---

## ⏰ 자동 크롤링 (매일 06:00)

### 실행 조건
- **실행 시간**: 매일 아침 06:00:00 ~ 06:01:00 (설정 변경 가능)
- **실행 주기**: 1분마다 시간 체크
- **중복 방지**: 하루에 한 번만 실행
- **권한**: SYSTEM (자동)

### 시간 설정 변경
1. **ADMIN 계정으로 로그인**
2. **Dashboard → "시스템 설정" 메뉴**
3. **"자동 크롤링 시간 설정" 패널**
4. **시/분 입력 후 저장**
5. **페이지 새로고침**

### 테스트 방법
- 현재 시간보다 1~2분 후로 설정
- 저장 후 새로고침
- 디버그 로그에서 실행 확인
- Audit Logs에서 결과 확인

### 실행 로직
1. 시간 확인: 현재 시각이 설정된 시간인지 체크
2. 날짜 확인: 오늘 이미 실행했는지 체크
3. 크롤링 실행: `/crawl/joongsan-today` API 호출
4. 결과 저장: `today_matches` 테이블에 UPSERT
5. Audit Log 기록: 성공/실패 여부와 상세 정보 저장

### Audit Log 이벤트
- `CRAWL_SUCCESS`: 크롤링 성공 (수동 또는 자동)
- `CRAWL_FAILED`: 크롤링 실패
- `CRAWL_ERROR`: 예외 발생
- `AUTO_CRAWL_SUCCESS`: 자동 크롤링 성공 (프론트엔드 기록용)
- `AUTO_CRAWL_FAILED`: 자동 크롤링 실패 (프론트엔드 기록용)
- `AUTO_CRAWL_ERROR`: 자동 크롤링 예외 (프론트엔드 기록용)

### 로그 상세 정보
```json
{
  "event_type": "AUTO_CRAWL_SUCCESS",
  "user_id": "SYSTEM",
  "user_email": "system@auto",
  "user_role": "SYSTEM",
  "action": "CREATE",
  "resource_type": "CRAWL_DATA",
  "resource_id": "auto_crawl_2023-12-21",
  "action_detail": {
    "scheduled_time": "06:00",
    "executed_at": "2023-12-21T06:00:15Z",
    "total_parsed": 5,
    "upserted": 5,
    "failed": 0
  }
}
```

---

## 🎯 경기 일정 자동 송출

### 송출 조건
- **송출 시작**: 경기 시작 10분 전
- **송출 종료**: 경기 종료 시간
- **송출 간격**: 30초마다 표시
- **우선순위**: 175 (NOTICE보다 높고 EMERGENCY보다 낮음)

### 자동 템플릿 생성

#### 템플릿 ID 규칙
```
auto_match_{날짜}|{시간대}|{구장명}
예: auto_match_20231221|09:00~11:00|중산
```

#### 템플릿 내용
```html
<div style="font-size: 36px; font-weight: bold; margin-bottom: 12px; color: #ffcc00;">
  FC 고양
</div>
<div style="font-size: 28px; color: #ffffff;">
  오늘.9시 ~ 11시
</div>
```

#### 템플릿 스타일
- 배경색: `#1a365d` (진한 파란색)
- 텍스트 색상: `#ffffff` (흰색)
- 강조 색상: `#ffcc00` (노란색)
- 정렬: 중앙

### 자동 스케줄 생성

#### 스케줄 설정
- **스케줄 ID**: `auto_schedule_{match_key}`
- **시작 시간**: 경기 시작 - 10분
- **종료 시간**: 경기 종료
- **송출 시간**: 30초 (`display_duration_minutes: 0.5`)
- **우선순위**: 175
- **반복**: 없음 (일회성)

#### 예시
```
경기: FC 고양 / 09:00 ~ 11:00
스케줄 시작: 08:50
스케줄 종료: 11:00
송출 간격: 30초
```

---

## 🔍 템플릿 동기화 시스템

### 실행 주기
- **체크 간격**: 1분마다 실행
- **동작**: 활성 경기 확인 및 템플릿/스케줄 생성/삭제

### 동기화 로직

#### 1. 활성 경기 조회
```sql
SELECT * FROM today_matches
WHERE match_date = TODAY()
  AND NOW() >= (start_time - 10분)
  AND NOW() <= end_time
```

#### 2. 템플릿 생성
- 활성 경기마다 템플릿 + 스케줄 생성
- 기존 템플릿이 있으면 UPSERT (업데이트)

#### 3. 템플릿 삭제
- 더 이상 활성화되지 않은 경기의 템플릿/스케줄 삭제
- 경기 종료 후 자동 정리

### Audit Log 이벤트
- `MATCH_TEMPLATE_AUTO_CREATED`: 템플릿 자동 생성
- `MATCH_TEMPLATE_AUTO_DELETED`: 템플릿 자동 삭제
- `MATCH_AUTO_SCHEDULE_CREATED`: 스케줄 자동 생성
- `MATCH_AUTO_SCHEDULE_DELETED`: 스케줄 자동 삭제

---

## 📊 중복 데이터 처리

### 유니크 키 구성
```
match_key = "{날짜}|{시간대}|{구장명}"
예: "20231221|09:00~11:00|중산"
```

### UPSERT 동작
- **같은 match_key 존재**: 데이터 업데이트
- **새로운 match_key**: 새 레코드 생성
- **팀명 변경**: 자동으로 최신 정보로 갱신

### 업데이트 필드
- `club_name`: 팀명
- `club_url`: 팀 정보 URL
- `duration_text`: 이용 시간
- `fetched_at`: 마지막 크롤링 시간

---

## 🎬 전광판 송출 우선순위

```
EMERGENCY (200)
    ↓
경기 일정 (175)  ← 새로 추가됨
    ↓
NOTICE (150)
    ↓
WEATHER (100)
```

### 송출 규칙
1. EMERGENCY가 있으면 즉시 표시
2. EMERGENCY 없으면 경기 일정 우선 표시
3. 경기 일정 없으면 NOTICE 표시
4. 모두 없으면 WEATHER 표시
5. 같은 우선순위에서는 최신 스케줄 우선

---

## 🛠️ 수동 크롤링

### 실행 방법
1. ADMIN 계정으로 로그인
2. Dashboard → "중산 경기 크롤링" 클릭
3. "크롤링 시작" 버튼 클릭

### 사용 시나리오
- 긴급 일정 변경 확인
- 자동 크롤링 실패 시 수동 재시도
- 테스트 및 검증

---

## 📈 모니터링 및 로그

### Audit Logs 확인
1. **경로**: Audit Logs 페이지
2. **필터**: Event Type으로 검색
   - `AUTO_CRAWL_*`: 자동 크롤링 관련
   - `MATCH_*`: 경기 템플릿/스케줄 관련

### 주요 확인 사항
- ✅ 매일 06:00 자동 크롤링 실행 여부
- ✅ 크롤링 성공/실패 건수
- ✅ 템플릿 자동 생성/삭제 기록
- ✅ 스케줄 자동 생성/삭제 기록

### 디버그 로그
- 화면 우측 플로팅 버튼 클릭
- `AutoCrawler`, `MatchScheduleSync` 필터 사용

---

## 🔧 문제 해결

### 자동 크롤링이 실행되지 않음
1. 브라우저가 계속 열려있는지 확인
2. 로그인 상태 확인 (로그아웃 시 자동 중지)
3. 디버그 로그에서 `AutoCrawler` 확인

### 경기 일정이 표시되지 않음
1. 크롤링이 정상 실행되었는지 확인
2. `today_matches` 테이블에 데이터 존재 확인
3. 현재 시간이 경기 시작 10분 전 ~ 종료 범위인지 확인
4. 디버그 로그에서 `MatchScheduleSync` 확인

### 템플릿이 삭제되지 않음
1. 경기 종료 후 1분 이내 자동 삭제
2. Audit Logs에서 삭제 기록 확인
3. 수동으로 템플릿 목록 확인

---

## 📝 개발자 노트

### 핵심 파일
- `/lib/hooks/useAutoCrawler.ts`: 자동 크롤링 훅
- `/lib/hooks/useMatchScheduleSync.ts`: 경기 동기화 훅
- `/supabase/functions/server/joongsan_crawler.ts`: 크롤러 로직
- `/supabase/functions/server/index.tsx`: API 엔드포인트

### 주요 API
- `POST /crawl/joongsan-today`: 크롤링 실행
- `GET /matches/active-now`: 활성 경기 조회
- `POST /matches/sync-templates`: 템플릿 동기화
- `POST /audit-log`: Audit log 생성

### 데이터베이스 테이블
- `today_matches`: 크롤링된 경기 데이터
- `message_templates`: 템플릿 (KV Store)
- `schedules`: 스케줄
- `audit_logs`: 모든 작업 기록

---

## ✅ 체크리스트

### 시스템 가동 확인
- [ ] 브라우저가 24/7 실행 중
- [ ] 로그인 상태 유지
- [ ] 디버그 로그에서 `AutoCrawler` 초기화 확인
- [ ] 디버그 로그에서 `MatchScheduleSync` 초기화 확인

### 첫 실행 테스트
- [ ] 수동 크롤링 성공
- [ ] `today_matches` 테이블에 데이터 저장 확인
- [ ] Audit Logs에 크롤링 기록 확인
- [ ] 경기 시간에 전광판 표시 확인

### 정기 점검
- [ ] 매일 Audit Logs 확인
- [ ] 크롤링 실패 시 원인 파악
- [ ] 템플릿 정리 상태 확인

---

**시스템 버전**: 1.0  
**최종 업데이트**: 2023-12-21  
**문의**: 시스템 관리자