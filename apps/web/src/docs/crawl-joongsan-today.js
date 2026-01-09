/**
 * 고양시 인조잔디구장 '중산' 경기 데이터 크롤러
 * 
 * 실행 방법:
 * 1. 필요한 패키지 설치:
 *    npm install axios cheerio iconv-lite @supabase/supabase-js
 * 
 * 2. 환경변수 설정 (.env 파일):
 *    SUPABASE_URL=https://your-project.supabase.co
 *    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 * 
 * 3. 실행:
 *    node crawl-joongsan-today.js
 * 
 * 4. Cron 설정 (매일 오전 6시 실행):
 *    0 6 * * * /usr/bin/node /path/to/crawl-joongsan-today.js >> /var/log/crawl-joongsan.log 2>&1
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const { createClient } = require('@supabase/supabase-js');

// 환경변수 확인
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경변수가 설정되지 않았습니다: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 설정
const TARGET_URL = 'https://e-soccer.gys.or.kr/';
const STADIUM_NAME = '중산';
const SELECTOR_UL = 'ul#ulMainGame3';

/**
 * 오늘 날짜를 YYYYMMDD 형식으로 반환
 */
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * span.date에서 시간대와 duration_text 분리
 * 예: "10시 ~ 13시 (3시간)" -> { timeRange: "10시 ~ 13시", duration: "3시간" }
 */
function parseTimeInfo(dateText) {
  if (!dateText) return { timeRange: null, duration: null };
  
  // "10시 ~ 13시 (3시간)" 형식 파싱
  const match = dateText.match(/^(.+?)\s*\((.+?)\)\s*$/);
  
  if (match) {
    return {
      timeRange: match[1].trim(),
      duration: match[2].trim()
    };
  }
  
  // 괄호가 없는 경우 전체를 시간대로 처리
  return {
    timeRange: dateText.trim(),
    duration: null
  };
}

/**
 * HTML 가져오기 (EUC-KR 디코딩)
 */
async function fetchHTML(url) {
  try {
    console.log(`📡 Fetching HTML from: ${url}`);
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // EUC-KR -> UTF-8 디코딩
    const html = iconv.decode(Buffer.from(response.data), 'euc-kr');
    console.log(`✅ HTML fetched successfully (${html.length} chars)`);
    
    return html;
  } catch (error) {
    console.error('❌ Failed to fetch HTML:', error.message);
    throw error;
  }
}

/**
 * '중산' 탭 데이터 파싱
 */
function parseJoongsanTab(html) {
  const $ = cheerio.load(html);
  const matches = [];
  
  // ul#ulMainGame3 > li 순회
  const listItems = $(SELECTOR_UL).find('li');
  console.log(`📋 Found ${listItems.length} items in ${SELECTOR_UL}`);
  
  listItems.each((index, element) => {
    const $li = $(element);
    
    // span.title에서 팀명/동호회명 추출
    const $title = $li.find('span.title');
    let clubName = null;
    let clubUrl = null;
    
    if ($title.length > 0) {
      // a 태그가 있으면 href 추출
      const $link = $title.find('a');
      if ($link.length > 0) {
        clubName = $link.text().trim();
        const href = $link.attr('href');
        if (href && !href.startsWith('javascript:')) {
          clubUrl = href.startsWith('http') ? href : `${TARGET_URL}${href}`;
        }
      } else {
        clubName = $title.text().trim();
      }
    }
    
    // span.date에서 시간대/시간 추출
    const $date = $li.find('span.date');
    const dateText = $date.text().trim();
    const { timeRange, duration } = parseTimeInfo(dateText);
    
    // 유효성 검사
    if (!timeRange) {
      console.log(`⚠️  Item ${index + 1}: No time_range found, skipping`);
      return; // continue
    }
    
    // club_name이 비어있는 경우 처리
    // 옵션 1: null로 저장
    // 옵션 2: 저장 제외 (아래 주석 해제)
    // if (!clubName || clubName === '') {
    //   console.log(`⚠️  Item ${index + 1}: No club_name, skipping`);
    //   return;
    // }
    
    matches.push({
      clubName: clubName || null,
      clubUrl: clubUrl || null,
      timeRange,
      duration: duration || null
    });
    
    console.log(`  ✓ Item ${index + 1}: ${clubName || '(empty)'} | ${timeRange} | ${duration || 'N/A'}`);
  });
  
  return matches;
}

/**
 * Supabase에 업서트
 */
async function upsertToSupabase(matches) {
  if (matches.length === 0) {
    console.log('⚠️  No matches to upsert');
    return { success: 0, failed: 0 };
  }
  
  const todayString = getTodayString();
  const todayDate = getTodayDate();
  
  const records = matches.map(match => {
    const matchKey = `${todayString}|${match.timeRange}|${STADIUM_NAME}`;
    
    return {
      match_key: matchKey,
      match_date: todayDate,
      stadium: STADIUM_NAME,
      time_range: match.timeRange,
      duration_text: match.duration,
      club_name: match.clubName,
      club_url: match.clubUrl,
      source_url: TARGET_URL,
      fetched_at: new Date().toISOString()
    };
  });
  
  console.log(`\n💾 Upserting ${records.length} records to Supabase...`);
  
  let successCount = 0;
  let failedCount = 0;
  
  // 개별 upsert (에러 추적 용이)
  for (const record of records) {
    const { error } = await supabase
      .from('today_matches')
      .upsert(record, { onConflict: 'match_key' });
    
    if (error) {
      console.error(`  ❌ Failed to upsert ${record.match_key}:`, error.message);
      failedCount++;
    } else {
      console.log(`  ✓ Upserted: ${record.match_key}`);
      successCount++;
    }
  }
  
  console.log(`\n✅ Upsert complete: ${successCount} success, ${failedCount} failed`);
  
  return { success: successCount, failed: failedCount };
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('========================================');
  console.log('🏟️  고양시 인조잔디구장 중산 경기 크롤러');
  console.log(`📅 Date: ${getTodayDate()}`);
  console.log(`🕐 Time: ${new Date().toLocaleString('ko-KR')}`);
  console.log('========================================\n');
  
  try {
    // 1. HTML 가져오기
    const html = await fetchHTML(TARGET_URL);
    
    // 2. '중산' 탭 파싱
    const matches = parseJoongsanTab(html);
    console.log(`\n📊 Parsed ${matches.length} matches from '중산' tab`);
    
    // 3. Supabase에 업서트
    const result = await upsertToSupabase(matches);
    
    console.log('\n========================================');
    console.log('✅ Crawling completed successfully!');
    console.log(`   - Total parsed: ${matches.length}`);
    console.log(`   - Upserted: ${result.success}`);
    console.log(`   - Failed: ${result.failed}`);
    console.log('========================================\n');
    
    process.exit(result.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ Crawling failed:', error.message);
    console.error('========================================\n');
    console.error(error.stack);
    process.exit(1);
  }
}

// 실행
if (require.main === module) {
  main();
}

module.exports = { main, parseJoongsanTab, parseTimeInfo };
