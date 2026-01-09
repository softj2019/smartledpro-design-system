// ================================================================
// Auto Crawler Hook - 매일 아침 06시 자동 크롤링
// ================================================================
// 고양시 인조잔디구장 '중산' 경기 데이터를 매일 자동으로 크롤링
// - 매일 06:00:00 ~ 06:01:00 사이에 자동 실행
// - 하루에 한 번만 실행 (중복 방지)
// - 모든 실행 결과는 Audit Log에 기록

import { useEffect, useRef, useState } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { addLog } from '../debug-logger';

const CHECK_INTERVAL = 60 * 1000; // 1분마다 체크
const DEFAULT_TARGET_HOUR = 6; // 기본값: 06시
const DEFAULT_TARGET_MINUTE = 0; // 기본값: 00분

interface CrawlerSettings {
  hour: number;
  minute: number;
}

export function useAutoCrawler() {
  const intervalRef = useRef<number | null>(null);
  const lastExecutedDateRef = useRef<string | null>(null);
  const isExecutingRef = useRef(false);
  const [targetTime, setTargetTime] = useState({ hour: DEFAULT_TARGET_HOUR, minute: DEFAULT_TARGET_MINUTE });

  // 설정 불러오기
  const loadSettings = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/kv/crawler_time_settings`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          setTargetTime(data.value);
          addLog('info', 'AutoCrawler', '크롤링 시간 설정 로드 완료', {
            hour: data.value.hour,
            minute: data.value.minute,
          });
          return;
        }
      }
      
      // 설정이 없으면 기본값 사용
      setTargetTime({ hour: DEFAULT_TARGET_HOUR, minute: DEFAULT_TARGET_MINUTE });
      addLog('info', 'AutoCrawler', '기본 크롤링 시간 사용', {
        hour: DEFAULT_TARGET_HOUR,
        minute: DEFAULT_TARGET_MINUTE,
      });
      
    } catch (error) {
      addLog('error', 'AutoCrawler', '설정 로드 실패, 기본값 사용', {
        error: error instanceof Error ? error.message : String(error),
      });
      setTargetTime({ hour: DEFAULT_TARGET_HOUR, minute: DEFAULT_TARGET_MINUTE });
    }
  };

  const executeCrawler = async () => {
    // 이미 실행 중이면 스킵
    if (isExecutingRef.current) {
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // 06:00 ~ 06:01 범위 체크
    const isTargetTime = currentHour === targetTime.hour && currentMinute === targetTime.minute;

    // 오늘 이미 실행했는지 체크
    const alreadyExecutedToday = lastExecutedDateRef.current === currentDate;

    if (!isTargetTime || alreadyExecutedToday) {
      return;
    }

    try {
      isExecutingRef.current = true;
      
      addLog('info', 'AutoCrawler', '자동 크롤링 시작 (매일 06:00)', {
        scheduled_time: `${targetTime.hour}:${String(targetTime.minute).padStart(2, '0')}`,
        actual_time: now.toISOString(),
      });

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

      const result = await response.json();

      if (result.success) {
        addLog('info', 'AutoCrawler', '자동 크롤링 성공', {
          date: result.data?.date,
          total_parsed: result.data?.totalParsed,
          upserted: result.data?.upserted,
          failed: result.data?.failed,
        });

        // 실행 날짜 기록
        lastExecutedDateRef.current = currentDate;

        // Audit log 기록
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/audit-log`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event_type: 'AUTO_CRAWL_SUCCESS',
              user_id: 'SYSTEM',
              user_email: 'system@auto',
              user_role: 'SYSTEM',
              action: 'CREATE',
              resource_type: 'CRAWL_DATA',
              resource_id: `auto_crawl_${currentDate}`,
              action_detail: {
                scheduled_time: '06:00',
                executed_at: now.toISOString(),
                total_parsed: result.data?.totalParsed || 0,
                upserted: result.data?.upserted || 0,
                failed: result.data?.failed || 0,
              },
            }),
          }
        );

      } else {
        addLog('error', 'AutoCrawler', '자동 크롤링 실패', {
          error: result.error || result.message,
        });

        // 실패해도 오늘 날짜는 기록 (무한 재시도 방지)
        lastExecutedDateRef.current = currentDate;

        // Audit log 기록
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/audit-log`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event_type: 'AUTO_CRAWL_FAILED',
              user_id: 'SYSTEM',
              user_email: 'system@auto',
              user_role: 'SYSTEM',
              action: 'CREATE',
              resource_type: 'CRAWL_DATA',
              resource_id: `auto_crawl_${currentDate}`,
              action_detail: {
                scheduled_time: '06:00',
                executed_at: now.toISOString(),
                error: result.error || result.message,
              },
            }),
          }
        );
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      addLog('error', 'AutoCrawler', '자동 크롤링 예외 발생', {
        error: errorMessage,
      });

      // 예외 발생해도 오늘 날짜는 기록
      lastExecutedDateRef.current = currentDate;

      // Audit log 기록
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
              event_type: 'AUTO_CRAWL_ERROR',
              user_id: 'SYSTEM',
              user_email: 'system@auto',
              user_role: 'SYSTEM',
              action: 'CREATE',
              resource_type: 'CRAWL_DATA',
              resource_id: `auto_crawl_${currentDate}`,
              action_detail: {
                scheduled_time: '06:00',
                executed_at: new Date().toISOString(),
                error: errorMessage,
              },
            }),
          }
        );
      } catch (logError) {
        addLog('error', 'AutoCrawler', 'Audit log 기록 실패', {
          error: logError instanceof Error ? logError.message : String(logError),
        });
      }

    } finally {
      isExecutingRef.current = false;
    }
  };

  useEffect(() => {
    // 설정 불러오기
    loadSettings();
  }, []);

  useEffect(() => {
    // targetTime이 변경되면 타이머 재설정
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }

    addLog('info', 'AutoCrawler', '자동 크롤링 시스템 초기화', {
      scheduled_time: `${String(targetTime.hour).padStart(2, '0')}:${String(targetTime.minute).padStart(2, '0')}`,
      check_interval_seconds: CHECK_INTERVAL / 1000,
    });

    // 초기 실행 (시스템 시작 시 시간 체크)
    executeCrawler();

    // 1분마다 시간 체크
    intervalRef.current = window.setInterval(() => {
      executeCrawler();
    }, CHECK_INTERVAL);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        addLog('info', 'AutoCrawler', '자동 크롤링 시스템 종료', {});
      }
    };
  }, [targetTime]);

  return null;
}