# 고양시 인조잔디구장 '중산' 경기 데이터 크롤러 가이드

## 📋 개요

고양시 인조잔디구장 웹사이트(https://e-soccer.gys.or.kr/)에서 "오늘의 경기" 중 **'중산'** 탭 데이터를 크롤링하여 Supabase DB에 저장하는 시스템입니다.

---

## 🗄️ 1. 데이터베이스 설정

### Supabase SQL 실행

```sql
-- 1. Supabase 대시보드 → SQL Editor 접속
-- 2. 아래 SQL 실행

CREATE TABLE IF NOT EXISTS today_matches (
  match_key text PRIMARY KEY,
  match_date date NOT NULL,
  stadium text NOT NULL DEFAULT '중산',
  time_range text NOT NULL,
  duration_text text,
  club_name text,
  club_url text,
  source_url text NOT NULL DEFAULT 'https://e-soccer.gys.or.kr/',
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_today_matches_date_stadium 
  ON today_matches(match_date, stadium);

CREATE INDEX IF NOT EXISTS idx_today_matches_fetched_at 
  ON today_matches(fetched_at DESC);
```

**전체 SQL은 `/docs/today_matches_schema.sql` 참조**

---

## 🚀 2. 실행 방법

### **옵션 A: Node.js 크롤러 (권장)**

#### 설치

```bash
# 1. 크롤러 디렉토리 생성
mkdir goyang-crawler
cd goyang-crawler

# 2. 파일 복사
cp /docs/crawl-joongsan-today.js .
cp /docs/crawler-package.json package.json

# 3. 패키지 설치
npm install
```

#### 환경변수 설정

`.env` 파일 생성:

```env
SUPABASE_URL=https://lcgaxwmqolcuorodrecd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**⚠️ SERVICE_ROLE_KEY 확인:**
- Supabase 대시보드 → Settings → API
- `service_role` secret 복사

#### 실행

```bash
# 수동 실행
node crawl-joongsan-today.js

# 예상 출력:
# ========================================
# 🏟️  고양시 인조잔디구장 중산 경기 크롤러
# 📅 Date: 2025-12-21
# 🕐 Time: 2025-12-21 17:00:00
# ========================================
# 
# 📡 Fetching HTML from: https://e-soccer.gys.or.kr/
# ✅ HTML fetched successfully (54321 chars)
# 📋 Found 8 items in ul#ulMainGame3
#   ✓ Item 1: FC 레전드 | 10시 ~ 13시 | 3시간
#   ✓ Item 2: 유나이티드 | 14시 ~ 16시 | 2시간
# ...
# 💾 Upserting 8 records to Supabase...
#   ✓ Upserted: 20251221|10시 ~ 13시|중산
#   ✓ Upserted: 20251221|14시 ~ 16시|중산
# ...
# ✅ Upsert complete: 8 success, 0 failed
# ========================================
# ✅ Crawling completed successfully!
#    - Total parsed: 8
#    - Upserted: 8
#    - Failed: 0
# ========================================
```

#### Cron 설정 (자동 실행)

**Linux/Mac:**

```bash
# crontab 편집
crontab -e

# 매일 오전 6시 실행
0 6 * * * /usr/bin/node /path/to/crawl-joongsan-today.js >> /var/log/joongsan-crawler.log 2>&1
```

**Windows (Task Scheduler):**

1. 작업 스케줄러 실행
2. 작업 만들기
3. 트리거: 매일 오전 6시
4. 작업: `node C:\path\to\crawl-joongsan-today.js`

---

### **옵션 B: Supabase Edge Function**

#### 수동 실행

```bash
# curl로 호출
curl -X POST https://lcgaxwmqolcuorodrecd.supabase.co/functions/v1/make-server-5231839f/crawl/joongsan-today \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# 응답 예시:
# {
#   "success": true,
#   "message": "Crawling completed successfully",
#   "data": {
#     "date": "2025-12-21",
#     "totalParsed": 8,
#     "upserted": 8,
#     "failed": 0,
#     "matches": [...]
#   }
# }
```

#### Supabase Cron 설정 (자동 실행)

**방법 1: pg_cron (Supabase SQL Editor)**

```sql
-- 매일 오전 6시 실행 (한국시간 기준 UTC+9)
-- UTC 21:00 = KST 06:00 (다음날)
SELECT cron.schedule(
  'crawl-joongsan-daily',
  '0 21 * * *',  -- UTC 시간
  $$SELECT net.http_post(
    url:='https://lcgaxwmqolcuorodrecd.supabase.co/functions/v1/make-server-5231839f/crawl/joongsan-today',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) AS request_id;$$
);

-- 크론 작업 확인
SELECT * FROM cron.job;

-- 크론 실행 로그 확인
SELECT * FROM cron.job_run_details 
WHERE jobname = 'crawl-joongsan-daily' 
ORDER BY start_time DESC 
LIMIT 10;

-- 크론 작업 삭제 (필요시)
SELECT cron.unschedule('crawl-joongsan-daily');
```

**방법 2: GitHub Actions (외부 스케줄러)**

`.github/workflows/crawl-joongsan.yml`:

```yaml
name: Crawl Joongsan Daily

on:
  schedule:
    - cron: '0 21 * * *'  # UTC 21:00 = KST 06:00
  workflow_dispatch:  # 수동 실행 가능

jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - name: Call Crawler Endpoint
        run: |
          curl -X POST https://lcgaxwmqolcuorodrecd.supabase.co/functions/v1/make-server-5231839f/crawl/joongsan-today \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

---

## 🔍 3. 데이터 검증

### Supabase 대시보드

```sql
-- 오늘 날짜 경기 조회
SELECT 
  match_key,
  time_range,
  duration_text,
  club_name,
  fetched_at
FROM today_matches
WHERE match_date = CURRENT_DATE
  AND stadium = '중산'
ORDER BY time_range;

-- 최근 수집 현황
SELECT 
  match_date,
  COUNT(*) as match_count,
  MAX(fetched_at) as last_fetched
FROM today_matches
WHERE stadium = '중산'
GROUP BY match_date
ORDER BY match_date DESC
LIMIT 7;
```

### 예상 결과

| match_key | time_range | duration_text | club_name | fetched_at |
|-----------|-----------|---------------|-----------|------------|
| 20251221\|10시 ~ 13시\|중산 | 10시 ~ 13시 | 3시간 | FC 레전드 | 2025-12-21 06:00:15+00 |
| 20251221\|14시 ~ 16시\|중산 | 14시 ~ 16시 | 2시간 | 유나이티드 | 2025-12-21 06:00:15+00 |
| 20251221\|17시 ~ 19시\|중산 | 17시 ~ 19시 | 2시간 | null | 2025-12-21 06:00:15+00 |

---

## 🐛 4. 트러블슈팅

### 문제: 한글이 깨짐

**원인:** EUC-KR 인코딩 처리 실패

**해결:**
- Node.js: `iconv-lite` 패키지 정상 설치 확인
- Edge Function: `TextDecoder('euc-kr')` 지원 여부 확인

### 문제: ul#ulMainGame3를 찾을 수 없음

**원인:** 웹사이트 HTML 구조 변경

**해결:**
1. 브라우저에서 https://e-soccer.gys.or.kr/ 접속
2. 개발자 도구(F12) → Elements
3. '중산' 탭의 실제 HTML 구조 확인
4. `SELECTOR_UL` 값 수정

### 문제: Supabase 권한 오류

**원인:** SERVICE_ROLE_KEY 대신 ANON_KEY 사용

**해결:**
- `.env` 파일에서 `SUPABASE_SERVICE_ROLE_KEY` 확인
- Supabase 대시보드에서 올바른 키 복사

### 문제: 데이터가 업데이트되지 않음

**원인:** match_key가 동일하면 upsert가 기존 값 유지

**해결:**
- `fetched_at`은 항상 업데이트됨
- 다른 필드 변경 확인: `club_name`, `duration_text` 등

---

## 📊 5. 모니터링

### 크롤러 실행 로그

**Node.js:**
```bash
# 로그 파일 확인
tail -f /var/log/joongsan-crawler.log

# 최근 실행 결과만 보기
tail -n 100 /var/log/joongsan-crawler.log | grep "✅ Crawling completed"
```

**Edge Function:**
```bash
# Supabase 대시보드 → Edge Functions → Logs
# 또는 CLI:
supabase functions logs make-server-5231839f --tail
```

### 알림 설정 (옵션)

크롤링 실패 시 이메일/Slack 알림을 추가할 수 있습니다:

```javascript
// crawl-joongsan-today.js에 추가
if (result.failed > 0) {
  // Slack Webhook 호출
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: `⚠️ Joongsan Crawler: ${result.failed} matches failed to upsert`
  });
}
```

---

## 📁 6. 파일 구조

```
/docs/
├── today_matches_schema.sql        # DB 스키마
├── crawl-joongsan-today.js         # Node 크롤러
├── crawler-package.json            # 패키지 설정
└── JOONGSAN_CRAWLER_GUIDE.md       # 이 문서

/supabase/functions/server/
└── joongsan_crawler.ts             # Edge Function 크롤러
```

---

## 🔐 7. 보안 고려사항

1. **SERVICE_ROLE_KEY 보호**
   - `.env` 파일을 `.gitignore`에 추가
   - GitHub Actions에서는 Secrets 사용

2. **Rate Limiting**
   - 현재는 1일 1회 실행
   - 더 자주 실행 시 웹사이트 부하 고려

3. **에러 핸들링**
   - 크롤링 실패 시에도 시스템 중단 없이 로그만 기록

---

## 📞 8. 지원

- 버그 리포트: GitHub Issues
- 기능 요청: Pull Request
- 긴급 문의: 시스템 관리자

---

## 📝 9. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2025-12-21 | 초기 버전 - '중산' 탭 크롤링 |
