// ================================================================
// Air Quality Station Settings - 공기질 측정소 설정
// ================================================================

import { useState, useEffect } from 'react';
import { Wind, Search, Loader2, AlertCircle, Check, MapPin, Settings2 } from 'lucide-react';
import { Button } from '@softj/smartledpro-design-system';
import { Card } from '@softj/smartledpro-design-system';
import { addLog } from '../../lib/debug-logger';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Station {
  stationName: string;
  addr: string;
  mangName: string;
  dmX?: string;
  dmY?: string;
}

interface SavedStation {
  id: string;
  scope: string;
  priority: number;
  station_name: string;
  addr?: string;
  mang_name?: string;
  dm_x?: string;
  dm_y?: string;
  enabled: boolean;
  updated_at: string;
}

interface CollectLog {
  id: string;
  scope: string;
  run_at: string;
  tried: any[];
  success: boolean;
  selected_priority?: number;
  selected_station_name?: string;
  selected_data_time?: string;
  message?: string;
}

export function AirQualityStationSettings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'auto' | 'addr' | 'stationName'>('auto');
  const [searchResults, setSearchResults] = useState<Station[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const [primaryStation, setPrimaryStation] = useState<SavedStation | null>(null);
  const [secondaryStation, setSecondaryStation] = useState<SavedStation | null>(null);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  
  const [latestLog, setLatestLog] = useState<CollectLog | null>(null);
  const [recentLogs, setRecentLogs] = useState<CollectLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  const [isCollecting, setIsCollecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    loadStations();
    loadLogs();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(() => {
      searchStations();
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode]);

  const searchStations = async () => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/airkorea/search-stations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: searchQuery,
            mode: searchMode,
            numOfRows: 30,
            pageNo: 1,
          }),
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.reason || 'Search failed');
      }

      setSearchResults(result.items || []);
      setShowResults(true);
      
      addLog('info', 'AirQualityStation', 'Search completed', {
        query: searchQuery,
        count: result.items?.length || 0,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog('error', 'AirQualityStation', 'Search failed', { error: errorMessage });
      toast.error('측정소 검색에 실패했습니다');
    } finally {
      setIsSearching(false);
    }
  };

  const loadStations = async () => {
    setIsLoadingStations(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/airkorea/stations?scope=GOYANG`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error('Failed to load stations');
      }

      const stations = result.stations || [];
      setPrimaryStation(stations.find((s: SavedStation) => s.priority === 1) || null);
      setSecondaryStation(stations.find((s: SavedStation) => s.priority === 2) || null);
      
      addLog('info', 'AirQualityStation', 'Stations loaded', { count: stations.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog('error', 'AirQualityStation', 'Load stations failed', { error: errorMessage });
    } finally {
      setIsLoadingStations(false);
    }
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/airkorea/logs?scope=GOYANG&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error('Failed to load logs');
      }

      const logs = result.logs || [];
      setLatestLog(logs[0] || null);
      setRecentLogs(logs);
      
      addLog('info', 'AirQualityStation', 'Logs loaded', { count: logs.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog('error', 'AirQualityStation', 'Load logs failed', { error: errorMessage });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const saveStation = async (station: Station, priority: 1 | 2) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/airkorea/stations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scope: 'GOYANG',
            priority,
            station_name: station.stationName,
            addr: station.addr,
            mang_name: station.mangName,
            dm_x: station.dmX,
            dm_y: station.dmY,
            enabled: true,
          }),
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error('Failed to save station');
      }

      toast.success(`${priority === 1 ? 'Primary' : 'Secondary'} 측정소가 설정되었습니다`);
      setShowResults(false);
      setSearchQuery('');
      loadStations();
      
      addLog('info', 'AirQualityStation', 'Station saved', {
        priority,
        stationName: station.stationName,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog('error', 'AirQualityStation', 'Save failed', { error: errorMessage });
      toast.error('측정소 저장에 실패했습니다');
    }
  };

  const toggleStation = async (priority: 1 | 2, enabled: boolean) => {
    const station = priority === 1 ? primaryStation : secondaryStation;
    if (!station) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/airkorea/stations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scope: 'GOYANG',
            priority,
            station_name: station.station_name,
            addr: station.addr,
            mang_name: station.mang_name,
            dm_x: station.dm_x,
            dm_y: station.dm_y,
            enabled,
          }),
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error('Failed to update station');
      }

      toast.success(`측정소가 ${enabled ? '활성화' : '비활성화'}되었습니다`);
      loadStations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog('error', 'AirQualityStation', 'Toggle failed', { error: errorMessage });
      toast.error('상태 변경에 실패했습니다');
    }
  };

  const collectNow = async () => {
    setIsCollecting(true);
    try {
      addLog('info', 'AirQualityStation', '🔄 Manual collection started...', {});

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/airkorea/collect-hourly`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ scope: 'GOYANG' }),
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.message || 'Collection failed');
      }

      addLog('info', 'AirQualityStation', '✅ Collection completed', result);
      toast.success('공기질 데이터가 수집되었습니다');
      loadLogs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog('error', 'AirQualityStation', '❌ Collection failed', { error: errorMessage });
      toast.error(`수집 실패: ${errorMessage}`);
    } finally {
      setIsCollecting(false);
    }
  };

  const testCollection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      addLog('info', 'AirQualityStation', '🔄 Test collection started...', {});

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/airkorea/test-collect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ scope: 'GOYANG' }),
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.message || 'Test collection failed');
      }

      addLog('info', 'AirQualityStation', '✅ Test collection completed', result);
      toast.success('테스트 수집이 성공했습니다');
      setTestResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog('error', 'AirQualityStation', '❌ Test collection failed', { error: errorMessage });
      toast.error(`테스트 수집 실패: ${errorMessage}`);
      setTestResult({ error: errorMessage });
    } finally {
      setIsTesting(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <Card className="p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-cyan-100 rounded-lg">
            <Wind className="w-5 h-5 text-cyan-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg md:text-xl">공기질 측정소 설정</h2>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              Primary/Secondary 측정소를 설정하고 매시간 정각에 자동으로 데이터를 수집합니다
            </p>
          </div>
        </div>
      </Card>

      {/* Search Section */}
      <Card className="p-4 md:p-6">
        <h3 className="font-medium mb-3">측정소 검색</h3>
        
        {/* Search Mode Toggle */}
        <div className="flex gap-2 mb-3">
          {[
            { value: 'auto', label: 'Auto' },
            { value: 'addr', label: '주소' },
            { value: 'stationName', label: '측정소명' },
          ].map((mode) => (
            <button
              key={mode.value}
              onClick={() => setSearchMode(mode.value as any)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                searchMode === mode.value
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchMode === 'addr'
                ? '예: 경기 고양시 일산동구'
                : searchMode === 'stationName'
                ? '예: 식사동'
                : '주소 또는 측정소명 입력'
            }
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
          )}
        </div>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <div className="mt-3 border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
            {searchResults.map((station, idx) => (
              <div
                key={idx}
                className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm md:text-base">{station.stationName}</div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {station.addr}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{station.mangName}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => saveStation(station, 1)}
                      className="text-xs"
                    >
                      Primary
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveStation(station, 2)}
                      className="text-xs"
                    >
                      Secondary
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showResults && searchResults.length === 0 && !isSearching && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-600">
            검색 결과가 없습니다
          </div>
        )}
      </Card>

      {/* Selected Stations */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Primary Station */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-blue-900">Primary 측정소</h3>
            {primaryStation && (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={primaryStation.enabled}
                  onChange={(e) => toggleStation(1, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            )}
          </div>
          {isLoadingStations ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : primaryStation ? (
            <div>
              <div className="text-base font-medium">{primaryStation.station_name}</div>
              <div className="text-xs text-gray-600 mt-1">{primaryStation.addr}</div>
              <div className="text-xs text-gray-500 mt-0.5">{primaryStation.mang_name}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 py-4 text-center">
              측정소를 검색하여 설정하세요
            </div>
          )}
        </Card>

        {/* Secondary Station */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-purple-900">Secondary 측정소</h3>
            {secondaryStation && (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={secondaryStation.enabled}
                  onChange={(e) => toggleStation(2, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            )}
          </div>
          {isLoadingStations ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : secondaryStation ? (
            <div>
              <div className="text-base font-medium">{secondaryStation.station_name}</div>
              <div className="text-xs text-gray-600 mt-1">{secondaryStation.addr}</div>
              <div className="text-xs text-gray-500 mt-0.5">{secondaryStation.mang_name}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 py-4 text-center">
              폴백용 측정소를 설정하세요
            </div>
          )}
        </Card>
      </div>

      {/* Latest Collection Status */}
      {(primaryStation || secondaryStation) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">
              {latestLog ? '최근 수집 결과' : '데이터 수집'}
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={testCollection} disabled={isTesting}>
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    테스트 중...
                  </>
                ) : (
                  '🧪 테스트 수집'
                )}
              </Button>
              <Button size="sm" onClick={collectNow} disabled={isCollecting}>
                {isCollecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    수집 중...
                  </>
                ) : (
                  '지금 수집'
                )}
              </Button>
            </div>
          </div>
          
          {/* Test Result Display */}
          {testResult && (
            <div className="mb-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
              <div className="text-sm font-medium text-purple-900 mb-2">🧪 테스트 결과 (DB 저장 안 함)</div>
              {testResult.error ? (
                <div className="text-xs text-red-700">{testResult.error}</div>
              ) : (
                <div className="space-y-2">
                  {testResult.tested?.map((test: any, idx: number) => (
                    <div key={idx} className={`p-2 rounded border ${test.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs">
                            <span className={test.ok ? 'text-green-900' : 'text-red-900'}>
                              {test.ok ? '✅' : '❌'} Priority {test.priority}: <strong>{test.stationName}</strong>
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">{test.addr}</div>
                          {test.parsedData && (
                            <div className="text-xs text-gray-700 mt-1">
                              <div>시간: {test.parsedData.dataTime}</div>
                              <div>PM10: {test.parsedData.pm10Value} (등급: {test.parsedData.pm10Grade})</div>
                              <div>PM2.5: {test.parsedData.pm25Value} (등급: {test.parsedData.pm25Grade})</div>
                              <div>통합: {test.parsedData.khaiValue} (등급: {test.parsedData.khaiGrade})</div>
                            </div>
                          )}
                          {!test.ok && (
                            <div className="text-xs text-red-700 mt-1">사유: {test.reason}</div>
                          )}
                        </div>
                        {test.parsedData && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(test.parsedData, null, 2));
                              toast.success('JSON 복사됨');
                            }}
                            className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                          >
                            JSON 복사
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {latestLog ? (
            <div className={`p-3 rounded-lg ${latestLog.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-start gap-2">
                {latestLog.success ? (
                  <Check className="w-5 h-5 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${latestLog.success ? 'text-green-900' : 'text-red-900'}`}>
                    {latestLog.success ? '수집 성공' : '수집 실패'}
                  </div>
                  {latestLog.success && (
                    <div className="text-xs text-gray-700 mt-1">
                      <div>측정소: {latestLog.selected_station_name} (Priority {latestLog.selected_priority})</div>
                      <div>시간: {latestLog.selected_data_time ? formatDateTime(latestLog.selected_data_time) : '-'}</div>
                    </div>
                  )}
                  {!latestLog.success && (
                    <div className="text-xs text-red-700 mt-1">{latestLog.message}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    실행: {formatDateTime(latestLog.run_at)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-gray-50">
              <div className="text-sm text-gray-600">
                측정소가 설정되었습니다. <strong>"지금 수집"</strong> 버튼을 눌러 공기질 데이터를 수집하세요.
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Info Box */}
      <Card className="p-4 bg-cyan-50 border-cyan-200">
        <h4 className="text-sm font-semibold text-cyan-900 mb-2">ℹ️ 안내</h4>
        <ul className="text-xs md:text-sm text-cyan-800 space-y-1">
          <li>• <strong>자동 수집:</strong> 매시간 정각(XX:00)에 자동으로 실행됩니다</li>
          <li>• <strong>폴백 시스템:</strong> Primary 실패 시 자동으로 Secondary에서 수집합니다</li>
          <li>• <strong>중복 방지:</strong> 동일한 시간대 데이터는 자동으로 중복 제거됩니다</li>
          <li>• <strong>데이터 출처:</strong> 한국환경공단 에어코리아 대기오염정보</li>
          <li className="hidden md:list-item">• <strong>실행 로그:</strong> 모든 수집 시도는 Logs에 자동 기록됩니다</li>
        </ul>
      </Card>
    </div>
  );
}