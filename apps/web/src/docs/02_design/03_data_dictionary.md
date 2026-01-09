# 데이터 사전 (Data Dictionary)

---

## 1. 테이블 목록

| 테이블명 | 설명 | 레코드 예상 건수 | 보존 기간 |
|----------|------|------------------|-----------|
| user_profiles | 사용자 프로필 | ~50 | 영구 |
| displays | 전광판 정보 | ~10 | 영구 |
| display_config | 전광판 설정 | ~10 | 영구 |
| air_stations | 공기질 측정소 | ~100 | 영구 |
| weather_stations | 기상 측정소 | ~50 | 영구 |
| weather_air_quality_readings | 수집 데이터 | ~10,000/월 | 7일 (통계는 영구) |
| message_templates | 메시지 템플릿 | ~100 | 영구 |
| schedules | 송출 스케줄 | ~1,000/월 | 실증 기간 영구 |
| display_state | 전광판 현재 상태 | ~10 | 영구 (실시간 업데이트) |
| audit_logs | 감사 로그 | ~5,000/월 | 실증 기간 영구, 이후 1년 |

---

## 2. user_profiles

### 테이블 설명
- **목적**: Supabase Auth 사용자와 연동된 권한 정보
- **관계**: auth.users와 1:1
- **중요도**: ⭐⭐⭐ (권한 제어 핵심)

### 필드 상세

| 필드명 | 타입 | NULL | 기본값 | 설명 | 예시 |
|--------|------|------|--------|------|------|
| id | UUID | NO | - | auth.users.id 참조 (PK) | `a0ee...` |
| role | TEXT | NO | 'VIEWER' | 사용자 역할 | `ADMIN` |
| emergency_permission | BOOLEAN | NO | false | 긴급 송출 권한 | `true` |
| created_at | TIMESTAMPTZ | NO | NOW() | 프로필 생성 시각 | `2025-12-16 09:00:00+09` |

### 제약 조건
```sql
PRIMARY KEY (id)
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
CHECK (role IN ('ADMIN', 'OPERATOR', 'VIEWER'))
```

### RLS 정책
- **읽기**: 자신의 프로필만 조회 가능
- **쓰기**: ADMIN만 모든 프로필 수정 가능

### 샘플 데이터
```sql
INSERT INTO user_profiles (id, role, emergency_permission) VALUES
('uuid-admin', 'ADMIN', true),
('uuid-operator1', 'OPERATOR', false),
('uuid-viewer1', 'VIEWER', false);
```

---

## 3. displays

### 테이블 설명
- **목적**: 전광판 기본 정보 관리
- **관계**: display_config, schedules, display_state와 1:N
- **중요도**: ⭐⭐⭐ (시스템 핵심)

### 필드 상세

| 필드명 | 타입 | NULL | 기본값 | 설명 | 예시 |
|--------|------|------|--------|------|------|
| id | UUID | NO | gen_random_uuid() | 전광판 고유 ID (PK) | `b1ff...` |
| name | TEXT | NO | - | 전광판 이름 | `축구장 입구 전광판` |
| location | TEXT | YES | NULL | 설치 위치 | `체육공원 A구역` |
| resolution_width | INTEGER | NO | - | 해상도 가로 (px) | `1920` |
| resolution_height | INTEGER | NO | - | 해상도 세로 (px) | `1080` |
| status | TEXT | NO | 'active' | 전광판 상태 | `active` |
| group_name | TEXT | YES | NULL | 그룹명 (그룹 송출용) | `A구역` |
| created_at | TIMESTAMPTZ | NO | NOW() | 생성 시각 | `2025-12-01 10:00:00+09` |

### 제약 조건
```sql
PRIMARY KEY (id)
CHECK (status IN ('active', 'inactive', 'maintenance'))
CHECK (resolution_width > 0 AND resolution_height > 0)
```

### 인덱스
```sql
CREATE INDEX idx_displays_status ON displays(status);
CREATE INDEX idx_displays_group ON displays(group_name);
```

### 샘플 데이터
```sql
INSERT INTO displays (name, location, resolution_width, resolution_height, group_name) VALUES
('축구장 입구', '체육공원 A구역', 1920, 1080, 'A구역'),
('농구장 입구', '체육공원 A구역', 1920, 1080, 'A구역'),
('테니스장 입구', '체육공원 B구역', 1280, 720, 'B구역');
```

---

## 4. display_config

### 테이블 설명
- **목적**: 전광판별 측정소 매핑
- **관계**: displays(1:1), air_stations(N:1), weather_stations(N:1)
- **중요도**: ⭐⭐⭐ (데이터 수집 핵심)

### 필드 상세

| 필드명 | 타입 | NULL | 기본값 | 설명 | 예시 |
|--------|------|------|--------|------|------|
| display_id | UUID | NO | - | 전광판 ID (PK, FK) | `b1ff...` |
| air_station_id | UUID | YES | NULL | 공기질 측정소 ID (FK) | `c2aa...` |
| weather_station_id | UUID | YES | NULL | 기상 측정소 ID (FK) | `d3bb...` |
| updated_at | TIMESTAMPTZ | NO | NOW() | 마지막 변경 시각 | `2025-12-16 14:30:00+09` |

### 제약 조건
```sql
PRIMARY KEY (display_id)
FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE
FOREIGN KEY (air_station_id) REFERENCES air_stations(id) ON DELETE SET NULL
FOREIGN KEY (weather_station_id) REFERENCES weather_stations(id) ON DELETE SET NULL
```

### 트리거
```sql
-- updated_at 자동 업데이트
CREATE TRIGGER update_display_config_updated_at
BEFORE UPDATE ON display_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 샘플 데이터
```sql
INSERT INTO display_config (display_id, air_station_id, weather_station_id) VALUES
('display-uuid-1', 'air-station-정발산동', 'weather-station-고양'),
('display-uuid-2', 'air-station-풍산동', 'weather-station-고양');
```

---

## 5. air_stations

### 테이블 설명
- **목적**: 공기질 측정소 메타데이터
- **관계**: display_config와 1:N
- **중요도**: ⭐⭐ (데이터 수집 필수)

### 필드 상세

| 필드명 | 타입 | NULL | 기본값 | 설명 | 예시 |
|--------|------|------|--------|------|------|
| id | UUID | NO | gen_random_uuid() | 측정소 ID (PK) | `c2aa...` |
| station_name | TEXT | NO | - | 측정소명 (AirKorea와 일치) | `정발산동` |
| sido | TEXT | NO | - | 시도 | `경기` |
| sigungu | TEXT | NO | - | 시군구 | `고양시` |
| latitude | DECIMAL(10,7) | YES | NULL | 위도 | `37.6583740` |
| longitude | DECIMAL(10,7) | YES | NULL | 경도 | `126.7676450` |
| last_collected_at | TIMESTAMPTZ | YES | NULL | 마지막 수집 성공 시각 | `2025-12-16 14:00:00+09` |
| collection_status | TEXT | NO | 'active' | 수집 상태 | `active` |
| created_at | TIMESTAMPTZ | NO | NOW() | 생성 시각 | `2025-12-01 10:00:00+09` |

### 제약 조건
```sql
PRIMARY KEY (id)
UNIQUE (station_name)
CHECK (collection_status IN ('active', 'delayed', 'failed'))
```

### 인덱스
```sql
CREATE INDEX idx_air_stations_region ON air_stations(sido, sigungu);
CREATE INDEX idx_air_stations_status ON air_stations(collection_status);
```

### 수집 상태 기준
- **active**: 최근 1시간 이내 수집 성공
- **delayed**: 1~3시간 사이
- **failed**: 3시간 이상 수집 실패

---

## 6. weather_stations

### 테이블 설명
- **목적**: 기상 측정소 메타데이터
- **관계**: display_config와 1:N
- **중요도**: ⭐⭐ (데이터 수집 필수)

### 필드 상세

| 필드명 | 타입 | NULL | 기본값 | 설명 | 예시 |
|--------|------|------|--------|------|------|
| id | UUID | NO | gen_random_uuid() | 측정소 ID (PK) | `d3bb...` |
| station_name | TEXT | NO | - | 기상 관측소명 | `고양` |
| nx | INTEGER | NO | - | 기상청 격자 X 좌표 | `60` |
| ny | INTEGER | NO | - | 기상청 격자 Y 좌표 | `127` |
| region | TEXT | YES | NULL | 지역명 | `경기 고양시` |
| last_collected_at | TIMESTAMPTZ | YES | NULL | 마지막 수집 성공 시각 | `2025-12-16 14:00:00+09` |
| collection_status | TEXT | NO | 'active' | 수집 상태 | `active` |
| created_at | TIMESTAMPTZ | NO | NOW() | 생성 시각 | `2025-12-01 10:00:00+09` |

### 제약 조건
```sql
PRIMARY KEY (id)
UNIQUE (nx, ny)
CHECK (collection_status IN ('active', 'delayed', 'failed'))
```

### 기상청 격자 좌표 변환
```
위경도 → 격자 좌표 변환 필요
예: 고양시 (37.6583740, 126.7676450) → (nx=60, ny=127)
```

---

## 7. weather_air_quality_readings

### 테이블 설명
- **목적**: 수집된 기상 및 공기질 데이터
- **관계**: displays와 N:1
- **중요도**: ⭐⭐⭐ (송출 데이터 소스)

### 필드 상세

| 필드명 | 타입 | NULL | 기본값 | 설명 | 예시 |
|--------|------|------|--------|------|------|
| id | UUID | NO | gen_random_uuid() | 레코드 ID (PK) | `e4cc...` |
| display_id | UUID | NO | - | 전광판 ID (FK) | `b1ff...` |
| temperature | DECIMAL(4,1) | YES | NULL | 기온 (°C) | `5.3` |
| sky_condition | TEXT | YES | NULL | 하늘상태 | `맑음` |
| precipitation_type | TEXT | YES | NULL | 강수형태 | `없음` |
| precipitation_prob | INTEGER | YES | NULL | 강수확률 (%) | `20` |
| humidity | INTEGER | YES | NULL | 습도 (%) | `65` |
| pm10 | INTEGER | YES | NULL | 미세먼지 (㎍/㎥) | `30` |
| pm25 | INTEGER | YES | NULL | 초미세먼지 (㎍/㎥) | `15` |
| khai | INTEGER | YES | NULL | 통합대기환경지수 | `65` |
| khai_grade | INTEGER | YES | NULL | 통합대기환경지수 등급 | `2` |
| collected_at | TIMESTAMPTZ | NO | NOW() | 수집 시각 | `2025-12-16 14:00:00+09` |
| weather_collected | BOOLEAN | NO | false | 기상 데이터 수집 성공 여부 | `true` |
| air_quality_collected | BOOLEAN | NO | false | 공기질 데이터 수집 성공 여부 | `true` |

### 제약 조건
```sql
PRIMARY KEY (id)
FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE
UNIQUE (display_id, collected_at)
```

### 인덱스
```sql
CREATE INDEX idx_readings_display_time ON weather_air_quality_readings(display_id, collected_at DESC);
```

### sky_condition 값
- `맑음` (SKY=1)
- `구름많음` (SKY=3)
- `흐림` (SKY=4)

### precipitation_type 값
- `없음` (PTY=0)
- `비` (PTY=1)
- `비/눈` (PTY=2)
- `눈` (PTY=3)
- `소나기` (PTY=4)

### khai_grade 값
- `1`: 좋음 (0~50)
- `2`: 보통 (51~100)
- `3`: 나쁨 (101~250)
- `4`: 매우나쁨 (251~)

---

## 8. message_templates

### 테이블 설명
- **목적**: 재사용 가능한 메시지 템플릿
- **관계**: schedules와 1:N
- **중요도**: ⭐⭐⭐ (운영 효율성 핵심)

### 필드 상세

| 필드명 | 타입 | NULL | 기본값 | 설명 | 예시 |
|--------|------|------|--------|------|------|
| id | UUID | NO | gen_random_uuid() | 템플릿 ID (PK) | `f5dd...` |
| name | TEXT | NO | - | 템플릿 이름 | `축구장 대관 안내` |
| category | TEXT | YES | NULL | 카테고리 | `대관` |
| title | TEXT | NO | - | 제목 (max 50자) | `축구장 대관 안내` |
| body | TEXT | NO | - | 본문 (max 200자) | `오늘 오후 2시~4시...` |
| emphasis_text | TEXT | YES | NULL | 강조 문구 (max 30자) | `예약 필수` |
| background_color | TEXT | NO | '#FFFFFF' | 배경색 | `#FFFFFF` |
| text_color | TEXT | NO | '#000000' | 텍스트 색상 | `#000000` |
| alignment | TEXT | NO | 'center' | 정렬 | `center` |
| font_size | TEXT | NO | 'medium' | 폰트 크기 | `medium` |
| icon | TEXT | YES | NULL | lucide-react 아이콘명 | `AlertCircle` |
| version | INTEGER | NO | 1 | 버전 번호 | `3` |
| created_by | UUID | YES | NULL | 작성자 ID (FK) | `a0ee...` |
| created_at | TIMESTAMPTZ | NO | NOW() | 생성 시각 | `2025-12-10 09:00:00+09` |
| updated_at | TIMESTAMPTZ | NO | NOW() | 수정 시각 | `2025-12-16 14:30:00+09` |

### 제약 조건
```sql
PRIMARY KEY (id)
FOREIGN KEY (created_by) REFERENCES user_profiles(id)
CHECK (alignment IN ('left', 'center', 'right'))
CHECK (font_size IN ('small', 'medium', 'large'))
```

### 카테고리 목록
- `대관`: 대관 안내
- `방역`: 방역 안내
- `캠페인`: 캠페인 안내
- `안전`: 안전 공지
- `공지`: 일반 공지

### 버전 관리
```sql
-- 템플릿 수정 시 version 자동 증가
CREATE TRIGGER template_version_trigger
BEFORE UPDATE ON message_templates
FOR EACH ROW EXECUTE FUNCTION increment_template_version();
```

---

## 9. schedules

### 테이블 설명
- **목적**: 송출 스케줄 관리
- **관계**: displays(N:1), message_templates(N:1)
- **중요도**: ⭐⭐⭐ (송출 제어 핵심)

### 필드 상세

| 필드명 | 타입 | NULL | 기본값 | 설명 | 예시 |
|--------|------|------|--------|------|------|
| id | UUID | NO | gen_random_uuid() | 스케줄 ID (PK) | `g6ee...` |
| display_id | UUID | NO | - | 전광판 ID (FK) | `b1ff...` |
| content_type | TEXT | NO | - | 콘텐츠 타입 | `NOTICE` |
| template_id | UUID | YES | NULL | 템플릿 ID (FK) | `f5dd...` |
| start_at | TIMESTAMPTZ | NO | - | 송출 시작 시각 | `2025-12-16 09:00:00+09` |
| end_at | TIMESTAMPTZ | YES | NULL | 송출 종료 시각 | `2025-12-16 16:00:00+09` |
| rrule | TEXT | YES | NULL | 반복 규칙 (RRULE 형식) | `FREQ=WEEKLY;BYDAY=MO,WE,FR` |
| priority | INTEGER | NO | - | 우선순위 (자동 설정) | `200` |
| status | TEXT | NO | 'active' | 상태 | `active` |
| created_by | UUID | YES | NULL | 생성자 ID (FK) | `a0ee...` |
| created_at | TIMESTAMPTZ | NO | NOW() | 생성 시각 | `2025-12-16 08:55:00+09` |

### 제약 조건
```sql
PRIMARY KEY (id)
FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE
FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL
FOREIGN KEY (created_by) REFERENCES user_profiles(id)
CHECK (content_type IN ('WEATHER', 'NOTICE', 'EMERGENCY'))
CHECK (status IN ('active', 'completed', 'cancelled'))
CHECK (priority IN (100, 200, 300))
```

### 인덱스
```sql
CREATE INDEX idx_schedules_display_time ON schedules(display_id, start_at, end_at);
CREATE INDEX idx_schedules_priority ON schedules(priority DESC);
```

### 우선순위 자동 설정
```sql
-- content_type에 따라 priority 자동 설정
EMERGENCY → 300
NOTICE → 200
WEATHER → 100
```

---

## 10. display_state

### 테이블 설명
- **목적**: 전광판 현재 송출 상태
- **관계**: displays와 1:1
- **중요도**: ⭐⭐⭐ (실시간 상태 관리)

### 필드 상세

| 필드명 | 타입 | NULL | 기본값 | 설명 | 예시 |
|--------|------|------|--------|------|------|
| display_id | UUID | NO | - | 전광판 ID (PK, FK) | `b1ff...` |
| current_content_type | TEXT | NO | - | 현재 콘텐츠 타입 | `NOTICE` |
| current_content_id | UUID | YES | NULL | 현재 콘텐츠 ID (schedules.id) | `g6ee...` |
| priority | INTEGER | NO | - | 현재 우선순위 | `200` |
| started_at | TIMESTAMPTZ | NO | - | 현재 송출 시작 시각 | `2025-12-16 09:00:00+09` |
| expires_at | TIMESTAMPTZ | YES | NULL | 만료 예정 시각 | `2025-12-16 16:00:00+09` |
| last_updated | TIMESTAMPTZ | NO | NOW() | 마지막 업데이트 시각 | `2025-12-16 14:30:00+09` |

### 제약 조건
```sql
PRIMARY KEY (display_id)
FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE
CHECK (current_content_type IN ('WEATHER', 'NOTICE', 'EMERGENCY'))
CHECK (priority IN (100, 200, 300))
```

### 실시간 구독
```typescript
// Frontend에서 Realtime 구독
supabase
  .channel('display-state')
  .on('postgres_changes', { table: 'display_state' }, (payload) => {
    console.log('전광판 상태 변경:', payload);
  })
  .subscribe();
```

---

## 11. audit_logs

### 테이블 설명
- **목적**: 모든 행위 감사 로그
- **관계**: user_profiles와 N:1
- **중요도**: ⭐⭐⭐ (증빙 핵심)

### 필드 상세

| 필드명 | 타입 | NULL | 기본값 | 설명 | 예시 |
|--------|------|------|--------|------|------|
| id | UUID | NO | gen_random_uuid() | 로그 ID (PK) | `h7ff...` |
| user_id | UUID | YES | NULL | 사용자 ID (FK) | `a0ee...` |
| action | TEXT | NO | - | 액션 | `schedule_created` |
| target_type | TEXT | YES | NULL | 대상 타입 | `schedule` |
| target_id | UUID | YES | NULL | 대상 ID | `g6ee...` |
| metadata | JSONB | YES | NULL | 상세 정보 (JSON) | `{"template_id": "..."}` |
| ip_address | INET | YES | NULL | IP 주소 | `192.168.1.100` |
| user_agent | TEXT | YES | NULL | User Agent | `Mozilla/5.0...` |
| created_at | TIMESTAMPTZ | NO | NOW() | 로그 생성 시각 | `2025-12-16 14:30:00+09` |

### 제약 조건
```sql
PRIMARY KEY (id)
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL
```

### 인덱스
```sql
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
```

### 주요 액션 목록
- `schedule_created`: 스케줄 생성
- `schedule_updated`: 스케줄 수정
- `schedule_deleted`: 스케줄 삭제
- `emergency_override`: 긴급 송출 덮어쓰기
- `emergency_released`: 긴급 송출 해제
- `template_created`: 템플릿 생성
- `template_updated`: 템플릿 수정
- `display_config_updated`: 전광판 설정 변경

### CSV Export 쿼리
```sql
SELECT
  created_at AS "시각",
  (SELECT email FROM auth.users WHERE id = audit_logs.user_id) AS "사용자",
  action AS "액션",
  target_type AS "대상",
  metadata->>'description' AS "상세내용"
FROM audit_logs
WHERE created_at BETWEEN '2025-12-01' AND '2025-12-31'
ORDER BY created_at DESC;
```

---

## 12. 데이터 생애주기 (Data Lifecycle)

| 테이블 | 생성 시점 | 업데이트 주기 | 삭제 조건 |
|--------|-----------|---------------|-----------|
| user_profiles | 사용자 가입 시 | 권한 변경 시 | 사용자 탈퇴 시 (CASCADE) |
| displays | 전광판 추가 시 | 설정 변경 시 | 전광판 제거 시 |
| display_config | 전광판 추가 시 | 측정소 변경 시 | 전광판 제거 시 (CASCADE) |
| air_stations | 초기 세팅 | 측정소 정보 업데이트 시 | 거의 없음 |
| weather_stations | 초기 세팅 | 격자 정보 업데이트 시 | 거의 없음 |
| weather_air_quality_readings | 매시간 자동 | - | 7일 후 자동 삭제 (선택) |
| message_templates | 운영자 생성 시 | 수정 시 (버전 증가) | 운영자 삭제 시 |
| schedules | 송출 예약 시 | 상태 변경 시 | 종료 후 보존 (실증 증빙) |
| display_state | 전광판 추가 시 | 송출 변경 시 (실시간) | 전광판 제거 시 (CASCADE) |
| audit_logs | 모든 행위 발생 시 | - | 1년 후 (실증 기간은 영구) |

---

**다음 문서**: [04_etl_design.md](./04_etl_design.md) - 데이터 수집 설계
