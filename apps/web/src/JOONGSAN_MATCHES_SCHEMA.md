# 중산 경기 데이터 스키마

## 테이블: `today_matches`

고양시 인조잔디구장 '중산' 탭의 경기 데이터를 저장하는 테이블입니다.

### 컬럼 구조

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `match_key` | `text` (PK) | 경기 고유 키 | `20251221\|07시 ~ 10시\|중산` |
| `match_date` | `date` | 경기 날짜 (날짜만) | `2025-12-21` |
| `stadium` | `text` | 구장 이름 | `중산` |
| `time_range` | `text` | 시간대 (표시용) | `07시 ~ 10시` |
| `start_time` | `timestamptz` | 시작 시간 (datetime) | `2025-12-21T07:00:00+09:00` |
| `end_time` | `timestamptz` | 종료 시간 (datetime) | `2025-12-21T10:00:00+09:00` |
| `duration_text` | `text` | 경기 시간 (텍스트) | `3시간` |
| `club_name` | `text` | 클럽 이름 | `한강fc` |
| `club_url` | `text` | 클럽 URL | `https://e-soccer.gys.or.kr/community/community.html?clubId=hangang` |
| `source_url` | `text` | 크롤링 출처 | `https://e-soccer.gys.or.kr/` |
| `fetched_at` | `timestamptz` | 크롤링 시각 | `2025-12-21T12:06:33.232+00` |

### 인덱스

- **Primary Key**: `match_key`
- **Index**: `match_date` (날짜별 검색 최적화)
- **Index**: `start_time`, `end_time` (시간대별 검색 최적화)

---

## 크롤러 동작 방식

### 1️⃣ **HTML 파싱**
- 대상: `https://e-soccer.gys.or.kr/` (EUC-KR 인코딩)
- 선택자: `ul#ulMainGame3` (중산 탭)
- 파싱 항목:
  - `span.title` → `club_name`, `club_url`
  - `span.date` → `time_range`, `duration_text`

### 2️⃣ **시간 변환**
- **입력**: `"07시 ~ 10시"` (크롤링 데이터)
- **처리**:
  ```typescript
  // "07시" → "07:00"
  const convertToHHMM = (timeStr: string): string => {
    if (timeStr.includes('시')) {
      const hour = timeStr.replace('시', '').trim();
      return `${hour.padStart(2, '0')}:00`;
    }
    return timeStr;
  };
  
  startTime = `${todayDate}T${convertToHHMM("07시")}:00+09:00`;
  // → "2025-12-21T07:00:00+09:00"
  ```

### 3️⃣ **Upsert 전략**
- **충돌 키**: `match_key`
- **로직**: 동일한 `match_key`가 있으면 업데이트, 없으면 생성

---

## 자동 템플릿/스케줄 생성

### `/matches/sync-templates` 엔드포인트

**동작:**
1. `today_matches` 테이블에서 **오늘 날짜** 경기 조회
2. 각 경기에 대해:
   - **템플릿 생성** (KV Store): `template:auto_match_${match_key}`
   - **스케줄 생성** (Supabase): `auto_schedule_${match_key}`
3. 오래된 자동 생성 템플릿 삭제

**템플릿 내용:**
```typescript
{
  id: `auto_match_${match.match_key}`,
  name: `[자동] ${clubName} - 중산`,
  title: `🏟️ 중산 구장`,
  body: `
    <div style="font-size: 36px; font-weight: bold; margin-bottom: 12px; color: #ffcc00;">
      ${clubName}
    </div>
    <div style="font-size: 28px; color: #ffffff;">
      오늘.7시 ~ 10시
    </div>
  `,
  category: 'notice',
  is_active: true,
  created_by: 'SYSTEM',
  auto_generated: true,
  source_match_key: match.match_key,
}
```

**스케줄 설정:**
- **시작 시간**: `match.start_time - 10분`
- **종료 시간**: `match.end_time`
- **송출 시간**: 30초 (`display_duration_minutes: 0.5`)
- **우선순위**: 175 (NOTICE보다 높고 EMERGENCY보다 낮음)

---

## 사용 예시

### 1️⃣ **수동 크롤링 실행**

**엔드포인트:**
```
POST https://lcgaxwmqolcuorodrecd.supabase.co/functions/v1/make-server-5231839f/crawl/joongsan-today
Authorization: Bearer YOUR_ANON_KEY
```

**결과:**
```json
{
  "success": true,
  "message": "Crawling completed successfully",
  "data": {
    "date": "2025-12-21",
    "totalParsed": 4,
    "upserted": 4,
    "failed": 0,
    "matches": [...]
  }
}
```

### 2️⃣ **템플릿/스케줄 동기화**

**엔드포인트:**
```
POST https://lcgaxwmqolcuorodrecd.supabase.co/functions/v1/make-server-5231839f/matches/sync-templates
Authorization: Bearer YOUR_ANON_KEY
```

**결과:**
```json
{
  "success": true,
  "total_matches": 4,
  "active_matches_now": 1,
  "templates_created": 4,
  "templates_deleted": 0,
  "errors": []
}
```

### 3️⃣ **Supabase에서 데이터 조회**

```sql
-- 오늘 경기 조회
SELECT 
  match_key,
  club_name,
  time_range,
  start_time,
  end_time
FROM today_matches
WHERE match_date = CURRENT_DATE
ORDER BY start_time;

-- 현재 진행 중인 경기 조회
SELECT *
FROM today_matches
WHERE 
  match_date = CURRENT_DATE
  AND start_time - INTERVAL '10 minutes' <= NOW()
  AND end_time >= NOW();
```

---

## 자동화 설정 (Supabase Cron)

**매일 오전 6시 자동 크롤링:**

```sql
SELECT cron.schedule(
  'crawl-joongsan-daily',
  '0 6 * * *',  -- 매일 06:00 (KST)
  $$SELECT net.http_post(
    url:='https://lcgaxwmqolcuorodrecd.supabase.co/functions/v1/make-server-5231839f/crawl/joongsan-today',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) AS request_id;$$
);
```

**매일 오전 6시 10분 자동 동기화:**

```sql
SELECT cron.schedule(
  'sync-joongsan-templates-daily',
  '10 6 * * *',  -- 매일 06:10 (KST)
  $$SELECT net.http_post(
    url:='https://lcgaxwmqolcuorodrecd.supabase.co/functions/v1/make-server-5231839f/matches/sync-templates',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) AS request_id;$$
);
```

---

## 주의사항

### ⚠️ **시간대 처리**
- 모든 datetime은 **한국 시간 (UTC+09:00)** 기준
- 크롤링 데이터: `"07시 ~ 10시"` → DB: `"2025-12-21T07:00:00+09:00"`
- 스케줄 실행: **시작 10분 전부터 송출**

### ⚠️ **데이터 검증**
- `start_time`, `end_time`이 없는 경기는 스킵
- 날짜 파싱 실패 시 에러 로그 기록

### ⚠️ **템플릿/스케줄 생명주기**
- 자동 생성된 템플릿: `auto_match_*` 접두사
- 오늘 경기가 아니면 자동 삭제
- 수동 생성 템플릿은 영향 받지 않음

---

## 변경 이력

### 2025-12-22
- ✅ **`start_time`, `end_time` 컬럼 추가** (timestamptz)
- ✅ 크롤러에서 datetime 파싱 로직 구현
- ✅ sync-templates 엔드포인트에서 DB의 datetime 직접 사용
- ✅ 시간 형식 검증 강화 ("07시" → "07:00:00+09:00")
