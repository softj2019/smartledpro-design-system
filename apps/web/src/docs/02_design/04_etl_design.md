# 데이터 수집(ETL) 설계

---

## 1. ETL 개요

### 1.1 목적
- 기상청 및 AirKorea의 **실시간 데이터** 자동 수집
- 전광판별 **개별 측정소** 데이터 수집
- API 실패 시 **안정적 Fallback** 처리
- 수집 성공률 **95% 이상** 달성

### 1.2 ETL 구조
```
Extract (추출)
├─ 기상청 단기예보 API
└─ AirKorea 대기질 API

Transform (변환)
├─ API 응답 → DB 스키마 매핑
├─ 하늘상태 코드 → 텍스트 변환
└─ 에러 데이터 필터링

Load (적재)
├─ weather_air_quality_readings INSERT
├─ collection_status UPDATE
└─ audit_logs 기록
```

---

## 2. 수집 아키텍처

### 2.1 실행 환경
```
Supabase Edge Functions (Deno Runtime)
├─ collect-weather-data
├─ collect-air-quality-data
└─ update-collection-status
```

### 2.2 스케줄링
```bash
# Supabase Cron Job 설정
0 * * * *  collect-weather-data       # 매시 정각
0 * * * *  collect-air-quality-data   # 매시 정각
*/10 * * * *  update-collection-status # 10분마다
```

---

## 3. Extract (추출) 단계

### 3.1 활성 전광판 및 측정소 조회
```typescript
// Edge Function: collect-weather-data.ts
export async function getActiveDisplaysWithStations() {
  const { data, error } = await supabaseClient
    .from('displays')
    .select(`
      id,
      name,
      display_config (
        air_station_id,
        weather_station_id,
        air_stations (station_name, sido, sigungu),
        weather_stations (nx, ny, station_name)
      )
    `)
    .eq('status', 'active');
  
  if (error) throw error;
  return data;
}
```

**결과 예시**:
```json
[
  {
    "id": "display-uuid-1",
    "name": "축구장 입구",
    "display_config": {
      "air_stations": { "station_name": "정발산동" },
      "weather_stations": { "nx": 60, "ny": 127 }
    }
  }
]
```

### 3.2 기상청 API 호출
```typescript
async function fetchWeatherAPI(nx: number, ny: number) {
  const WEATHER_API_KEY = Deno.env.get('WEATHER_API_KEY');
  const baseDate = formatDate(new Date()); // YYYYMMDD
  const baseTime = getBaseTime(new Date()); // 0200, 0500, 0800, ...
  
  const url = new URL('http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst');
  url.searchParams.append('serviceKey', WEATHER_API_KEY);
  url.searchParams.append('numOfRows', '1000');
  url.searchParams.append('pageNo', '1');
  url.searchParams.append('dataType', 'JSON');
  url.searchParams.append('base_date', baseDate);
  url.searchParams.append('base_time', baseTime);
  url.searchParams.append('nx', String(nx));
  url.searchParams.append('ny', String(ny));
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const json = await response.json();
  return json.response.body.items.item;
}
```

### 3.3 AirKorea API 호출
```typescript
async function fetchAirKoreaAPI(stationName: string) {
  const AIRKOREA_API_KEY = Deno.env.get('AIRKOREA_API_KEY');
  
  const url = new URL('http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty');
  url.searchParams.append('serviceKey', AIRKOREA_API_KEY);
  url.searchParams.append('returnType', 'json');
  url.searchParams.append('numOfRows', '1');
  url.searchParams.append('pageNo', '1');
  url.searchParams.append('stationName', stationName);
  url.searchParams.append('dataTerm', 'DAILY');
  url.searchParams.append('ver', '1.3');
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const json = await response.json();
  return json.response.body.items[0];
}
```

---

## 4. Transform (변환) 단계

### 4.1 기상 데이터 변환
```typescript
interface WeatherData {
  temperature: number | null;
  sky_condition: string | null;
  precipitation_type: string | null;
  precipitation_prob: number | null;
  humidity: number | null;
}

function transformWeatherData(items: any[]): WeatherData {
  const result: WeatherData = {
    temperature: null,
    sky_condition: null,
    precipitation_type: null,
    precipitation_prob: null,
    humidity: null
  };
  
  for (const item of items) {
    switch (item.category) {
      case 'TMP':
        result.temperature = parseFloat(item.fcstValue);
        break;
      case 'SKY':
        result.sky_condition = transformSkyCode(item.fcstValue);
        break;
      case 'PTY':
        result.precipitation_type = transformPTYCode(item.fcstValue);
        break;
      case 'POP':
        result.precipitation_prob = parseInt(item.fcstValue);
        break;
      case 'REH':
        result.humidity = parseInt(item.fcstValue);
        break;
    }
  }
  
  return result;
}

function transformSkyCode(code: string): string {
  switch (code) {
    case '1': return '맑음';
    case '3': return '구름많음';
    case '4': return '흐림';
    default: return '알 수 없음';
  }
}

function transformPTYCode(code: string): string {
  switch (code) {
    case '0': return '없음';
    case '1': return '비';
    case '2': return '비/눈';
    case '3': return '눈';
    case '4': return '소나기';
    default: return '알 수 없음';
  }
}
```

### 4.2 공기질 데이터 변환
```typescript
interface AirQualityData {
  pm10: number | null;
  pm25: number | null;
  khai: number | null;
  khai_grade: number | null;
}

function transformAirQualityData(item: any): AirQualityData {
  return {
    pm10: item.pm10Value ? parseInt(item.pm10Value) : null,
    pm25: item.pm25Value ? parseInt(item.pm25Value) : null,
    khai: item.khaiValue ? parseInt(item.khaiValue) : null,
    khai_grade: item.khaiGrade ? parseInt(item.khaiGrade) : null
  };
}
```

---

## 5. Load (적재) 단계

### 5.1 데이터 삽입
```typescript
async function saveWeatherAirQualityData(
  displayId: string,
  weatherData: WeatherData,
  airQualityData: AirQualityData
) {
  const { data, error } = await supabaseClient
    .from('weather_air_quality_readings')
    .insert({
      display_id: displayId,
      temperature: weatherData.temperature,
      sky_condition: weatherData.sky_condition,
      precipitation_type: weatherData.precipitation_type,
      precipitation_prob: weatherData.precipitation_prob,
      humidity: weatherData.humidity,
      pm10: airQualityData.pm10,
      pm25: airQualityData.pm25,
      khai: airQualityData.khai,
      khai_grade: airQualityData.khai_grade,
      collected_at: new Date().toISOString(),
      weather_collected: weatherData.temperature !== null,
      air_quality_collected: airQualityData.pm10 !== null
    });
  
  if (error) throw error;
  return data;
}
```

### 5.2 측정소 상태 업데이트
```typescript
async function updateStationStatus(
  stationId: string,
  stationType: 'air' | 'weather',
  success: boolean
) {
  const tableName = stationType === 'air' ? 'air_stations' : 'weather_stations';
  
  const status = success ? 'active' : 'failed';
  const updateData = {
    collection_status: status,
    last_collected_at: new Date().toISOString()
  };
  
  await supabaseClient
    .from(tableName)
    .update(updateData)
    .eq('id', stationId);
}
```

---

## 6. 에러 처리 및 재시도

### 6.1 재시도 로직
```typescript
async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 5000
): Promise<T | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetcher();
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(`시도 ${attempt}/${maxRetries} 실패:`, error);
      
      if (attempt < maxRetries) {
        await sleep(delayMs);
      }
    }
  }
  
  console.error(`${maxRetries}회 재시도 모두 실패:`, lastError);
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 6.2 Fallback 전략
```typescript
async function getDisplayContent(displayId: string) {
  // 1. 최신 데이터 시도
  let data = await getLatestReading(displayId);
  
  // 2. 최신 데이터가 없으면 마지막 성공 데이터 사용
  if (!data || isTooOld(data.collected_at)) {
    data = await getLastSuccessfulReading(displayId);
  }
  
  // 3. 그마저도 없으면 기본 메시지
  if (!data) {
    return {
      type: 'FALLBACK',
      message: '데이터 수집 중입니다. 잠시만 기다려주세요.'
    };
  }
  
  return data;
}

function isTooOld(collectedAt: Date): boolean {
  const hoursSince = (Date.now() - collectedAt.getTime()) / (1000 * 60 * 60);
  return hoursSince > 3; // 3시간 이상이면 오래된 데이터
}
```

---

## 7. 통합 ETL 워크플로우

### 7.1 메인 Edge Function
```typescript
// supabase/functions/collect-weather-air-quality/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // 1. 활성 전광판 조회
    const displays = await getActiveDisplaysWithStations();
    console.log(`활성 전광판 ${displays.length}개 발견`);
    
    const results = [];
    
    // 2. 각 전광판별 데이터 수집
    for (const display of displays) {
      const result = {
        display_id: display.id,
        display_name: display.name,
        weather_success: false,
        air_quality_success: false,
        error: null
      };
      
      // 2-1. 기상 데이터 수집
      try {
        const weatherItems = await fetchWithRetry(
          () => fetchWeatherAPI(
            display.display_config.weather_stations.nx,
            display.display_config.weather_stations.ny
          )
        );
        
        if (weatherItems) {
          const weatherData = transformWeatherData(weatherItems);
          result.weather_success = true;
          
          // 2-2. 공기질 데이터 수집
          const airItem = await fetchWithRetry(
            () => fetchAirKoreaAPI(
              display.display_config.air_stations.station_name
            )
          );
          
          if (airItem) {
            const airQualityData = transformAirQualityData(airItem);
            result.air_quality_success = true;
            
            // 2-3. 데이터 저장
            await saveWeatherAirQualityData(
              display.id,
              weatherData,
              airQualityData
            );
          }
        }
      } catch (error) {
        result.error = (error as Error).message;
        console.error(`전광판 ${display.name} 수집 실패:`, error);
      }
      
      // 2-4. 측정소 상태 업데이트
      await updateStationStatus(
        display.display_config.weather_station_id,
        'weather',
        result.weather_success
      );
      await updateStationStatus(
        display.display_config.air_station_id,
        'air',
        result.air_quality_success
      );
      
      results.push(result);
    }
    
    // 3. 감사 로그 기록
    await supabaseClient.from('audit_logs').insert({
      user_id: null, // 시스템 작업
      action: 'data_collection_completed',
      target_type: 'system',
      metadata: {
        total: displays.length,
        success: results.filter(r => r.weather_success && r.air_quality_success).length,
        partial: results.filter(r => r.weather_success || r.air_quality_success).length,
        failed: results.filter(r => !r.weather_success && !r.air_quality_success).length
      }
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      { headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error('ETL 프로세스 실패:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

## 8. 모니터링 및 알림

### 8.1 수집 성공률 계산
```sql
-- 최근 24시간 수집 성공률
SELECT
  COUNT(*) FILTER (WHERE weather_collected = true) * 100.0 / COUNT(*) AS weather_success_rate,
  COUNT(*) FILTER (WHERE air_quality_collected = true) * 100.0 / COUNT(*) AS air_quality_success_rate
FROM weather_air_quality_readings
WHERE collected_at >= NOW() - INTERVAL '24 hours';
```

### 8.2 실패 알림 (선택)
```typescript
async function sendFailureAlert(displayName: string, failureType: string) {
  // Slack Webhook, Email 등으로 알림
  await fetch('https://hooks.slack.com/services/...', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `⚠️ [${displayName}] ${failureType} 데이터 수집 실패`
    })
  });
}
```

---

## 9. 성능 최적화

### 9.1 병렬 처리
```typescript
// 전광판별 병렬 수집
const results = await Promise.all(
  displays.map(display => collectDisplayData(display))
);
```

### 9.2 캐싱 전략
```typescript
// 동일 측정소 중복 호출 방지
const weatherCache = new Map<string, WeatherData>();

async function fetchWeatherWithCache(nx: number, ny: number) {
  const cacheKey = `${nx},${ny}`;
  
  if (weatherCache.has(cacheKey)) {
    console.log('캐시 히트:', cacheKey);
    return weatherCache.get(cacheKey);
  }
  
  const data = await fetchWeatherAPI(nx, ny);
  weatherCache.set(cacheKey, data);
  return data;
}
```

---

## 10. 테스트 계획

### 10.1 단위 테스트
```typescript
// 데이터 변환 테스트
Deno.test("transformSkyCode - 맑음", () => {
  assertEquals(transformSkyCode('1'), '맑음');
});

Deno.test("transformPTYCode - 비", () => {
  assertEquals(transformPTYCode('1'), '비');
});
```

### 10.2 통합 테스트
- [ ] 실제 API 호출 성공
- [ ] 재시도 로직 정상 작동
- [ ] Fallback 데이터 반환
- [ ] DB 저장 성공

### 10.3 실증 테스트
- [ ] 1주일 연속 수집 성공률 95% 이상
- [ ] API 장애 시 Fallback 작동 확인

---

**다음 문서**: [05_auth_rbac_rls.md](./05_auth_rbac_rls.md) - 권한 및 보안 설계
