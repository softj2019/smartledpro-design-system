// ================================================================
// Joongsan Crawler Panel - 고양시 인조잔디구장 '중산' 경기 크롤링
// ================================================================

import { useState } from 'react';
import { Play, Loader2, CheckCircle2, AlertCircle, Database, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@softj/smartledpro-design-system';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { addLog } from '../../lib/debug-logger';

interface CrawlResult {
  success: boolean;
  message: string;
  data?: {
    date: string;
    totalParsed: number;
    upserted: number;
    failed: number;
    matches: Array<{
      clubName: string | null;
      clubUrl: string | null;
      timeRange: string;
      duration: string | null;
    }>;
  };
  error?: string;
}

export function JoongsanCrawlerPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [todayMatches, setTodayMatches] = useState<any[] | null>(null);

  const loadTodayMatches = async () => {
    setIsLoadingMatches(true);
    try {
      addLog('info', 'JoongsanCrawler', 'Loading today matches...', {});
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/matches/today`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load matches: ${response.status}`);
      }

      const data = await response.json();
      addLog('info', 'JoongsanCrawler', 'Today matches loaded', { data });
      setTodayMatches(data.matches || []);
    } catch (error) {
      addLog('error', 'JoongsanCrawler', 'Failed to load today matches', {
        error: error instanceof Error ? error.message : String(error),
      });
      setTodayMatches([]);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleCrawl = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      addLog('info', 'JoongsanCrawler', 'Starting crawler...', {});

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/crawl/joongsan-today`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      addLog('info', 'JoongsanCrawler', 'Response received', {
        status: response.status,
        ok: response.ok,
      });

      const data = await response.json();

      addLog('info', 'JoongsanCrawler', 'Crawl result', { result: data });

      setResult(data);

      // 프론트엔드에서도 Audit Log 생성 (백엔드와 별도로)
      if (data.success) {
        addLog('info', 'JoongsanCrawler', 'Creating frontend audit log...', {});
        try {
          const auditResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/audit-log`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'MANUAL_CRAWL_SUCCESS',
                resource_type: 'CRAWL_DATA',
                resource_id: null,
                action_detail: {
                  crawl_id: `manual_crawl_${data.data?.date || new Date().toISOString().split('T')[0]}`,
                  date: data.data?.date,
                  total_parsed: data.data?.totalParsed || 0,
                  upserted: data.data?.upserted || 0,
                  failed: data.data?.failed || 0,
                  timestamp: new Date().toISOString(),
                },
              }),
            }
          );

          if (auditResponse.ok) {
            addLog('info', 'JoongsanCrawler', 'Frontend audit log created', {});
          } else {
            const auditError = await auditResponse.json();
            addLog('error', 'JoongsanCrawler', 'Failed to create frontend audit log', { error: auditError });
          }
        } catch (auditError) {
          addLog('error', 'JoongsanCrawler', 'Audit log error', {
            error: auditError instanceof Error ? auditError.message : String(auditError),
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      addLog('error', 'JoongsanCrawler', 'Crawl failed', { error: errorMessage });

      setResult({
        success: false,
        message: '크롤링 실패',
        error: errorMessage,
      });

      // 에러도 Audit Log에 기록
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/audit-log`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'MANUAL_CRAWL_ERROR',
              resource_type: 'CRAWL_DATA',
              resource_id: null,
              action_detail: {
                crawl_id: `manual_crawl_error_${new Date().toISOString()}`,
                error: errorMessage,
                timestamp: new Date().toISOString(),
              },
            }),
          }
        );
      } catch (auditError) {
        addLog('error', 'JoongsanCrawler', 'Failed to log error to audit', {
          error: auditError instanceof Error ? auditError.message : String(auditError),
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">중산 경기 데이터 크롤링</h2>
            <p className="text-sm text-gray-600 mt-1">
              고양시 인조잔디구장 '중산' 탭의 오늘 경기 데이터를 수집합니다
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* 오늘 경기 목록 조회 */}
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900">오늘 저장된 경기</h3>
            </div>
            <Button
              onClick={loadTodayMatches}
              disabled={isLoadingMatches}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {isLoadingMatches ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  조회 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  조회
                </>
              )}
            </Button>
          </div>

          {todayMatches === null && (
            <p className="text-sm text-purple-700">
              버튼을 클릭하여 오늘 저장된 경기를 확인하세요
            </p>
          )}

          {todayMatches !== null && todayMatches.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ 오늘 저장된 경기가 없습니다. 크롤링을 먼저 실행하세요!
              </p>
            </div>
          )}

          {todayMatches && todayMatches.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {todayMatches.map((match) => (
                <div
                  key={match.match_key}
                  className="bg-white p-3 rounded border border-purple-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-purple-900">
                        {match.club_name || '(팀명 없음)'}
                      </div>
                      <div className="text-sm text-purple-700 mt-1">
                        {match.time_range} ({match.duration || '시간 미상'})
                      </div>
                      <div className="text-xs text-purple-600 mt-1">
                        구장: {match.stadium} | 날짜: {match.match_date}
                      </div>
                    </div>
                    {match.club_url && (
                      <a
                        href={match.club_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline text-xs ml-2"
                      >
                        URL
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 크롤링 실행 버튼 */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleCrawl}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                크롤링 중...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                크롤링 시작
              </>
            )}
          </Button>

          {result && !isRunning && (
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={result.success ? 'text-green-700' : 'text-red-700'}>
                {result.message}
              </span>
            </div>
          )}
        </div>

        {/* 결과 표시 */}
        {result && result.success && result.data && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-3">크롤링 결과</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600">날짜</div>
                <div className="text-lg font-semibold mt-1">{result.data.date}</div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600">파싱된 경기</div>
                <div className="text-lg font-semibold mt-1 text-blue-600">
                  {result.data.totalParsed}건
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600">저장 성공</div>
                <div className="text-lg font-semibold mt-1 text-green-600">
                  {result.data.upserted}건
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600">저장 실패</div>
                <div className="text-lg font-semibold mt-1 text-red-600">
                  {result.data.failed}건
                </div>
              </div>
            </div>

            {/* 수집된 경기 목록 */}
            {result.data.matches.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">수집된 경기 목록</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.data.matches.map((match, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded border border-gray-200 text-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">
                            {match.clubName || '(팀명 없음)'}
                          </div>
                          <div className="text-gray-600 mt-1">
                            {match.timeRange}
                            {match.duration && ` (${match.duration})`}
                          </div>
                        </div>
                        {match.clubUrl && (
                          <a
                            href={match.clubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs ml-2"
                          >
                            URL
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 에러 표시 */}
        {result && !result.success && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">크롤링 실패</h3>
                <p className="text-sm text-red-700 mt-1">
                  {result.error || '알 수 없는 오류가 발생했습니다.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 안내 사항 */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">ℹ️ 안내</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>크롤링 대상:</strong> https://e-soccer.gys.or.kr/ (오늘의 경기 - 중산 탭)</li>
            <li>• <strong>저장 위치:</strong> Supabase → today_matches 테이블</li>
            <li>• <strong>유니크 키:</strong> 날짜 + 시간대 + 구장명</li>
            <li>• <strong>중복 처리:</strong> 같은 경기 데이터는 자동으로 업데이트됩니다</li>
            <li>• <strong>자동 크롤링:</strong> 매일 아침 06:00에 자동 실행됩니다</li>
            <li>• <strong>자동 송출:</strong> 경기 시작 10분 전부터 종료까지 30초씩 전광판에 자동 송출됩니다</li>
            <li>• <strong>실행 로그:</strong> 모든 크롤링 및 템플릿 생성/삭제 기록은 Audit Logs에 자동 저장됩니다</li>
            <li>• <strong>Event Type:</strong> CRAWL_SUCCESS / CRAWL_FAILED / CRAWL_ERROR</li>
          </ul>
        </div>
      </div>
    </div>
  );
}