-- ================================================================
-- AirKorea 공기질 데이터 수집 시스템 - DB 스키마
-- ================================================================

-- [Table] air_station_settings
-- 목적: Primary/Secondary 측정소 설정
CREATE TABLE IF NOT EXISTS air_station_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'GOYANG',
  priority int NOT NULL CHECK (priority IN (1, 2)),
  station_name text NOT NULL,
  addr text,
  mang_name text,
  dm_x numeric,
  dm_y numeric,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scope, priority)
);

COMMENT ON TABLE air_station_settings IS 'AirKorea 측정소 설정 (Primary/Secondary)';
COMMENT ON COLUMN air_station_settings.id IS '고유 ID';
COMMENT ON COLUMN air_station_settings.scope IS '지역 범위 (기본: GOYANG)';
COMMENT ON COLUMN air_station_settings.priority IS '우선순위 (1=Primary, 2=Secondary)';
COMMENT ON COLUMN air_station_settings.station_name IS '측정소명';
COMMENT ON COLUMN air_station_settings.addr IS '측정소 주소';
COMMENT ON COLUMN air_station_settings.mang_name IS '관리기관명';
COMMENT ON COLUMN air_station_settings.dm_x IS '측정소 X 좌표';
COMMENT ON COLUMN air_station_settings.dm_y IS '측정소 Y 좌표';
COMMENT ON COLUMN air_station_settings.enabled IS '활성화 여부 (false면 수집 제외)';
COMMENT ON COLUMN air_station_settings.updated_at IS '최종 수정 시각';

-- [Table] air_quality_hourly
-- 목적: 시간별 최신 1건 저장(중복 방지)
CREATE TABLE IF NOT EXISTS air_quality_hourly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'GOYANG',
  station_name text NOT NULL,
  station_code text,
  data_time timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  source_priority int CHECK (source_priority IN (1, 2)),
  -- 통합대기환경지수
  khai_value text,
  khai_grade text,
  -- 미세먼지(PM10)
  pm10_value text,
  pm10_grade text,
  -- 초미세먼지(PM2.5)
  pm25_value text,
  pm25_grade text,
  -- 아황산가스(SO2)
  so2_value text,
  so2_grade text,
  -- 일산화탄소(CO)
  co_value text,
  co_grade text,
  -- 오존(O3)
  o3_value text,
  o3_grade text,
  -- 이산화질소(NO2)
  no2_value text,
  no2_grade text,
  -- 원본 데이터
  raw jsonb,
  UNIQUE(scope, station_name, data_time)
);

COMMENT ON TABLE air_quality_hourly IS 'AirKorea 시간별 공기질 데이터 (중복 방지)';
COMMENT ON COLUMN air_quality_hourly.id IS '고유 ID';
COMMENT ON COLUMN air_quality_hourly.scope IS '지역 범위';
COMMENT ON COLUMN air_quality_hourly.station_name IS '측정소명';
COMMENT ON COLUMN air_quality_hourly.station_code IS '측정소 코드';
COMMENT ON COLUMN air_quality_hourly.data_time IS '측정 시각 (KST)';
COMMENT ON COLUMN air_quality_hourly.fetched_at IS '수집 시각';
COMMENT ON COLUMN air_quality_hourly.source_priority IS '수집 출처 우선순위 (1=Primary, 2=Secondary)';
COMMENT ON COLUMN air_quality_hourly.khai_value IS '통합대기환경지수 수치';
COMMENT ON COLUMN air_quality_hourly.khai_grade IS '통합대기환경지수 등급 (1=좋음, 2=보통, 3=나쁨, 4=매우나쁨)';
COMMENT ON COLUMN air_quality_hourly.pm10_value IS '미세먼지(PM10) 수치 (㎍/㎥)';
COMMENT ON COLUMN air_quality_hourly.pm10_grade IS '미세먼지(PM10) 등급';
COMMENT ON COLUMN air_quality_hourly.pm25_value IS '초미세먼지(PM2.5) 수치 (㎍/㎥)';
COMMENT ON COLUMN air_quality_hourly.pm25_grade IS '초미세먼지(PM2.5) 등급';
COMMENT ON COLUMN air_quality_hourly.so2_value IS '아황산가스(SO2) 수치 (ppm)';
COMMENT ON COLUMN air_quality_hourly.so2_grade IS '아황산가스(SO2) 등급';
COMMENT ON COLUMN air_quality_hourly.co_value IS '일산화탄소(CO) 수치 (ppm)';
COMMENT ON COLUMN air_quality_hourly.co_grade IS '일산화탄소(CO) 등급';
COMMENT ON COLUMN air_quality_hourly.o3_value IS '오존(O3) 수치 (ppm)';
COMMENT ON COLUMN air_quality_hourly.o3_grade IS '오존(O3) 등급';
COMMENT ON COLUMN air_quality_hourly.no2_value IS '이산화질소(NO2) 수치 (ppm)';
COMMENT ON COLUMN air_quality_hourly.no2_grade IS '이산화질소(NO2) 등급';
COMMENT ON COLUMN air_quality_hourly.raw IS '원본 JSON 데이터';

-- [Table] air_collect_logs
-- 목적: 수집 시도/폴백/실패 원인 기록
CREATE TABLE IF NOT EXISTS air_collect_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'GOYANG',
  run_at timestamptz NOT NULL DEFAULT now(),
  tried jsonb NOT NULL,  -- [{priority, stationName, ok, reason, httpStatus, elapsedMs}]
  success boolean NOT NULL DEFAULT false,
  selected_priority int,
  selected_station_name text,
  selected_data_time timestamptz,
  message text
);

COMMENT ON TABLE air_collect_logs IS 'AirKorea 데이터 수집 시도/폴백/실패 로그';
COMMENT ON COLUMN air_collect_logs.id IS '고유 ID';
COMMENT ON COLUMN air_collect_logs.scope IS '지역 범위';
COMMENT ON COLUMN air_collect_logs.run_at IS '수집 실행 시각';
COMMENT ON COLUMN air_collect_logs.tried IS '시도 목록 JSON [{priority, stationName, ok, reason, httpStatus, elapsedMs}]';
COMMENT ON COLUMN air_collect_logs.success IS '수집 성공 여부';
COMMENT ON COLUMN air_collect_logs.selected_priority IS '성공한 측정소의 우선순위 (1 or 2)';
COMMENT ON COLUMN air_collect_logs.selected_station_name IS '성공한 측정소명';
COMMENT ON COLUMN air_collect_logs.selected_data_time IS '수집된 데이터의 측정 시각';
COMMENT ON COLUMN air_collect_logs.message IS '수집 결과 메시지';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_air_quality_hourly_scope_station ON air_quality_hourly(scope, station_name, data_time DESC);
CREATE INDEX IF NOT EXISTS idx_air_collect_logs_scope_run_at ON air_collect_logs(scope, run_at DESC);
CREATE INDEX IF NOT EXISTS idx_air_station_settings_scope_priority ON air_station_settings(scope, priority);

COMMENT ON INDEX idx_air_quality_hourly_scope_station IS '공기질 데이터 조회 성능 최적화 (scope + station_name + 최신순)';
COMMENT ON INDEX idx_air_collect_logs_scope_run_at IS '수집 로그 조회 성능 최적화 (scope + 최신순)';
COMMENT ON INDEX idx_air_station_settings_scope_priority IS '측정소 설정 조회 성능 최적화 (scope + priority)';