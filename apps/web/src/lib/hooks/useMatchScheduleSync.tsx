// ================================================================
// useMatchScheduleSync - 경기 데이터 자동 템플릿/스케줄 동기화 훅
// ================================================================
// 매 1분마다 활성 경기를 확인하고 자동으로 템플릿 및 스케줄 생성/삭제

import { useEffect, useRef } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { addLog } from '../debug-logger';

export function useMatchScheduleSync() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<Date | null>(null);

  useEffect(() => {
    // 로그인하지 않은 경우 실행하지 않음
    if (!user) {
      return;
    }

    const syncMatches = async () => {
      try {
        addLog('info', 'MatchScheduleSync', 'Starting match template sync...', {});

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
          addLog('error', 'MatchScheduleSync', 'Sync failed', { error });
          return;
        }

        const result = await response.json();
        lastSyncRef.current = new Date();

        addLog('info', 'MatchScheduleSync', 'Sync completed', {
          korea_time: result.korea_time,
          today_str: result.today_str,
          total_matches: result.total_matches,
          active_matches_now: result.active_matches_now,
          all_match_details: result.all_match_details,
          active_match_details: result.active_match_details,
          templates_created: result.templates_created,
          templates_deleted: result.templates_deleted,
          errors: result.errors,
          timestamp: lastSyncRef.current.toISOString(),
        });
      } catch (error) {
        addLog('error', 'MatchScheduleSync', 'Sync error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    // 즉시 한 번 실행
    addLog('info', 'MatchScheduleSync', 'Starting match schedule sync system...', {});
    syncMatches();

    // 매 1분마다 실행
    intervalRef.current = setInterval(syncMatches, 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        addLog('info', 'MatchScheduleSync', 'Match schedule sync system stopped', {});
      }
    };
  }, [user]);
}