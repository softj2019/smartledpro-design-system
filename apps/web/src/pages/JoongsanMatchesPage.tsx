// ================================================================
// Joongsan Matches Page - 중산 경기 데이터 조회
// ================================================================

import { useEffect, useState } from 'react';
import { Calendar, RefreshCw, Loader2, AlertCircle, Zap } from 'lucide-react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Button } from "@softj/smartledpro-design-system";
import { supabase } from '../lib/supabase';
import { addLog } from '../lib/debug-logger';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Match {
  match_key: string;
  match_date: string;
  stadium: string;
  time_range: string;
  start_time: string | null;
  end_time: string | null;
  duration_text: string | null;
  club_name: string | null;
  club_url: string | null;
  source_url: string;
  fetched_at: string;
}

export function JoongsanMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchMatches = async () => {
    setIsLoading(true);
    setError(null);

    try {
      addLog('info', 'JoongsanMatches', 'Fetching matches...', {});

      const { data, error: fetchError } = await supabase
        .from('today_matches')
        .select('*')
        .eq('stadium', '중산')
        .order('match_date', { ascending: false })
        .order('time_range', { ascending: true })
        .limit(100);

      if (fetchError) throw fetchError;

      addLog('info', 'JoongsanMatches', 'Matches fetched', {
        count: data?.length || 0,
      });

      setMatches(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      addLog('error', 'JoongsanMatches', 'Fetch failed', {
        error: errorMessage,
      });

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 템플릿 및 스케줄 동기화 (수동)
  const syncTemplates = async () => {
    setIsSyncing(true);
    try {
      addLog('info', 'JoongsanMatches', '🔄 Manual sync started...', {});

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/matches/sync-templates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }

      const result = await response.json();

      addLog('info', 'JoongsanMatches', '✅ Manual sync completed', {
        total_matches: result.total_matches,
        active_matches_now: result.active_matches_now,
        templates_created: result.templates_created,
        templates_deleted: result.templates_deleted,
        errors: result.errors,
      });

      alert(`✅ 동기화 완료!\n생성: ${result.templates_created}개\n삭제: ${result.templates_deleted}개`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      addLog('error', 'JoongsanMatches', '❌ Manual sync failed', {
        error: errorMessage,
      });

      alert(`❌ 동기화 실패: ${errorMessage}`);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  // 날짜별로 그룹화
  const groupedMatches = matches.reduce((acc, match) => {
    const date = match.match_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <AdminPageHeader
        icon={<Calendar className="w-8 h-8" />}
        title="대관정보"
        description="고양시 인조잔디구장 중산 탭의 수집된 경기 데이터"
        breadcrumbs={[
          { label: '대관정보' }
        ]}
      />

      {/* 새로고침 버튼 */}
      <div className="flex justify-between items-center gap-2">
        <div className="text-xs md:text-sm text-gray-600">
          총 <span className="font-semibold text-gray-900">{matches.length}</span>개 경기
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={syncTemplates}
            disabled={isSyncing}
            variant="default"
            size="sm"
            className="flex items-center gap-1 md:gap-2"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">템플릿 동기화</span>
            <span className="sm:hidden">동기화</span>
          </Button>
          
          <Button
            onClick={fetchMatches}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 md:gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">새로고침</span>
          </Button>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && matches.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">데이터 로드 실패</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 경기 데이터가 없음 */}
      {!isLoading && !error && matches.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">수집된 경기가 없습니다</h3>
          <p className="text-sm text-gray-600">
            시스템 설정 페이지에서 크롤링을 실행해주세요.
          </p>
        </div>
      )}

      {/* 날짜별 경기 목록 */}
      {!isLoading && !error && matches.length > 0 && (
        <div className="space-y-4 md:space-y-6">
          {Object.keys(groupedMatches)
            .sort((a, b) => b.localeCompare(a))
            .map((date) => (
              <div key={date} className="rounded-lg border border-gray-200">
                {/* 날짜 헤더 */}
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-base md:text-lg">{formatDate(date)}</h3>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">
                    {groupedMatches[date].length}개 경기
                  </p>
                </div>

                {/* 경기 목록 */}
                <div className="divide-y divide-gray-200">
                  {groupedMatches[date].map((match) => (
                    <div key={match.match_key} className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* 팀명 */}
                          <div className="flex items-center gap-2">
                            {match.club_url ? (
                              <a
                                href={match.club_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm md:text-base text-blue-600 hover:underline truncate"
                              >
                                {match.club_name || '(팀명 없음)'}
                              </a>
                            ) : (
                              <span className="text-sm md:text-base text-gray-900 truncate">
                                {match.club_name || '(팀명 없음)'}
                              </span>
                            )}
                          </div>

                          {/* 시간대 */}
                          <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2 text-xs md:text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                              {match.time_range}
                            </span>
                            {match.duration_text && (
                              <span className="text-gray-500 hidden sm:inline">
                                ({match.duration_text})
                              </span>
                            )}
                          </div>

                          {/* datetime 정보 (디버그용 - 데스크탑만) */}
                          {match.start_time && match.end_time && (
                            <div className="hidden md:block mt-1 text-xs text-gray-500 font-mono">
                              DB: {new Date(match.start_time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' })} ~ {new Date(match.end_time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}

                          {/* 수집 시각 */}
                          <div className="mt-1.5 md:mt-2 text-[10px] md:text-xs text-gray-500">
                            수집: {formatTime(match.fetched_at)}
                          </div>
                        </div>

                        {/* match_key (디버그용 - 데스크탑만) */}
                        <div className="hidden md:block ml-4 text-xs text-gray-400 font-mono shrink-0">
                          {match.match_key}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}