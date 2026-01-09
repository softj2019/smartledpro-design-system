# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

### 1.1 Supabase 계정 생성
1. [Supabase](https://supabase.com) 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인

### 1.2 새 프로젝트 생성
1. "New Project" 클릭
2. 프로젝트 정보 입력:
   - **Name**: `goyang-display-system`
   - **Database Password**: 강력한 비밀번호 생성 (저장 필수!)
   - **Region**: `Northeast Asia (Seoul)` 권장
   - **Pricing Plan**: Free (실증용) 또는 Pro (운영용)
3. "Create new project" 클릭
4. 프로젝트 생성 대기 (약 2분 소요)

---

## 2. 데이터베이스 마이그레이션

### 2.1 SQL Editor에서 실행

1. Supabase Dashboard → **SQL Editor** 클릭
2. "New query" 클릭
3. `/supabase/migrations/20241216000001_initial_schema.sql` 파일 내용 복사
4. 붙여넣기 후 **"Run"** 클릭
5. 성공 메시지 확인: `Success. No rows returned`

6. 다시 "New query" 클릭
7. `/supabase/migrations/20241216000002_enable_rls.sql` 파일 내용 복사
8. 붙여넣기 후 **"Run"** 클릭
9. 성공 메시지 확인

### 2.2 테이블 생성 확인

1. Supabase Dashboard → **Table Editor** 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - ✅ `displays`
   - ✅ `display_config`
   - ✅ `weather_stations`
   - ✅ `air_stations`
   - ✅ `message_templates`
   - ✅ `schedules`
   - ✅ `display_state`
   - ✅ `weather_air_quality_readings`
   - ✅ `audit_logs`

### 2.3 초기 데이터 확인

1. **Table Editor** → `weather_stations` 클릭
2. 4개 행 확인 (고양시청, 일산동구, 일산서구, 덕양구)
3. `air_stations` 클릭 → 3개 행 확인
4. `displays` 클릭 → 2개 샘플 전광판 확인

---

## 3. 환경 변수 설정

### 3.1 Supabase 프로젝트 정보 확인

1. Supabase Dashboard → **Settings** → **API** 클릭
2. 다음 정보 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbG...` (공개 키)
   - **service_role**: `eyJhbG...` (서비스 키, 비공개!)

### 3.2 로컬 환경 변수 설정

1. `/supabase/.env.example` 파일을 `/supabase/.env`로 복사
2. 다음 값 입력:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG... (anon public 키)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (service_role 키)

# 공공데이터 API 키는 아래 4단계에서 발급 후 입력
WEATHER_API_KEY=
AIRKOREA_API_KEY=
```

---

## 4. 공공데이터 API 키 발급

### 4.1 공공데이터포털 회원가입

1. [공공데이터포털](https://www.data.go.kr) 접속
2. 회원가입 (일반 회원)
3. 이메일 인증 완료

### 4.2 기상청 API 신청

1. 공공데이터포털 로그인
2. 검색창에 **"기상청 단기예보"** 검색
3. "기상청_단기예보 조회서비스" 클릭
4. **"활용신청"** 버튼 클릭
5. 활용 목적: **"고양시 스마트시티 리빙랩 실증사업 - 전광판 송출 시스템"** 입력
6. 상세 기능: **"기상 정보 자동 수집 및 전광판 표시"** 입력
7. 신청 완료 후 승인 대기 (1~2일 소요)

### 4.3 AirKorea API 신청

1. 공공데이터포털에서 **"한국환경공단 에어코리아"** 검색
2. "한국환경공단_에어코리아_대기오염정보" 클릭
3. **"활용신청"** 버튼 클릭
4. 활용 목적: 위와 동일
5. 신청 완료 후 승인 대기

### 4.4 API 키 확인 및 설정

1. 승인 완료 후 마이페이지 → **"인증키 발급현황"** 클릭
2. **일반 인증키 (Decoding)** 복사
3. `/supabase/.env` 파일에 입력:

```bash
WEATHER_API_KEY=발급받은_기상청_API_키
AIRKOREA_API_KEY=발급받은_AirKorea_API_키
```

---

## 5. Edge Functions 배포

### 5.1 Supabase CLI 설치

```bash
# macOS
brew install supabase/tap/supabase

# Windows (scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase
```

### 5.2 Supabase 로그인

```bash
supabase login
```

브라우저가 열리면 인증 완료

### 5.3 프로젝트 연결

```bash
# 프로젝트 루트에서 실행
supabase link --project-ref your-project-id
```

**project-ref 확인 방법**:
- Supabase Dashboard → Settings → General → Reference ID

### 5.4 Edge Functions 비밀 설정

```bash
# 기상청 API 키 설정
supabase secrets set WEATHER_API_KEY=발급받은_기상청_API_키

# AirKorea API 키 설정
supabase secrets set AIRKOREA_API_KEY=발급받은_AirKorea_API_키

# 설정 확인
supabase secrets list
```

### 5.5 Edge Functions 배포

```bash
# 기상 데이터 수집 Function 배포
supabase functions deploy collect-weather-data

# 대기질 데이터 수집 Function 배포
supabase functions deploy collect-air-quality-data
```

배포 완료 확인:
- Supabase Dashboard → **Edge Functions** → 2개 함수 표시

### 5.6 Cron 스케줄 설정 (pg_cron)

Supabase Dashboard → **SQL Editor** → "New query":

```sql
-- 매 10분마다 기상 데이터 수집
SELECT cron.schedule(
  'collect-weather-data-every-10min',
  '*/10 * * * *', -- 매 10분
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/collect-weather-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);

-- 매 10분마다 대기질 데이터 수집
SELECT cron.schedule(
  'collect-air-quality-data-every-10min',
  '*/10 * * * *', -- 매 10분
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/collect-air-quality-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);

-- Cron 작업 확인
SELECT * FROM cron.job;
```

**주의**: 
- `your-project.supabase.co`를 실제 프로젝트 URL로 변경
- `YOUR_SERVICE_ROLE_KEY`를 실제 service_role 키로 변경

---

## 6. 테스트 사용자 생성

### 6.1 ADMIN 사용자 생성

1. Supabase Dashboard → **Authentication** → **Users** 클릭
2. **"Add user"** → **"Create new user"** 클릭
3. 정보 입력:
   - **Email**: `admin@goyang.go.kr`
   - **Password**: `Admin1234!` (운영 시 변경 필수)
   - **Auto Confirm User**: ✅ 체크
4. "Create user" 클릭

### 6.2 사용자 메타데이터 설정

생성된 사용자 클릭 → **"User Metadata"** 섹션에서 **"Edit"** 클릭:

```json
{
  "role": "ADMIN",
  "can_emergency": "true"
}
```

**"Save"** 클릭

### 6.3 OPERATOR 사용자 생성 (선택 사항)

위와 동일한 방법으로:
- **Email**: `operator@goyang.go.kr`
- **Password**: `Operator1234!`
- **User Metadata**:
```json
{
  "role": "OPERATOR",
  "can_emergency": "true"
}
```

### 6.4 VIEWER 사용자 생성 (선택 사항)

- **Email**: `viewer@goyang.go.kr`
- **Password**: `Viewer1234!`
- **User Metadata**:
```json
{
  "role": "VIEWER",
  "can_emergency": "false"
}
```

---

## 7. 수동 테스트

### 7.1 Edge Function 수동 실행

Supabase Dashboard → **Edge Functions** → `collect-weather-data` → **"Invoke"** 클릭

응답 확인:
```json
{
  "success": true,
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [...]
}
```

### 7.2 데이터 수집 확인

1. **Table Editor** → `weather_air_quality_readings` 클릭
2. 최근 데이터 확인 (collected_at이 최신)
3. `display_config` → `last_weather_update` 시각 확인

### 7.3 현재 송출 콘텐츠 뷰 테스트

**SQL Editor** → "New query":

```sql
-- 현재 송출 콘텐츠 조회
SELECT * FROM v_current_display_content;

-- 특정 전광판의 현재 콘텐츠 조회 (Function 사용)
SELECT * FROM get_current_content('전광판_UUID');

-- 최신 날씨·대기질 데이터 조회
SELECT * FROM v_latest_weather_air_quality;
```

---

## 8. 문제 해결

### 문제 1: 마이그레이션 실패

**증상**: SQL 실행 시 에러 발생

**해결**:
1. 기존 테이블 삭제 후 재시도:
```sql
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS weather_air_quality_readings CASCADE;
DROP TABLE IF EXISTS display_state CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS message_templates CASCADE;
DROP TABLE IF EXISTS display_config CASCADE;
DROP TABLE IF EXISTS air_stations CASCADE;
DROP TABLE IF EXISTS weather_stations CASCADE;
DROP TABLE IF EXISTS displays CASCADE;
```
2. 마이그레이션 스크립트 재실행

### 문제 2: Edge Function 배포 실패

**증상**: `supabase functions deploy` 실패

**해결**:
1. Supabase CLI 최신 버전 확인:
```bash
supabase --version
# 1.123.0 이상
```
2. 프로젝트 재연결:
```bash
supabase link --project-ref your-project-id
```

### 문제 3: API 키 오류

**증상**: Edge Function 실행 시 401 Unauthorized

**해결**:
1. 공공데이터포털에서 API 키 재확인
2. **Decoding 키** 사용 확인 (Encoding 키 아님)
3. 비밀 재설정:
```bash
supabase secrets set WEATHER_API_KEY=새로운_키
```

### 문제 4: Cron 작업 미실행

**증상**: 10분이 지나도 데이터 수집 안 됨

**해결**:
1. Cron 작업 목록 확인:
```sql
SELECT * FROM cron.job;
```
2. pg_cron extension 활성화 확인:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```
3. 수동 실행으로 Function 자체는 정상인지 확인

---

## 9. 다음 단계

Supabase 설정 완료 후:

1. **프론트엔드 개발**: Figma Make로 관리자 UI 생성
2. **Supabase 클라이언트 연동**: React에서 Supabase 연결
3. **송출 페이지 구현**: `/display/{id}` 페이지 개발
4. **통합 테스트**: 전체 시스템 동작 검증

---

## 10. 체크리스트

설정 완료 전 다음 항목을 모두 확인하세요:

- [ ] Supabase 프로젝트 생성 완료
- [ ] 마이그레이션 스크립트 실행 완료 (2개 파일)
- [ ] 9개 테이블 생성 확인
- [ ] 초기 데이터 삽입 확인 (측정소, 샘플 전광판)
- [ ] 환경 변수 설정 완료 (`.env` 파일)
- [ ] 공공데이터 API 키 발급 완료 (2개)
- [ ] Edge Functions 배포 완료 (2개)
- [ ] Edge Functions 비밀 설정 완료
- [ ] Cron 스케줄 설정 완료
- [ ] 테스트 사용자 생성 완료 (최소 ADMIN 1명)
- [ ] Edge Function 수동 실행 테스트 성공
- [ ] 데이터 수집 확인 (weather_air_quality_readings)

**모두 체크되면 Supabase 설정 완료입니다!** 🎉

---

**작성일**: 2024-12-16  
**문서 버전**: v1.0.0
