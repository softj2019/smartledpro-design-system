# 🌤️ AirKorea 공기질 데이터 수집 시스템 - 설정 가이드

## 📋 목차
1. [개요](#개요)
2. [DB 스키마 설정](#db-스키마-설정)
3. [API 키 발급 및 등록](#api-키-발급-및-등록)
4. [측정소 설정](#측정소-설정)
5. [자동 수집 확인](#자동-수집-확인)
6. [전광판 연동](#전광판-연동)
7. [트러블슈팅](#트러블슈팅)

---

## 개요

### 주요 기능
- ✅ **AirKorea 공공 API** 연동
- ✅ **Primary/Secondary 폴백** 시스템
- ✅ **매시간 정각 자동 수집** (XX:00)
- ✅ **예외처리 고도화** (Timeout, Retry, 중복 방지)
- ✅ **전광판 송출** 지원
- ✅ **Audit Logs** 완전 기록

### 송출 우선순위
```
EMERGENCY > NOTICE > AIR_QUALITY > WEATHER
```

---

## DB 스키마 설정

### 1. SQL 마이그레이션 실행

Supabase Dashboard > **SQL Editor**에서 다음 파일 실행:

```sql
-- /supabase/migrations/create_air_quality_tables.sql
-- (이미 생성됨 - 파일 내용을 복사하여 실행)
```

### 2. 생성되는 테이블 (3개)

#### `air_station_settings`
- Primary/Secondary 측정소 설정
- `priority` : 1 = Primary, 2 = Secondary
- `enabled` : false면 수집 제외

#### `air_quality_hourly`
- 시간별 공기질 데이터 저장
- `unique(scope, station_name, data_time)` 중복 방지
- 수집 항목: KHAI, PM10, PM2.5, SO2, CO, O3, NO2

#### `air_collect_logs`
- 수집 시도/폴백/실패 로그
- `tried` : [{priority, stationName, ok, reason, httpStatus, elapsedMs}]

---

## API 키 발급 및 등록

### 1. 공공데이터포털에서 API 키 발급

1. **공공데이터포털** 접속: https://www.data.go.kr
2. 회원가입 및 로그인
3. 검색: **"한국환경공단_에어코리아_대기오염정보"**
4. 활용신청 → **인증키 발급**
5. **Encoding 인증키** 복사 (Decoding 키 아님!)

### 2. Supabase Secrets에 등록

Supabase Dashboard > **Project Settings** > **Edge Functions** > **Secrets**

```
Name: AIRKOREA_SERVICE_KEY
Value: [발급받은 Encoding 인증키]
```

### 3. 확인

Figma Make 앱에서 **"AIRKOREA_SERVICE_KEY"** Secret 생성 요청이 이미 완료되었습니다.
위의 Supabase Dashboard에서 값만 입력하면 됩니다.

---

## 측정소 설정

### 1. 관리자 페이지 접속

**시스템 설정** > **공기질 표출** 탭

### 2. 측정소 검색

#### 검색 모드 선택
- **Auto** : 자동 감지 (주소/측정소명)
- **주소** : 주소로만 검색
- **측정소명** : 측정소명으로만 검색

#### 검색 예시
```
주소 검색 : "경기 고양시 일산동구"
측정소명 검색 : "식사동"
```

### 3. Primary/Secondary 설정

검색 결과에서 원하는 측정소를 선택:
- **Primary 버튼** : 주 측정소로 설정
- **Secondary 버튼** : 폴백 측정소로 설정

### 4. 활성화 토글

각 측정소 카드에서 토글을 **ON**으로 설정:
- OFF 상태면 수집 대상에서 제외됩니다

### 5. 권장 설정

```
Primary : 식사동 (도시대기)
Secondary : 백마로(마두역) (도시대기)
```

---

## 자동 수집 확인

### 1. 수집 주기

**매시간 정각 (XX:00)**
- 예: 09:00, 10:00, 11:00, ...
- ±2분 오차 허용

### 2. 수집 로직

```
1. Primary 측정소 시도
   └─ 성공 → 데이터 저장
   └─ 실패 → Secondary 측정소 시도
      └─ 성공 → 데이터 저장
      └─ 실패 → 로그만 기록
```

### 3. 최근 수집 결과 확인

**시스템 설정** > **공기질 표출** > **최근 수집 결과** 카드
- 성공/실패 상태
- 사용된 측정소 (Priority 1 or 2)
- 측정 시각

### 4. 수동 수집 테스트

**"지금 수집"** 버튼 클릭:
- 즉시 데이터 수집 실행
- 로그에서 결과 확인

---

## 전광판 연동

### 1. 공기질 표출 컴포넌트

`/components/display/AirQualityDisplay.tsx`

### 2. 사용 방법

```tsx
import { AirQualityDisplay } from './components/display/AirQualityDisplay';

<AirQualityDisplay 
  scope="GOYANG"
  autoRefresh={true}
  refreshInterval={300}  // 5분마다
  showDetails={true}
/>
```

### 3. 표시 항목

#### 메인 화면
- **통합대기환경지수 (KHAI)**
  - 수치 + 등급 (좋음/보통/나쁨/매우나쁨)
  - 등급별 색상 구분

#### 상세 화면
- **미세먼지 (PM10)**
- **초미세먼지 (PM2.5)**

### 4. 송출 우선순위 설정

```
1. EMERGENCY (긴급)
2. NOTICE (공지)
3. AIR_QUALITY (공기질) ← 새로 추가
4. WEATHER (날씨)
```

---

## 트러블슈팅

### ❌ "검색 결과가 없습니다"

**원인**
- API 키 미등록
- 검색어 오타
- 해당 지역에 측정소 없음

**해결**
1. Supabase Secrets에 `AIRKOREA_SERVICE_KEY` 확인
2. 검색어 다시 입력 (예: "고양시" → "경기 고양시")
3. 주변 지역으로 검색 시도

---

### ❌ "수집 실패 - TIMEOUT"

**원인**
- 네트워크 지연
- AirKorea API 서버 과부하

**해결**
1. 1~2분 후 다시 시도
2. Secondary 측정소가 자동으로 폴백 시도
3. 지속되면 API 서비스 상태 확인

---

### ❌ "수집 실패 - NO_ITEMS"

**원인**
- 측정소에서 최근 데이터 없음
- 측정소 운영 중단

**해결**
1. 다른 측정소로 변경
2. Secondary 측정소 설정 확인
3. AirKorea 사이트에서 측정소 운영 상태 확인

---

### ❌ "중복 실행 방지"

**원인**
- 55분 이내 이미 수집 실행됨
- 정상 동작 (중복 방지 시스템)

**해결**
- 이슈 아님
- 다음 정각까지 대기

---

### ❌ "API 키 오류 (HTTP_401)"

**원인**
- API 키 미등록
- 잘못된 키 입력
- Decoding 키 사용 (❌)

**해결**
1. Supabase Secrets 재확인
2. **Encoding 키** 사용 (Decoding 아님!)
3. 키 앞뒤 공백 제거

---

## 📊 수집 데이터 확인

### Supabase Dashboard

#### 1. 측정소 설정
```sql
SELECT * FROM air_station_settings 
WHERE scope = 'GOYANG' 
ORDER BY priority;
```

#### 2. 최신 공기질 데이터
```sql
SELECT * FROM air_quality_hourly 
WHERE scope = 'GOYANG' 
ORDER BY data_time DESC 
LIMIT 10;
```

#### 3. 수집 로그
```sql
SELECT * FROM air_collect_logs 
WHERE scope = 'GOYANG' 
ORDER BY run_at DESC 
LIMIT 20;
```

---

## 🔧 고급 설정

### Cron 스케줄 수정

Supabase Dashboard > **Database** > **Cron Jobs**

```
현재: 매시간 정각 (0 * * * *)
변경 가능: 
- 30분마다: */30 * * * *
- 특정 시간대만: 0 9-18 * * * (9시~18시)
```

### 수집 주기 변경

`/supabase/functions/server/index.tsx` 수정:

```typescript
// 현재: ±2분
if (kstMinute <= 2 || kstMinute >= 58) {

// 변경: ±5분
if (kstMinute <= 5 || kstMinute >= 55) {
```

---

## ✅ 완료 체크리스트

- [ ] DB 스키마 실행 완료
- [ ] AIRKOREA_SERVICE_KEY 등록 완료
- [ ] Primary 측정소 설정 완료
- [ ] Secondary 측정소 설정 완료
- [ ] 측정소 활성화 (enabled=true)
- [ ] "지금 수집" 버튼으로 테스트 완료
- [ ] 최근 수집 결과 "성공" 확인
- [ ] 자동 크롤링 탭에서 공기질 안내 확인

---

## 📞 지원

문제 발생 시:
1. **디버그 로그** 확인 (화면 우측 플로팅 버튼)
2. **Audit Logs** 확인 (Supabase Dashboard)
3. **수집 로그** 확인 (공기질 표출 탭)
4. **Supabase Edge Function Logs** 확인

---

**문서 버전:** 1.0.0  
**최종 수정:** 2025-12-22  
**작성자:** Figma Make AI Assistant
