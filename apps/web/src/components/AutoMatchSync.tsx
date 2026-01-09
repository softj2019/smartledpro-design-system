// ================================================================
// Auto Match Sync - 경기 데이터 자동 템플릿/스케줄 동기화
// ================================================================
// 매 1분마다 활성 경기를 확인하고 자동으로 템플릿 및 스케줄 생성/삭제

import { useEffect, useRef } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { addLog } from '../lib/debug-logger';

export function AutoMatchSync() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<Date | null>(null);

  useEffect(() => {
    const syncMatches = async () => {
      try {
        addLog('info', 'AutoMatchSync', 'Starting match template sync...', {});

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
          addLog('error', 'AutoMatchSync', 'Sync failed', { error });
          return;
        }

        const result = await response.json();
        lastSyncRef.current = new Date();

        addLog('info', 'AutoMatchSync', 'Sync completed', {
          created: result.created,
          deleted: result.deleted,
          errors: result.errors,
          timestamp: lastSyncRef.current.toISOString(),
        });
      } catch (error) {
        addLog('error', 'AutoMatchSync', 'Sync error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    // 즉시 한 번 실행
    syncMatches();

    // 매 1분마다 실행
    intervalRef.current = setInterval(syncMatches, 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // UI 렌더링하지 않음 (백그라운드 동기화 전용)
  return null;
}
