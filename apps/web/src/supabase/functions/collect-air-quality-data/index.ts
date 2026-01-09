// ================================================================
// Edge Function: collect-air-quality-data
// Description: AirKorea 대기질 API 호출 및 데이터 저장
// Schedule: Cron - 매 10분마다 실행
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AIR_QUALITY_API_URL = "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty";
const AIRKOREA_API_KEY = Deno.env.get("AIRKOREA_API_KEY");

interface AirQualityData {
  pm10_value: number | null;
  pm10_grade: number | null;
  pm25_value: number | null;
  pm25_grade: number | null;
  khai_value: number | null;
  khai_grade: number | null;
}

serve(async (req) => {
  try {
    console.log("Starting air quality data collection...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. 활성 전광판 및 측정소 조회
    const { data: displays, error: displayError } = await supabase
      .from("displays")
      .select(`
        id,
        name,
        display_config!inner(
          id,
          air_station_id,
          air_stations!inner(station_name)
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

    // 2. 각 전광판별 AirKorea API 호출
    for (const display of displays) {
      try {
        const config = display.display_config as any;
        const station = config.air_stations;
        const stationName = station.station_name;

        console.log(`Fetching air quality for display: ${display.name} (station: ${stationName})`);

        const params = new URLSearchParams({
          serviceKey: decodeURIComponent(AIRKOREA_API_KEY!),
          returnType: "json",
          numOfRows: "1",
          pageNo: "1",
          stationName: stationName,
          dataTerm: "DAILY",
          ver: "1.3",
        });

        const response = await fetch(`${AIR_QUALITY_API_URL}?${params}`, {
          signal: AbortSignal.timeout(10000), // 10초 타임아웃
        });

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (data.response.header.resultCode !== "00") {
          throw new Error(`API error: ${data.response.header.resultMsg}`);
        }

        const items = data.response.body?.items || [];
        if (items.length === 0) {
          throw new Error("No data available from station");
        }

        const airData = parseAirQualityData(items[0]);

        // 3. 데이터 저장
        const { error: insertError } = await supabase
          .from("weather_air_quality_readings")
          .insert({
            display_id: display.id,
            data_type: "AIR_QUALITY",
            pm10_value: airData.pm10_value,
            pm10_grade: airData.pm10_grade,
            pm25_value: airData.pm25_value,
            pm25_grade: airData.pm25_grade,
            khai_value: airData.khai_value,
            khai_grade: airData.khai_grade,
            collected_at: new Date().toISOString(),
          });

        if (insertError) {
          throw new Error(`Failed to insert data: ${insertError.message}`);
        }

        // 4. display_config 업데이트 (마지막 수집 시각)
        await supabase
          .from("display_config")
          .update({ last_air_quality_update: new Date().toISOString() })
          .eq("display_id", display.id);

        // 5. air_stations 업데이트 (마지막 수집 시각)
        await supabase
          .from("air_stations")
          .update({ last_collected_at: new Date().toISOString() })
          .eq("id", config.air_station_id);

        results.push({
          display_id: display.id,
          display_name: display.name,
          station_name: stationName,
          success: true,
        });

        console.log(`✓ Successfully collected air quality data for ${display.name}`);
      } catch (error: any) {
        console.error(`✗ Failed to collect air quality for ${display.name}:`, error.message);

        // 실패 로그 기록
        await supabase.from("audit_logs").insert({
          user_id: null,
          user_email: "system",
          user_role: "system",
          action: "API_ERROR",
          resource_type: "air_quality_collection",
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

    console.log(`Air quality data collection completed: ${successCount}/${totalCount} successful`);

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
    console.error("Critical error in air quality data collection:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ================================================================
// Helper Functions
// ================================================================

function parseAirQualityData(item: any): AirQualityData {
  return {
    pm10_value: item.pm10Value ? parseInt(item.pm10Value) : null,
    pm10_grade: item.pm10Grade ? parseInt(item.pm10Grade) : null,
    pm25_value: item.pm25Value ? parseInt(item.pm25Value) : null,
    pm25_grade: item.pm25Grade ? parseInt(item.pm25Grade) : null,
    khai_value: item.khaiValue ? parseInt(item.khaiValue) : null,
    khai_grade: item.khaiGrade ? parseInt(item.khaiGrade) : null,
  };
}
