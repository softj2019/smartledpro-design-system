// ================================================================
// Edge Function: collect-weather-data
// Description: 기상청 단기예보 API 호출 및 데이터 저장
// Schedule: Cron - 매 10분마다 실행
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEATHER_API_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";
const WEATHER_API_KEY = Deno.env.get("WEATHER_API_KEY");

interface WeatherItem {
  category: string;
  fcstValue: string;
}

interface WeatherData {
  temperature: number | null;
  precipitation_probability: number | null;
  sky_condition: string | null;
  humidity: number | null;
  wind_speed: number | null;
}

serve(async (req) => {
  try {
    console.log("Starting weather data collection...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. 활성 전광판 및 기상청 좌표 조회
    const { data: displays, error: displayError } = await supabase
      .from("displays")
      .select(`
        id,
        name,
        display_config!inner(
          id,
          weather_station_id,
          weather_stations!inner(nx, ny)
        )
      `)
      .eq("is_active", true);

    if (displayError) {
      throw new Error(`Failed to fetch displays: ${displayError.message}`);
    }

    console.log(`Found ${displays?.length || 0} active displays`);

    if (!displays || displays.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active displays found" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const results = [];

    // 2. 각 전광판별 기상청 API 호출
    for (const display of displays) {
      try {
        const config = display.display_config as any;
        const station = config.weather_stations;
        const { nx, ny } = station;

        console.log(`Fetching weather for display: ${display.name} (nx: ${nx}, ny: ${ny})`);

        const now = new Date();
        const baseDate = formatDate(now);
        const baseTime = getBaseTime(now);

        const params = new URLSearchParams({
          serviceKey: decodeURIComponent(WEATHER_API_KEY!),
          dataType: "JSON",
          numOfRows: "60",
          pageNo: "1",
          base_date: baseDate,
          base_time: baseTime,
          nx: nx.toString(),
          ny: ny.toString(),
        });

        const response = await fetch(`${WEATHER_API_URL}?${params}`, {
          signal: AbortSignal.timeout(10000), // 10초 타임아웃
        });

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (data.response.header.resultCode !== "00") {
          throw new Error(`API error: ${data.response.header.resultMsg}`);
        }

        const items = data.response.body.items?.item || [];
        const weatherData = parseWeatherItems(items);

        // 3. 데이터 저장
        const { error: insertError } = await supabase
          .from("weather_air_quality_readings")
          .insert({
            display_id: display.id,
            data_type: "WEATHER",
            temperature: weatherData.temperature,
            precipitation_probability: weatherData.precipitation_probability,
            sky_condition: weatherData.sky_condition,
            humidity: weatherData.humidity,
            wind_speed: weatherData.wind_speed,
            collected_at: new Date().toISOString(),
          });

        if (insertError) {
          throw new Error(`Failed to insert data: ${insertError.message}`);
        }

        // 4. display_config 업데이트 (마지막 수집 시각)
        await supabase
          .from("display_config")
          .update({ last_weather_update: new Date().toISOString() })
          .eq("display_id", display.id);

        results.push({
          display_id: display.id,
          display_name: display.name,
          success: true,
        });

        console.log(`✓ Successfully collected weather data for ${display.name}`);
      } catch (error: any) {
        console.error(`✗ Failed to collect weather for ${display.name}:`, error.message);

        // 실패 로그 기록
        await supabase.from("audit_logs").insert({
          user_id: null,
          user_email: "system",
          user_role: "system",
          action: "API_ERROR",
          resource_type: "weather_collection",
          action_detail: {
            display_id: display.id,
            display_name: display.name,
            error: error.message,
          },
        });

        results.push({
          display_id: display.id,
          display_name: display.name,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    console.log(`Weather data collection completed: ${successCount}/${totalCount} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount,
        results,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Critical error in weather data collection:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ================================================================
// Helper Functions
// ================================================================

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function getBaseTime(date: Date): string {
  // 기상청 API는 매 시간 40분에 발표
  // 현재 시각 - 1시간으로 조회
  const hour = date.getHours();
  const adjustedHour = hour === 0 ? 23 : hour - 1;
  return String(adjustedHour).padStart(2, "0") + "00";
}

function parseWeatherItems(items: WeatherItem[]): WeatherData {
  const data: WeatherData = {
    temperature: null,
    precipitation_probability: null,
    sky_condition: null,
    humidity: null,
    wind_speed: null,
  };

  for (const item of items) {
    switch (item.category) {
      case "T1H": // 기온
        data.temperature = parseFloat(item.fcstValue);
        break;
      case "RN1": // 1시간 강수량
        // 필요 시 추가
        break;
      case "SKY": // 하늘상태
        const skyCode = parseInt(item.fcstValue);
        data.sky_condition = getSkyCondition(skyCode);
        break;
      case "REH": // 습도
        data.humidity = parseInt(item.fcstValue);
        break;
      case "WSD": // 풍속
        data.wind_speed = parseFloat(item.fcstValue);
        break;
      case "POP": // 강수확률
        data.precipitation_probability = parseInt(item.fcstValue);
        break;
    }
  }

  return data;
}

function getSkyCondition(code: number): string {
  switch (code) {
    case 1:
      return "맑음";
    case 3:
      return "구름많음";
    case 4:
      return "흐림";
    default:
      return "알 수 없음";
  }
}
