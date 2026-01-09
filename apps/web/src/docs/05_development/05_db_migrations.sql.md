# 05_development / 05_db_migrations.sql.md

# DB 마이그레이션 스크립트

## 1. 개요

본 문서는 Supabase PostgreSQL 데이터베이스의 **전체 마이그레이션 스크립트**를 포함합니다.

### 1.1 실행 순서
1. **테이블 생성** (displays → message_templates → schedules → display_state 등)
2. **인덱스 생성**
3. **트리거 생성**
4. **RLS 정책 생성**
5. **뷰 생성**
6. **초기 데이터 삽입** (측정소 메타데이터 등)

### 1.2 실행 방법
- Supabase Dashboard → SQL Editor
- 아래 스크립트를 순서대로 복사하여 실행
- 또는 Supabase CLI: `supabase migration new init` 후 파일에 복사

---

## 2. 테이블 생성 스크립트

### 2.1 displays (전광판)

```sql
-- displays 테이블 생성
CREATE TABLE IF NOT EXISTS displays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  group_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_displays_active ON displays(is_active);
CREATE INDEX IF NOT EXISTS idx_displays_group ON displays(group_name);

-- 코멘트
COMMENT ON TABLE displays IS '전광판 기본 정보';
COMMENT ON COLUMN displays.name IS '전광판 고유 이름 (예: 공원 정문 전광판)';
COMMENT ON COLUMN displays.width IS '전광판 가로 해상도 (px)';
COMMENT ON COLUMN displays.height IS '전광판 세로 해상도 (px)';
COMMENT ON COLUMN displays.group_name IS '전광판 그룹 (예: 동별, 공원별)';
```

---

### 2.2 weather_stations (기상청 측정소)

```sql
-- weather_stations 테이블 생성
CREATE TABLE IF NOT EXISTS weather_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  nx INTEGER NOT NULL,
  ny INTEGER NOT NULL,
  region TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_weather_stations_active ON weather_stations(is_active);

-- 코멘트
COMMENT ON TABLE weather_stations IS '기상청 단기예보 API 좌표 관리';
COMMENT ON COLUMN weather_stations.nx IS '기상청 X 좌표';
COMMENT ON COLUMN weather_stations.ny IS '기상청 Y 좌표';
```

---

### 2.3 air_stations (대기질 측정소)

```sql
-- air_stations 테이블 생성
CREATE TABLE IF NOT EXISTS air_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name TEXT NOT NULL UNIQUE,
  addr TEXT,
  dm_x DECIMAL(10, 7),
  dm_y DECIMAL(10, 7),
  sido TEXT,
  sigungu TEXT,
  is_active BOOLEAN DEFAULT true,
  last_collected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_air_stations_sido ON air_stations(sido);
CREATE INDEX IF NOT EXISTS idx_air_stations_sigungu ON air_stations(sigungu);
CREATE INDEX IF NOT EXISTS idx_air_stations_name ON air_stations(station_name);

-- 코멘트
COMMENT ON TABLE air_stations IS 'AirKorea API 측정소 메타데이터';
COMMENT ON COLUMN air_stations.station_name IS '측정소명 (예: 일산동구)';
COMMENT ON COLUMN air_stations.dm_x IS '경도 (WGS84)';
COMMENT ON COLUMN air_stations.dm_y IS '위도 (WGS84)';
```

---

### 2.4 display_config (전광판 설정)

```sql
-- display_config 테이블 생성
CREATE TABLE IF NOT EXISTS display_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id UUID NOT NULL UNIQUE REFERENCES displays(id) ON DELETE CASCADE,
  weather_station_id UUID REFERENCES weather_stations(id) ON DELETE RESTRICT,
  air_station_id UUID REFERENCES air_stations(id) ON DELETE RESTRICT,
  layout_settings JSONB DEFAULT '{}',
  last_weather_update TIMESTAMPTZ,
  last_air_quality_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_display_config_display ON display_config(display_id);

-- 코멘트
COMMENT ON TABLE display_config IS '전광판별 개별 설정 (측정소, 레이아웃 등)';
COMMENT ON COLUMN display_config.layout_settings IS 'UI 레이아웃 설정 (JSON)';
COMMENT ON COLUMN display_config.last_weather_update IS '마지막 기상 데이터 수집 시각';
COMMENT ON COLUMN display_config.last_air_quality_update IS '마지막 대기질 데이터 수집 시각';
```

---

### 2.5 message_templates (메시지 템플릿)

```sql
-- message_templates 테이블 생성
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  highlight TEXT,
  style_config JSONB DEFAULT '{}',
  category TEXT,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON message_templates(created_by);

-- 코멘트
COMMENT ON TABLE message_templates IS 'NOTICE/EMERGENCY 콘텐츠 템플릿';
COMMENT ON COLUMN message_templates.name IS '템플릿 이름 (내부 식별용)';
COMMENT ON COLUMN message_templates.style_config IS '스타일 설정 (색상, 폰트 등)';
COMMENT ON COLUMN message_templates.category IS '카테고리 (대관, 방역, 캠페인, 안전, 공지)';
COMMENT ON COLUMN message_templates.version IS '버전 (수정 시 자동 증가)';
```

---

### 2.6 schedules (송출 스케줄)

```sql
-- schedules 테이블 생성
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES message_templates(id) ON DELETE RESTRICT,
  content_type TEXT NOT NULL CHECK (content_type IN ('NOTICE', 'EMERGENCY')),
  display_ids JSONB NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  recurrence_rule JSONB,
  priority INTEGER DEFAULT 200,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_time_range CHECK (end_at > start_at)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_schedules_start_end ON schedules(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_schedules_display_ids ON schedules USING GIN(display_ids);

-- 코멘트
COMMENT ON TABLE schedules IS '예약/반복 송출 스케줄';
COMMENT ON COLUMN schedules.display_ids IS '대상 전광판 ID 배열 (JSON)';
COMMENT ON COLUMN schedules.recurrence_rule IS '반복 규칙 (RRULE 유사 포맷)';
```

---

### 2.7 display_state (전광판 현재 상태)

```sql
-- display_state 테이블 생성
CREATE TABLE IF NOT EXISTS display_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id UUID NOT NULL REFERENCES displays(id) ON DELETE CASCADE,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('WEATHER', 'NOTICE', 'EMERGENCY')),
  priority INTEGER NOT NULL,
  content_data JSONB,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_display_state_display_priority 
  ON display_state(display_id, priority DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_display_state_active 
  ON display_state(display_id, start_at, end_at);

-- 코멘트
COMMENT ON TABLE display_state IS '전광판별 현재 송출 상태';
COMMENT ON COLUMN display_state.priority IS '우선순위 (EMERGENCY=300, NOTICE=200, WEATHER=100)';
COMMENT ON COLUMN display_state.content_data IS '콘텐츠 데이터 (WEATHER 또는 템플릿 없는 EMERGENCY용)';
```

---

### 2.8 weather_air_quality_readings (날씨·대기질 수집 데이터)

```sql
-- weather_air_quality_readings 테이블 생성
CREATE TABLE IF NOT EXISTS weather_air_quality_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id UUID NOT NULL REFERENCES displays(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('WEATHER', 'AIR_QUALITY')),
  
  -- 기상 데이터
  temperature DECIMAL(4, 1),
  precipitation_probability INTEGER,
  sky_condition TEXT,
  humidity INTEGER,
  wind_speed DECIMAL(4, 1),
  
  -- 대기질 데이터
  pm10_value INTEGER,
  pm10_grade INTEGER CHECK (pm10_grade BETWEEN 1 AND 4),
  pm25_value INTEGER,
  pm25_grade INTEGER CHECK (pm25_grade BETWEEN 1 AND 4),
  khai_value INTEGER,
  khai_grade INTEGER CHECK (khai_grade BETWEEN 1 AND 4),
  
  collected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_readings_display_type_collected 
  ON weather_air_quality_readings(display_id, data_type, collected_at DESC);

-- 코멘트
COMMENT ON TABLE weather_air_quality_readings IS '공공데이터 API 수집 결과';
COMMENT ON COLUMN weather_air_quality_readings.data_type IS '데이터 타입 (WEATHER | AIR_QUALITY)';
COMMENT ON COLUMN weather_air_quality_readings.khai_value IS '통합대기환경지수';
```

---

### 2.9 audit_logs (감사 로그)

```sql
-- audit_logs 테이블 생성
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  action_detail JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- 코멘트
COMMENT ON TABLE audit_logs IS '모든 사용자 행위 추적 및 증빙';
COMMENT ON COLUMN audit_logs.action IS 'CREATE, UPDATE, DELETE, SEND, EMERGENCY_SEND, EMERGENCY_RELEASE 등';
COMMENT ON COLUMN audit_logs.action_detail IS '행위 상세 정보 (JSON)';
```

---

## 3. 트리거 생성

### 3.1 updated_at 자동 갱신

```sql
-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- displays 트리거
CREATE TRIGGER trg_displays_updated_at
BEFORE UPDATE ON displays
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- display_config 트리거
CREATE TRIGGER trg_display_config_updated_at
BEFORE UPDATE ON display_config
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- message_templates 트리거
CREATE TRIGGER trg_message_templates_updated_at
BEFORE UPDATE ON message_templates
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- schedules 트리거
CREATE TRIGGER trg_schedules_updated_at
BEFORE UPDATE ON schedules
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- display_state 트리거
CREATE TRIGGER trg_display_state_updated_at
BEFORE UPDATE ON display_state
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

---

### 3.2 템플릿 버전 자동 증가

```sql
-- 템플릿 수정 시 버전 자동 증가
CREATE OR REPLACE FUNCTION increment_template_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.title IS DISTINCT FROM NEW.title 
     OR OLD.body IS DISTINCT FROM NEW.body 
     OR OLD.style_config::TEXT IS DISTINCT FROM NEW.style_config::TEXT THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_template_version
BEFORE UPDATE ON message_templates
FOR EACH ROW EXECUTE FUNCTION increment_template_version();
```

---

### 3.3 우선순위 검증

```sql
-- display_state INSERT/UPDATE 시 priority 검증
CREATE OR REPLACE FUNCTION validate_priority()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content_type = 'EMERGENCY' AND NEW.priority != 300 THEN
    RAISE EXCEPTION 'EMERGENCY must have priority 300';
  ELSIF NEW.content_type = 'NOTICE' AND NEW.priority != 200 THEN
    RAISE EXCEPTION 'NOTICE must have priority 200';
  ELSIF NEW.content_type = 'WEATHER' AND NEW.priority != 100 THEN
    RAISE EXCEPTION 'WEATHER must have priority 100';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_priority
BEFORE INSERT OR UPDATE ON display_state
FOR EACH ROW EXECUTE FUNCTION validate_priority();
```

---

## 4. 뷰 (Views) 생성

### 4.1 v_current_display_content (현재 송출 콘텐츠)

```sql
-- 각 전광판의 현재 송출 중인 콘텐츠 뷰
CREATE OR REPLACE VIEW v_current_display_content AS
SELECT DISTINCT ON (ds.display_id)
  d.id AS display_id,
  d.name AS display_name,
  d.location,
  d.width,
  d.height,
  ds.content_type,
  ds.priority,
  mt.title,
  mt.body,
  mt.highlight,
  mt.style_config,
  ds.content_data,
  ds.start_at,
  ds.end_at,
  ds.updated_at
FROM displays d
LEFT JOIN display_state ds ON d.id = ds.display_id
  AND (ds.start_at IS NULL OR ds.start_at <= NOW())
  AND (ds.end_at IS NULL OR ds.end_at >= NOW())
LEFT JOIN message_templates mt ON ds.template_id = mt.id
WHERE d.is_active = true
ORDER BY ds.display_id, ds.priority DESC, ds.updated_at DESC;

COMMENT ON VIEW v_current_display_content IS '각 전광판의 현재 송출 콘텐츠 (우선순위 적용)';
```

---

### 4.2 v_latest_weather_air_quality (최신 날씨·대기질)

```sql
-- 각 전광판의 최신 수집 데이터 뷰
CREATE OR REPLACE VIEW v_latest_weather_air_quality AS
SELECT DISTINCT ON (display_id, data_type)
  display_id,
  data_type,
  temperature,
  precipitation_probability,
  sky_condition,
  pm10_value,
  pm10_grade,
  pm25_value,
  pm25_grade,
  khai_value,
  khai_grade,
  collected_at,
  CASE
    WHEN collected_at > NOW() - INTERVAL '10 minutes' THEN 'NORMAL'
    WHEN collected_at > NOW() - INTERVAL '1 hour' THEN 'DELAYED'
    ELSE 'FAILED'
  END AS status
FROM weather_air_quality_readings
ORDER BY display_id, data_type, collected_at DESC;

COMMENT ON VIEW v_latest_weather_air_quality IS '전광판별 최신 날씨·대기질 데이터 및 상태';
```

---

## 5. RLS (Row Level Security) 정책

### 5.1 RLS 활성화

```sql
-- 모든 테이블에 RLS 활성화
ALTER TABLE displays ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_air_quality_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

---

### 5.2 displays 정책

```sql
-- VIEWER 이상 모두 조회 가능
CREATE POLICY "Anyone can view displays"
ON displays FOR SELECT
USING (true);

-- ADMIN만 생성/수정/삭제 가능
CREATE POLICY "Only ADMIN can insert displays"
ON displays FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' = 'ADMIN'
);

CREATE POLICY "Only ADMIN can update displays"
ON displays FOR UPDATE
USING (
  auth.jwt() ->> 'role' = 'ADMIN'
);

CREATE POLICY "Only ADMIN can delete displays"
ON displays FOR DELETE
USING (
  auth.jwt() ->> 'role' = 'ADMIN'
);
```

---

### 5.3 message_templates 정책

```sql
-- 모두 조회 가능
CREATE POLICY "Anyone can view templates"
ON message_templates FOR SELECT
USING (true);

-- OPERATOR 이상 생성 가능
CREATE POLICY "OPERATOR and ADMIN can insert templates"
ON message_templates FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' IN ('OPERATOR', 'ADMIN')
);

-- 본인 또는 ADMIN만 수정 가능
CREATE POLICY "Owner or ADMIN can update templates"
ON message_templates FOR UPDATE
USING (
  created_by = auth.uid() OR auth.jwt() ->> 'role' = 'ADMIN'
);

-- 본인 또는 ADMIN만 삭제 가능
CREATE POLICY "Owner or ADMIN can delete templates"
ON message_templates FOR DELETE
USING (
  created_by = auth.uid() OR auth.jwt() ->> 'role' = 'ADMIN'
);
```

---

### 5.4 display_state 정책 (긴급 송출 권한)

```sql
-- 모두 조회 가능
CREATE POLICY "Anyone can view display_state"
ON display_state FOR SELECT
USING (true);

-- OPERATOR 이상 INSERT 가능
CREATE POLICY "OPERATOR and ADMIN can insert display_state"
ON display_state FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' IN ('OPERATOR', 'ADMIN')
);

-- EMERGENCY 삭제는 can_emergency 권한 필요
CREATE POLICY "Only EMERGENCY users can release emergency messages"
ON display_state FOR DELETE
USING (
  content_type != 'EMERGENCY'
  OR
  (
    auth.jwt() ->> 'role' = 'ADMIN'
    OR
    (auth.jwt() ->> 'role' = 'OPERATOR' AND auth.jwt() ->> 'can_emergency' = 'true')
  )
);
```

---

### 5.5 audit_logs 정책

```sql
-- 모두 조회 가능 (투명성 확보)
CREATE POLICY "Anyone can view audit_logs"
ON audit_logs FOR SELECT
USING (true);

-- INSERT는 애플리케이션 레벨에서만 (서비스 키 사용)
-- 사용자가 직접 INSERT 불가
CREATE POLICY "Only service role can insert audit_logs"
ON audit_logs FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);
```

---

## 6. 저장 프로시저 (Functions)

### 6.1 get_current_content (현재 송출 콘텐츠 조회)

```sql
-- 특정 전광판의 현재 송출 콘텐츠 조회
CREATE OR REPLACE FUNCTION get_current_content(p_display_id UUID)
RETURNS TABLE (
  content_type TEXT,
  priority INTEGER,
  title TEXT,
  body TEXT,
  highlight TEXT,
  style_config JSONB,
  content_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.content_type,
    ds.priority,
    mt.title,
    mt.body,
    mt.highlight,
    mt.style_config,
    ds.content_data
  FROM display_state ds
  LEFT JOIN message_templates mt ON ds.template_id = mt.id
  WHERE ds.display_id = p_display_id
    AND (ds.start_at IS NULL OR ds.start_at <= NOW())
    AND (ds.end_at IS NULL OR ds.end_at >= NOW())
  ORDER BY ds.priority DESC, ds.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_current_content IS '전광판의 현재 송출 콘텐츠 조회 (우선순위 적용)';
```

---

### 6.2 get_send_statistics (송출 통계)

```sql
-- 송출 이력 통계 조회
CREATE OR REPLACE FUNCTION get_send_statistics(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_sends BIGINT,
  notice_sends BIGINT,
  emergency_sends BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_sends,
    COUNT(*) FILTER (WHERE action = 'SEND') AS notice_sends,
    COUNT(*) FILTER (WHERE action = 'EMERGENCY_SEND') AS emergency_sends
  FROM audit_logs
  WHERE action IN ('SEND', 'EMERGENCY_SEND')
    AND created_at >= start_date
    AND created_at <= end_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_send_statistics IS '송출 이력 통계 (기간별)';
```

---

### 6.3 get_collection_success_rate (데이터 수집 성공률)

```sql
-- 데이터 수집 성공률 조회
CREATE OR REPLACE FUNCTION get_collection_success_rate(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  data_type TEXT,
  total_attempts BIGINT,
  success_count BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.data_type,
    COUNT(*) AS total_attempts,
    COUNT(*) FILTER (WHERE r.collected_at IS NOT NULL) AS success_count,
    ROUND(
      COUNT(*) FILTER (WHERE r.collected_at IS NOT NULL) * 100.0 / COUNT(*),
      2
    ) AS success_rate
  FROM weather_air_quality_readings r
  WHERE r.created_at >= start_date
    AND r.created_at <= end_date
  GROUP BY r.data_type;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_collection_success_rate IS '데이터 수집 성공률 (기간별)';
```

---

## 7. 초기 데이터 삽입

### 7.1 weather_stations 샘플 데이터

```sql
-- 고양시 기상청 측정소 초기 데이터
INSERT INTO weather_stations (name, nx, ny, region) VALUES
  ('고양시청', 59, 127, '경기 고양시'),
  ('일산동구', 60, 127, '경기 고양시 일산동구'),
  ('일산서구', 59, 128, '경기 고양시 일산서구'),
  ('덕양구', 58, 127, '경기 고양시 덕양구')
ON CONFLICT (name) DO NOTHING;
```

---

### 7.2 air_stations 샘플 데이터

```sql
-- 고양시 대기질 측정소 초기 데이터
INSERT INTO air_stations (station_name, addr, dm_x, dm_y, sido, sigungu) VALUES
  ('일산동구', '경기도 고양시 일산동구 중산동', 126.7719, 37.6583, '경기', '고양시'),
  ('일산서구', '경기도 고양시 일산서구 주엽동', 126.7586, 37.6719, '경기', '고양시'),
  ('덕양구', '경기도 고양시 덕양구 행신동', 126.8330, 37.6344, '경기', '고양시')
ON CONFLICT (station_name) DO NOTHING;
```

---

### 7.3 샘플 전광판 및 설정

```sql
-- 샘플 전광판 (테스트용)
INSERT INTO displays (name, location, width, height, group_name, is_active) VALUES
  ('공원 정문 전광판', '고양시 체육공원 정문', 1920, 1080, '체육공원', true),
  ('공원 후문 전광판', '고양시 체육공원 후문', 1920, 1080, '체육공원', true)
ON CONFLICT (name) DO NOTHING;

-- 샘플 전광판 설정
INSERT INTO display_config (display_id, weather_station_id, air_station_id)
SELECT
  d.id,
  (SELECT id FROM weather_stations WHERE name = '일산동구' LIMIT 1),
  (SELECT id FROM air_stations WHERE station_name = '일산동구' LIMIT 1)
FROM displays d
WHERE d.name IN ('공원 정문 전광판', '공원 후문 전광판')
ON CONFLICT (display_id) DO NOTHING;
```

---

## 8. 데이터 정리 (Cleanup)

### 8.1 오래된 데이터 자동 삭제 함수

```sql
-- 7일 이상 된 수집 데이터 삭제
CREATE OR REPLACE FUNCTION cleanup_old_readings()
RETURNS void AS $$
BEGIN
  DELETE FROM weather_air_quality_readings
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_readings IS '7일 이상 된 수집 데이터 삭제 (Edge Function에서 호출)';
```

---

### 8.2 1년 이상 된 감사 로그 삭제 함수

```sql
-- 1년 이상 된 감사 로그 삭제
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_audit_logs IS '1년 이상 된 감사 로그 삭제 (Edge Function에서 호출)';
```

---

## 9. 마이그레이션 검증

### 9.1 테이블 존재 확인

```sql
-- 모든 테이블이 생성되었는지 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 예상 결과:
-- air_stations
-- audit_logs
-- display_config
-- display_state
-- displays
-- message_templates
-- schedules
-- weather_air_quality_readings
-- weather_stations
```

---

### 9.2 RLS 정책 확인

```sql
-- RLS가 활성화된 테이블 확인
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- 모든 테이블이 rowsecurity = true 여야 함
```

---

### 9.3 트리거 확인

```sql
-- 트리거 목록 확인
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 예상 결과: trg_displays_updated_at, trg_template_version 등
```

---

## 10. 롤백 스크립트 (주의!)

### 10.1 전체 테이블 삭제 (개발 환경 전용)

```sql
-- ⚠️ 경고: 모든 데이터가 삭제됩니다!
-- 실제 운영 환경에서는 절대 실행하지 마세요.

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS weather_air_quality_readings CASCADE;
DROP TABLE IF EXISTS display_state CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS message_templates CASCADE;
DROP TABLE IF EXISTS display_config CASCADE;
DROP TABLE IF EXISTS air_stations CASCADE;
DROP TABLE IF EXISTS weather_stations CASCADE;
DROP TABLE IF EXISTS displays CASCADE;

DROP VIEW IF EXISTS v_current_display_content CASCADE;
DROP VIEW IF EXISTS v_latest_weather_air_quality CASCADE;

DROP FUNCTION IF EXISTS update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS increment_template_version() CASCADE;
DROP FUNCTION IF EXISTS validate_priority() CASCADE;
DROP FUNCTION IF EXISTS get_current_content(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_send_statistics(TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS get_collection_success_rate(TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_readings() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_audit_logs() CASCADE;
```

---

## 11. 문서 히스토리

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0.0 | 2024-12-16 | 프로젝트팀 | 초안 작성 (완성형) |

---

**이전 문서**: [04_ci_cd.md](./04_ci_cd.md)  
**다음 문서**: [../06_testing/01_test_plan.md](../06_testing/01_test_plan.md)
