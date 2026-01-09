// ================================================================
// useScheduleExecutor Hook - 스케줄 자동 실행을 트리거하는 Hook
// ================================================================

import { useEffect, useRef } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { logger } from '../debug-logger';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f`;

/**
 * 스케줄 자동 실행 Hook
 * 1분마다 서버에 스케줄 체크 및 실행 요청
 */
export function useScheduleExecutor() {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const checkAndExecute = async () => {
      try {
        const response = await fetch(`${API_URL}/schedules/check-and-execute`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.executed) {
          logger.info('ScheduleExecutor', '스케줄 자동 실행 성공', {
            schedule_id: result.schedule_id,
            template_id: result.template_id,
            executed_at: result.executed_at,
          });
        } else if (result.error && result.error !== 'No active schedules' && result.error !== 'No schedules to execute at this time') {
          logger.warn('ScheduleExecutor', '스케줄 실행 실패', {
            error: result.error,
          });
        }
      } catch (error) {
        logger.error('ScheduleExecutor', '스케줄 체크 API 호출 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    // 즉시 한 번 실행
    checkAndExecute();

    // 1분(60초)마다 실행
    intervalRef.current = window.setInterval(checkAndExecute, 60 * 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
