// ================================================================
// Air Quality Display - 전광판 공기질 정보 표출
// ================================================================

import { useEffect, useState } from 'react';
import { Wind, Activity, AlertTriangle } from 'lucide-react';

interface AirQualityData {
  id: string;
  scope: string;
  station_name: string;
  station_code: string;
  data_time: string;
  fetched_at: string;
  source_priority: number;
  khai_value: string;
  khai_grade: string;
  pm10_value: string;
  pm10_grade: string;
  pm25_value: string;
  pm25_grade: string;
  so2_value: string;
  so2_grade: string;
  co_value: string;
  co_grade: string;
  o3_value: string;
  o3_grade: string;
  no2_value: string;
  no2_grade: string;
  raw: any;
}

interface AirQualityDisplayProps {
  scope?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
  showDetails?: boolean;
}

export function AirQualityDisplay({ 
  scope = 'GOYANG',
  autoRefresh = true,
  refreshInterval = 300, // 5 minutes
  showDetails = true,
}: AirQualityDisplayProps) {
  const [data, setData] = useState<AirQualityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAirQuality();

    if (autoRefresh) {
      const interval = setInterval(fetchAirQuality, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [scope, autoRefresh, refreshInterval]);

  const fetchAirQuality = async () => {
    try {
      // Note: In production, replace with actual API endpoint
      const projectId = import.meta.env?.VITE_SUPABASE_PROJECT_ID || 'your-project-id';
      const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/airkorea/latest?scope=${scope}`,
        {
          headers: {
            'Authorization': `Bearer ${anonKey}`,
          },
        }
      );

      const result = await response.json();

      if (!result.ok || !result.data) {
        throw new Error('No air quality data available');
      }

      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeInfo = (grade: string) => {
    const gradeNum = parseInt(grade || '0');
    switch (gradeNum) {
      case 1:
        return { label: '좋음', color: 'text-blue-600', bg: 'bg-blue-100', icon: '😊' };
      case 2:
        return { label: '보통', color: 'text-green-600', bg: 'bg-green-100', icon: '🙂' };
      case 3:
        return { label: '나쁨', color: 'text-orange-600', bg: 'bg-orange-100', icon: '😷' };
      case 4:
        return { label: '매우나쁨', color: 'text-red-600', bg: 'bg-red-100', icon: '🤢' };
      default:
        return { label: '-', color: 'text-gray-600', bg: 'bg-gray-100', icon: '❓' };
    }
  };

  const getKhaiGradeInfo = (grade: string) => {
    const gradeNum = parseInt(grade || '0');
    switch (gradeNum) {
      case 1:
        return { label: '좋음', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-300' };
      case 2:
        return { label: '보통', color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-300' };
      case 3:
        return { label: '나쁨', color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-300' };
      case 4:
        return { label: '매우나쁨', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300' };
      default:
        return { label: '-', color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-300' };
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <div className="text-white text-2xl">공기질 정보 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <div className="text-white text-2xl mb-2">공기질 정보를 불러올 수 없습니다</div>
          <div className="text-gray-400 text-lg">{error || '데이터 없음'}</div>
        </div>
      </div>
    );
  }

  const khaiInfo = getKhaiGradeInfo(data.khai_grade);
  const pm10Info = getGradeInfo(data.pm10_grade);
  const pm25Info = getGradeInfo(data.pm25_grade);

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-cyan-900 to-blue-900 p-8 md:p-16 flex flex-col">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Wind className="w-12 h-12 md:w-16 md:h-16 text-cyan-400" />
          <h1 className="text-4xl md:text-6xl text-white">실시간 공기질 정보</h1>
        </div>
        <div className="text-xl md:text-2xl text-cyan-200">
          {data.station_name} 측정소
        </div>
        <div className="text-lg md:text-xl text-gray-400 mt-2">
          측정 시각: {formatDateTime(data.data_time)}
        </div>
      </div>

      {/* Main Grade - 통합대기환경지수 */}
      <div className={`flex-1 flex flex-col items-center justify-center ${khaiInfo.bg} ${khaiInfo.border} border-4 rounded-3xl p-8 md:p-12 mb-8 shadow-2xl`}>
        <div className="text-center">
          <div className="text-2xl md:text-3xl text-gray-700 mb-4">통합대기환경지수</div>
          <div className={`text-9xl md:text-[200px] ${khaiInfo.color} mb-4`}>
            {data.khai_value || '-'}
          </div>
          <div className={`text-5xl md:text-7xl ${khaiInfo.color}`}>
            {khaiInfo.label}
          </div>
        </div>
      </div>

      {/* Details - PM10 & PM2.5 */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-4 md:gap-8">
          {/* PM10 */}
          <div className={`${pm10Info.bg} rounded-2xl p-6 md:p-8 shadow-lg`}>
            <div className="text-center">
              <div className="text-xl md:text-2xl text-gray-700 mb-2">미세먼지 (PM10)</div>
              <div className={`text-5xl md:text-7xl ${pm10Info.color} mb-2`}>
                {data.pm10_value || '-'}
              </div>
              <div className="text-lg md:text-xl text-gray-600">㎍/㎥</div>
              <div className={`text-2xl md:text-4xl ${pm10Info.color} mt-2`}>
                {pm10Info.icon} {pm10Info.label}
              </div>
            </div>
          </div>

          {/* PM2.5 */}
          <div className={`${pm25Info.bg} rounded-2xl p-6 md:p-8 shadow-lg`}>
            <div className="text-center">
              <div className="text-xl md:text-2xl text-gray-700 mb-2">초미세먼지 (PM2.5)</div>
              <div className={`text-5xl md:text-7xl ${pm25Info.color} mb-2`}>
                {data.pm25_value || '-'}
              </div>
              <div className="text-lg md:text-xl text-gray-600">㎍/㎥</div>
              <div className={`text-2xl md:text-4xl ${pm25Info.color} mt-2`}>
                {pm25Info.icon} {pm25Info.label}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-8 text-gray-400 text-lg md:text-xl">
        <div className="flex items-center justify-center gap-2">
          <Activity className="w-5 h-5" />
          <span>자료제공: 한국환경공단 에어코리아</span>
        </div>
      </div>
    </div>
  );
}
