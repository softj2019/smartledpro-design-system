/**
 * 고양시 인조잔디구장 '중산' 경기 데이터 크롤러 (Edge Function)
 * 
 * 엔드포인트: POST /make-server-5231839f/crawl/joongsan-today
 * 
 * 사용 방법:
 * 1. 수동 실행:
 *    curl -X POST https://your-project.supabase.co/functions/v1/make-server-5231839f/crawl/joongsan-today \
 *      -H "Authorization: Bearer YOUR_ANON_KEY"
 * 
 * 2. Supabase Cron (pg_cron) 설정:
 *    SELECT cron.schedule(
 *      'crawl-joongsan-daily',
 *      '0 6 * * *',
 *      $$SELECT net.http_post(
 *        url:='https://your-project.supabase.co/functions/v1/make-server-5231839f/crawl/joongsan-today',
 *        headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
 *      ) AS request_id;$$
 *    );
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const TARGET_URL = 'https://e-soccer.gys.or.kr/';
const STADIUM_NAME = '중산';
const SELECTOR_UL = 'ul#ulMainGame3';

interface MatchData {
  clubName: string | null;
  clubUrl: string | null;
  timeRange: string;
  duration: string | null;
}

interface ParseResult {
  timeRange: string | null;
  duration: string | null;
}

/**
 * 오늘 날짜를 YYYYMMDD 형식으로 반환 (한국 시간 기준 UTC+9)
 */
function getTodayString(): string {
  const now = new Date();
  // ✅ 한국 시간(UTC+9)으로 변환
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = koreaTime.getUTCFullYear();
  const month = String(koreaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(koreaTime.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환 (한국 시간 기준 UTC+9)
 */
function getTodayDate(): string {
  const now = new Date();
  // ✅ 한국 시간(UTC+9)으로 변환
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = koreaTime.getUTCFullYear();
  const month = String(koreaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(koreaTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * span.date에서 시간대와 duration_text 분리
 */
function parseTimeInfo(dateText: string): ParseResult {
  if (!dateText) return { timeRange: null, duration: null };
  
  const match = dateText.match(/^(.+?)\s*\((.+?)\)\s*$/);
  
  if (match) {
    return {
      timeRange: match[1].trim(),
      duration: match[2].trim()
    };
  }
  
  return {
    timeRange: dateText.trim(),
    duration: null
  };
}

/**
 * "07시 ~ 10시" → { start: "07:00", end: "10:00" } 변환
 */
function parseTimeRange(timeRange: string): { start: string; end: string } | null {
  if (!timeRange || !timeRange.includes('~')) {
    return null;
  }
  
  const [startStr, endStr] = timeRange.split('~').map(t => t.trim());
  
  const convertToHHMM = (timeStr: string): string | null => {
    // "07시" → "07:00"
    if (timeStr.includes('시')) {
      const hour = timeStr.replace('시', '').trim();
      return `${hour.padStart(2, '0')}:00`;
    }
    
    // "07:00" 형식은 그대로 반환
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    
    return null;
  };
  
  const start = convertToHHMM(startStr);
  const end = convertToHHMM(endStr);
  
  if (!start || !end) {
    return null;
  }
  
  return { start, end };
}

/**
 * HTML에서 '중산' 탭 데이터 파싱 (정규식 기반)
 */
function parseJoongsanTab(html: string): MatchData[] {
  const matches: MatchData[] = [];
  
  // ul#ulMainGame3 찾기
  const ulMatch = html.match(/<ul[^>]*id=["']ulMainGame3["'][^>]*>([\s\S]*?)<\/ul>/i);
  if (!ulMatch) {
    console.error('❌ ul#ulMainGame3 not found in HTML');
    return matches;
  }
  
  const ulContent = ulMatch[1];
  
  // li 태그 모두 찾기
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const liMatches = ulContent.matchAll(liRegex);
  
  let index = 0;
  for (const liMatch of liMatches) {
    index++;
    const liContent = liMatch[1];
    
    // span.title 추출
    let clubName: string | null = null;
    let clubUrl: string | null = null;
    
    const titleMatch = liContent.match(/<span[^>]*class=["']title["'][^>]*>([\s\S]*?)<\/span>/i);
    if (titleMatch) {
      const titleContent = titleMatch[1];
      
      // a 태그가 있는지 확인
      const linkMatch = titleContent.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (linkMatch) {
        const href = linkMatch[1];
        clubName = linkMatch[2].replace(/<[^>]+>/g, '').trim();
        
        if (href && !href.startsWith('javascript:')) {
          clubUrl = href.startsWith('http') ? href : `${TARGET_URL}${href}`;
        }
      } else {
        clubName = titleContent.replace(/<[^>]+>/g, '').trim();
      }
    }
    
    // span.date 추출
    const dateMatch = liContent.match(/<span[^>]*class=["']date["'][^>]*>([\s\S]*?)<\/span>/i);
    let timeRange: string | null = null;
    let duration: string | null = null;
    
    if (dateMatch) {
      const dateText = dateMatch[1].replace(/<[^>]+>/g, '').trim();
      const parsed = parseTimeInfo(dateText);
      timeRange = parsed.timeRange;
      duration = parsed.duration;
    }
    
    // 유효성 검사
    if (!timeRange) {
      console.log(`⚠️  Item ${index}: No time_range found, skipping`);
      continue;
    }
    
    matches.push({
      clubName: clubName || null,
      clubUrl: clubUrl || null,
      timeRange,
      duration: duration || null
    });
    
    console.log(`  ✓ Item ${index}: ${clubName || '(empty)'} | ${timeRange} | ${duration || 'N/A'}`);
  }
  
  return matches;
}

/**
 * HTML 가져오기 (EUC-KR 처리)
 */
async function fetchHTML(url: string): Promise<string> {
  try {
    console.log(`📡 Fetching HTML from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // ArrayBuffer로 받기
    const buffer = await response.arrayBuffer();
    
    // EUC-KR 디코딩 시도
    try {
      const decoder = new TextDecoder('euc-kr');
      const html = decoder.decode(buffer);
      console.log(`✅ HTML fetched and decoded (${html.length} chars)`);
      return html;
    } catch (decodeError) {
      // EUC-KR 디코딩 실패 시 UTF-8로 fallback
      console.warn('⚠️  EUC-KR decoding failed, trying UTF-8');
      const decoder = new TextDecoder('utf-8');
      const html = decoder.decode(buffer);
      return html;
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch HTML:', error);
    throw error;
  }
}

/**
 * Supabase에 업서트
 */
async function upsertToSupabase(
  supabase: any,
  matches: MatchData[]
): Promise<{ success: number; failed: number }> {
  if (matches.length === 0) {
    console.log('⚠️  No matches to upsert');
    return { success: 0, failed: 0 };
  }
  
  // ✅ 기존 데이터 전체 삭제 (UUID 기반으로 변경되었으므로 매번 새로 삽입)
  console.log('🗑️  Deleting all existing data from today_matches...');
  const { error: deleteError } = await supabase
    .from('today_matches')
    .delete()
    .neq('match_key', '00000000-0000-0000-0000-000000000000'); // 모든 레코드 삭제
  
  if (deleteError) {
    console.error('❌ Failed to delete existing data:', deleteError.message);
  } else {
    console.log('✅ Existing data deleted successfully');
  }
  
  const todayDate = getTodayDate();
  
  const records = matches.map(match => {
    // ✅ 시작/종료 시간을 datetime 타입으로 변환
    const timeParsed = parseTimeRange(match.timeRange);
    let startTime: string | null = null;
    let endTime: string | null = null;
    
    if (timeParsed) {
      // "2025-12-21T07:00:00+09:00" 형식으로 변환
      startTime = `${todayDate}T${timeParsed.start}:00+09:00`;
      endTime = `${todayDate}T${timeParsed.end}:00+09:00`;
    }
    
    return {
      // ✅ match_key는 제외 (DB에서 gen_random_uuid()로 자동 생성)
      match_date: todayDate,
      stadium: STADIUM_NAME,
      time_range: match.timeRange,
      start_time: startTime,
      end_time: endTime,
      duration_text: match.duration,
      club_name: match.clubName,
      club_url: match.clubUrl,
      source_url: TARGET_URL,
      fetched_at: new Date().toISOString()
    };
  });
  
  console.log(`💾 Inserting ${records.length} new records to Supabase...`);
  
  let successCount = 0;
  let failedCount = 0;
  
  for (const record of records) {
    // ✅ DB에서 UUID 자동 생성 (DEFAULT gen_random_uuid())
    const { error } = await supabase
      .from('today_matches')
      .insert(record);
    
    if (error) {
      console.error(`  ❌ Failed to insert record:`, error.message);
      failedCount++;
    } else {
      console.log(`  ✓ Inserted: ${record.club_name} (${record.start_time} ~ ${record.end_time})`);
      successCount++;
    }
  }
  
  console.log(`✅ Insert complete: ${successCount} success, ${failedCount} failed`);
  
  return { success: successCount, failed: failedCount };
}

/**
 * 크롤러 메인 함수
 */
export async function crawlJoongsanToday(): Promise<{
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}> {
  console.log('========================================');
  console.log('🏟️  고양시 인조잔디구장 중산 경기 크롤러');
  console.log(`📅 Date: ${getTodayDate()}`);
  console.log(`🕐 Time: ${new Date().toISOString()}`);
  console.log('========================================');
  
  try {
    // Supabase 클라이언트 초기화
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // 1. HTML 가져오기
    const html = await fetchHTML(TARGET_URL);
    
    // 2. '중산' 탭 파싱
    const matches = parseJoongsanTab(html);
    console.log(`📊 Parsed ${matches.length} matches from '중산' tab`);
    
    // 3. Supabase에 업서트
    const result = await upsertToSupabase(supabase, matches);
    
    console.log('========================================');
    console.log('✅ Crawling completed successfully!');
    console.log(`   - Total parsed: ${matches.length}`);
    console.log(`   - Inserted: ${result.success}`);
    console.log(`   - Failed: ${result.failed}`);
    console.log('========================================');
    
    return {
      success: true,
      message: 'Crawling completed successfully',
      data: {
        date: getTodayDate(),
        totalParsed: matches.length,
        inserted: result.success,
        failed: result.failed,
        matches: matches
      }
    };
    
  } catch (error) {
    console.error('========================================');
    console.error('❌ Crawling failed:', error);
    console.error('========================================');
    
    return {
      success: false,
      message: 'Crawling failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}