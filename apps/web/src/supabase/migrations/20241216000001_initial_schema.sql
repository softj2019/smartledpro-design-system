-- ================================================================
-- Supabase Initial Schema Migration
-- Project: 고양 스마트시티 리빙랩 - 전광판 송출 시스템
-- Version: v1.0.0
-- Date: 2024-12-16
-- ================================================================

-- ================================================================
-- 1. TABLES
-- ================================================================

-- 1.1 displays (전광판)
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

COMMENT ON TABLE displays IS '전광판 기본 정보';
COMMENT ON COLUMN displays.name IS '전광판 고유 이름 (예: 공원 정문 전광판)';
COMMENT ON COLUMN displays.width IS '전광판 가로 해상도 (px)';
COMMENT ON COLUMN displays.height IS '전광판 세로 해상도 (px)';

-- 1.2 weather_stations (기상청 측정소)
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

COMMENT ON TABLE weather_stations IS '기상청 단기예보 API 좌표 관리';

-- 1.3 air_stations (대기질 측정소)
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

COMMENT ON TABLE air_stations IS 'AirKorea API 측정소 메타데이터';

-- 1.4 display_config (전광판 설정)
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

COMMENT ON TABLE display_config IS '전광판별 개별 설정';

-- 1.5 message_templates (메시지 템플릿)
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

COMMENT ON TABLE message_templates IS 'NOTICE/EMERGENCY 콘텐츠 템플릿';

-- 1.6 schedules (송출 스케줄)
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

COMMENT ON TABLE schedules IS '예약/반복 송출 스케줄';

-- 1.7 display_state (전광판 현재 상태)
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

COMMENT ON TABLE display_state IS '전광판별 현재 송출 상태';

-- 1.8 weather_air_quality_readings (날씨·대기질 수집 데이터)
CREATE TABLE IF NOT EXISTS weather_air_quality_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id UUID NOT NULL REFERENCES displays(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('WEATHER', 'AIR_QUALITY')),
  temperature DECIMAL(4, 1),
  precipitation_probability INTEGER,
  sky_condition TEXT,
  humidity INTEGER,
  wind_speed DECIMAL(4, 1),
  pm10_value INTEGER,
  pm10_grade INTEGER CHECK (pm10_grade BETWEEN 1 AND 4),
  pm25_value INTEGER,
  pm25_grade INTEGER CHECK (pm25_grade BETWEEN 1 AND 4),
  khai_value INTEGER,
  khai_grade INTEGER CHECK (khai_grade BETWEEN 1 AND 4),
  collected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE weather_air_quality_readings IS '공공데이터 API 수집 결과';

-- 1.9 audit_logs (감사 로그)
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

COMMENT ON TABLE audit_logs IS '모든 사용자 행위 추적 및 증빙';

-- ================================================================
-- 2. INDEXES
-- ================================================================

-- displays
CREATE INDEX IF NOT EXISTS idx_displays_active ON displays(is_active);
CREATE INDEX IF NOT EXISTS idx_displays_group ON displays(group_name);

-- weather_stations
CREATE INDEX IF NOT EXISTS idx_weather_stations_active ON weather_stations(is_active);

-- air_stations
CREATE INDEX IF NOT EXISTS idx_air_stations_sido ON air_stations(sido);
CREATE INDEX IF NOT EXISTS idx_air_stations_sigungu ON air_stations(sigungu);
CREATE INDEX IF NOT EXISTS idx_air_stations_name ON air_stations(station_name);

-- display_config
CREATE UNIQUE INDEX IF NOT EXISTS idx_display_config_display ON display_config(display_id);

-- message_templates
CREATE INDEX IF NOT EXISTS idx_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON message_templates(created_by);

-- schedules
CREATE INDEX IF NOT EXISTS idx_schedules_start_end ON schedules(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_schedules_display_ids ON schedules USING GIN(display_ids);

-- display_state (가장 중요한 인덱스)
CREATE INDEX IF NOT EXISTS idx_display_state_display_priority 
  ON display_state(display_id, priority DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_display_state_active 
  ON display_state(display_id, start_at, end_at);

-- weather_air_quality_readings
CREATE INDEX IF NOT EXISTS idx_readings_display_type_collected 
  ON weather_air_quality_readings(display_id, data_type, collected_at DESC);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ================================================================
-- 3. TRIGGERS
-- ================================================================

-- 3.1 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_displays_updated_at
BEFORE UPDATE ON displays
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_display_config_updated_at
BEFORE UPDATE ON display_config
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_message_templates_updated_at
BEFORE UPDATE ON message_templates
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_schedules_updated_at
BEFORE UPDATE ON schedules
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_display_state_updated_at
BEFORE UPDATE ON display_state
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 3.2 템플릿 버전 자동 증가
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

-- 3.3 우선순위 검증 (절대 규칙)
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

-- ================================================================
-- 4. VIEWS
-- ================================================================

-- 4.1 현재 송출 콘텐츠 뷰
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

-- 4.2 최신 날씨·대기질 뷰
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

-- ================================================================
-- 5. STORED PROCEDURES
-- ================================================================

-- 5.1 현재 송출 콘텐츠 조회
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

-- 5.2 송출 통계
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

-- 5.3 데이터 수집 성공률
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

-- 5.4 오래된 데이터 삭제
CREATE OR REPLACE FUNCTION cleanup_old_readings()
RETURNS void AS $$
BEGIN
  DELETE FROM weather_air_quality_readings
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 6. INITIAL DATA
-- ================================================================

-- 6.1 기상청 측정소 샘플 데이터
INSERT INTO weather_stations (name, nx, ny, region) VALUES
  ('고양시청', 59, 127, '경기 고양시'),
  ('일산동구', 60, 127, '경기 고양시 일산동구'),
  ('일산서구', 59, 128, '경기 고양시 일산서구'),
  ('덕양구', 58, 127, '경기 고양시 덕양구')
ON CONFLICT (name) DO NOTHING;

-- 6.2 대기질 측정소 샘플 데이터
INSERT INTO air_stations (station_name, addr, dm_x, dm_y, sido, sigungu) VALUES
  ('일산동구', '경기도 고양시 일산동구 중산동', 126.7719, 37.6583, '경기', '고양시'),
  ('일산서구', '경기도 고양시 일산서구 주엽동', 126.7586, 37.6719, '경기', '고양시'),
  ('덕양구', '경기도 고양시 덕양구 행신동', 126.8330, 37.6344, '경기', '고양시')
ON CONFLICT (station_name) DO NOTHING;

-- 6.3 샘플 전광판 (테스트용)
INSERT INTO displays (name, location, width, height, group_name, is_active) VALUES
  ('공원 정문 전광판', '고양시 체육공원 정문', 1920, 1080, '체육공원', true),
  ('공원 후문 전광판', '고양시 체육공원 후문', 1920, 1080, '체육공원', true)
ON CONFLICT (name) DO NOTHING;

-- 6.4 샘플 전광판 설정
INSERT INTO display_config (display_id, weather_station_id, air_station_id)
SELECT
  d.id,
  (SELECT id FROM weather_stations WHERE name = '일산동구' LIMIT 1),
  (SELECT id FROM air_stations WHERE station_name = '일산동구' LIMIT 1)
FROM displays d
WHERE d.name IN ('공원 정문 전광판', '공원 후문 전광판')
ON CONFLICT (display_id) DO NOTHING;

-- ================================================================
-- Migration Complete
-- ================================================================
