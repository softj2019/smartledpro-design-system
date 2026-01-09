-- ================================================================
-- AirKorea 공기질 자동 수집 스케줄 등록
-- ================================================================

-- 매시간 정각(XX:00)에 공기질 데이터 자동 수집
INSERT INTO auto_crawl_schedules_5231839f (
  schedule_name,
  cron_expression,
  enabled,
  created_at,
  updated_at
) VALUES (
  'AirKorea 공기질 데이터 수집',
  '0 * * * *',  -- 매시간 정각 (0분)
  true,
  now(),
  now()
)
ON CONFLICT (schedule_name) DO UPDATE SET
  cron_expression = EXCLUDED.cron_expression,
  enabled = EXCLUDED.enabled,
  updated_at = now();

COMMENT ON TABLE auto_crawl_schedules_5231839f IS '자동 크롤링/수집 스케줄 관리 (중산 경기일정 + AirKorea 공기질)';
