-- ================================================
-- 고양시 인조잔디구장 '중산' 경기 데이터 테이블
-- ================================================

-- 테이블 생성
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

-- 인덱스 생성 (날짜 + 구장으로 자주 조회)
CREATE INDEX IF NOT EXISTS idx_today_matches_date_stadium 
  ON today_matches(match_date, stadium);

-- 최신 업데이트 순 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_today_matches_fetched_at 
  ON today_matches(fetched_at DESC);

-- 코멘트 추가
COMMENT ON TABLE today_matches IS '고양시 인조잔디구장 오늘의 경기 데이터';
COMMENT ON COLUMN today_matches.match_key IS '유니크 키: YYYYMMDD|시간대|중산';
COMMENT ON COLUMN today_matches.match_date IS '경기 날짜';
COMMENT ON COLUMN today_matches.stadium IS '구장명 (기본값: 중산)';
COMMENT ON COLUMN today_matches.time_range IS '시간대 (예: 10시 ~ 13시)';
COMMENT ON COLUMN today_matches.duration_text IS '경기 시간 (예: 3시간)';
COMMENT ON COLUMN today_matches.club_name IS '팀명/동호회명 (비어있을 수 있음)';
COMMENT ON COLUMN today_matches.club_url IS '팀/동호회 URL (있을 경우)';
COMMENT ON COLUMN today_matches.source_url IS '데이터 출처 URL';
COMMENT ON COLUMN today_matches.fetched_at IS '데이터 수집 시각';

-- ================================================
-- 검증용 조회 쿼리
-- ================================================

-- 오늘 날짜 기준 중산 경기 조회
SELECT 
  match_key,
  match_date,
  time_range,
  duration_text,
  club_name,
  club_url,
  fetched_at
FROM today_matches
WHERE match_date = CURRENT_DATE
  AND stadium = '중산'
ORDER BY time_range;

-- 최근 수집된 데이터 확인 (최근 24시간)
SELECT 
  match_date,
  COUNT(*) as match_count,
  MAX(fetched_at) as last_fetched
FROM today_matches
WHERE fetched_at > NOW() - INTERVAL '24 hours'
  AND stadium = '중산'
GROUP BY match_date
ORDER BY match_date DESC;

-- 전체 통계
SELECT 
  match_date,
  COUNT(*) as total_matches,
  COUNT(club_name) as matches_with_club,
  COUNT(club_url) as matches_with_url
FROM today_matches
WHERE stadium = '중산'
GROUP BY match_date
ORDER BY match_date DESC
LIMIT 10;
