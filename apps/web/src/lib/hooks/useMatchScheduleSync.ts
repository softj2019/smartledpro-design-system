// ================================================================
// Match Schedule Sync Hook - 경기 일정 자동 템플릿 동기화
// ================================================================
// 크롤링된 경기 데이터를 전광판 송출용 템플릿으로 자동 변환
// - 경기 시작 10분 전 ~ 경기 종료까지 자동 송출
// - 1분마다 활성 경기 확인 및 템플릿 생성/삭제
// - 모든 작업은 Audit Log에 기록됨

import { useEffect, useRef } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { addLog } from '../debug-logger';

const SYNC_INTERVAL = 60 * 1000; // 1분마다 실행

export function useMatchScheduleSync() {
  const intervalRef = useRef<number | null>(null);
  const isSyncingRef = useRef(false);

  const syncMatchTemplates = async () => {
    // 이미 동기화 중이면 스킵
    if (isSyncingRef.current) {
      addLog('info', 'MatchScheduleSync', 'Sync already in progress, skipping...', {});
      return;
    }

    try {
      isSyncingRef.current = true;
      
      addLog('info', 'MatchScheduleSync', 'Starting match template sync...', {
        time: new Date().toISOString(),
      });

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
        const errorData = await response.json();
        addLog('error', 'MatchScheduleSync', 'Sync failed', {
          status: response.status,
          error: errorData,
        });
        return;
      }

      const result = await response.json();
      
      addLog('info', 'MatchScheduleSync', 'Sync completed', {
        active_matches: result.active_matches,
        templates_created: result.templates_created,
        templates_deleted: result.templates_deleted,
        errors: result.errors,
      });

      // 템플릿이 생성되거나 삭제되었으면 알림
      if (result.templates_created > 0 || result.templates_deleted > 0) {
        addLog('info', 'MatchScheduleSync', '경기 일정 템플릿이 업데이트되었습니다', {
          created: result.templates_created,
          deleted: result.templates_deleted,
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog('error', 'MatchScheduleSync', 'Unexpected sync error', {
        error: errorMessage,
      });
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    // 초기 실행
    addLog('info', 'MatchScheduleSync', 'Match schedule sync system initialized', {
      interval_ms: SYNC_INTERVAL,
    });
    
    syncMatchTemplates();

    // 1분마다 반복 실행
    intervalRef.current = window.setInterval(() => {
      syncMatchTemplates();
    }, SYNC_INTERVAL);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        addLog('info', 'MatchScheduleSync', 'Match schedule sync system stopped', {});
      }
    };
  }, []);

  return null;
}
