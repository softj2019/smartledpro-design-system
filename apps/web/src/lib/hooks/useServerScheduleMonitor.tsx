// ================================================================
// useServerScheduleMonitor - 서버 스케줄 실행 모니터링 훅
// ================================================================
// 서버에서 자동 실행되는 스케줄을 모니터링하고 로그로 기록

import { useEffect, useRef } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { addLog } from '../debug-logger';
import { supabase } from '../supabase';

export function useServerScheduleMonitor() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<string | null>(null);

  useEffect(() => {
    // 로그인하지 않은 경우 실행하지 않음
    if (!user) {
      return;
    }

    const monitorSchedules = async () => {
      try {
        // 1. 활성 스케줄 개수 확인
        const { count: scheduleCount } = await supabase
          .from('schedules')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // 2. 활성 로테이션 개수 확인
        const { count: rotationCount } = await supabase
          .from('rotation_broadcasts')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // 3. 현재 송출 상태 조회
        const { data: currentState } = await supabase
          .from('display_current_state')
          .select('*')
          .order('activated_at', { ascending: false })
          .limit(1)
          .single();

        // 스케줄/로테이션 개수 로깅 (변경 시에만)
        const countKey = `schedules:${scheduleCount || 0}-rotations:${rotationCount || 0}`;
        if (lastStateRef.current !== countKey && !currentState) {
          if (scheduleCount === 0 && rotationCount === 0) {
            addLog('warn', 'ScheduleMonitor', '⚠️ No active schedules or rotations', {
              active_schedules: 0,
              active_rotations: 0,
              recommendation: 'Create a schedule or rotation to automate display',
            });
          } else {
            addLog('info', 'ScheduleMonitor', `📊 System status`, {
              active_schedules: scheduleCount || 0,
              active_rotations: rotationCount || 0,
              display_state: 'idle',
            });
          }
          lastStateRef.current = countKey;
        }

        if (!currentState) {
          if (lastStateRef.current !== null) {
            addLog('info', 'ScheduleMonitor', 'No content being displayed', {});
            lastStateRef.current = null;
          }
          return;
        }

        // 상태가 변경되었는지 확인
        const currentStateKey = `${currentState.source}-${currentState.template_id}-${currentState.source_id}`;
        
        if (lastStateRef.current !== currentStateKey) {
          // 템플릿 정보 조회
          const { data: template } = await supabase
            .from('message_templates')
            .select('name, category')
            .eq('id', currentState.template_id)
            .single();

          // 스케줄 정보 조회 (source가 schedule인 경우)
          let scheduleName = null;
          if (currentState.source === 'schedule' && currentState.source_id) {
            // Rotation broadcast 체크
            const { data: rotation } = await supabase
              .from('rotation_broadcasts')
              .select('name, current_index, template_ids')
              .eq('id', currentState.source_id)
              .single();

            if (rotation) {
              // Rotation broadcast
              scheduleName = `${rotation.name} (${rotation.current_index + 1}/${rotation.template_ids.length})`;
              
              addLog('success', 'ScheduleMonitor', '🔄 Rotation switched', {
                rotation_name: rotation.name,
                template_name: template?.name,
                current_index: rotation.current_index,
                total_templates: rotation.template_ids.length,
                activated_at: currentState.activated_at,
              });
            } else {
              // Regular schedule
              const { data: schedule } = await supabase
                .from('schedules')
                .select('name')
                .eq('id', currentState.source_id)
                .single();

              scheduleName = schedule?.name;
              
              addLog('success', 'ScheduleMonitor', '📅 Schedule executed', {
                schedule_name: scheduleName,
                template_name: template?.name,
                priority: currentState.priority,
                activated_at: currentState.activated_at,
                expires_at: currentState.expires_at,
              });
            }
          } else if (currentState.source === 'manual') {
            addLog('info', 'ScheduleMonitor', '✋ Manual display', {
              template_name: template?.name,
              activated_at: currentState.activated_at,
            });
          }

          lastStateRef.current = currentStateKey;
        }

        // Rotation 전환 시간 체크
        if (currentState.source === 'schedule' && currentState.source_id) {
          const { data: rotation } = await supabase
            .from('rotation_broadcasts')
            .select('next_switch_at, duration_per_template')
            .eq('id', currentState.source_id)
            .single();

          if (rotation && rotation.next_switch_at) {
            const nextSwitch = new Date(rotation.next_switch_at);
            const now = new Date();
            const timeUntilSwitch = nextSwitch.getTime() - now.getTime();
            
            // 10초 이내에 전환 예정이면 로그
            if (timeUntilSwitch > 0 && timeUntilSwitch <= 10000) {
              addLog('debug', 'ScheduleMonitor', `⏰ Rotation switching in ${Math.ceil(timeUntilSwitch / 1000)}s`, {
                next_switch_at: rotation.next_switch_at,
              });
            }
          }
        }
      } catch (error) {
        addLog('error', 'ScheduleMonitor', 'Monitor error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    // 즉시 한 번 실행
    addLog('info', 'ScheduleMonitor', '🎬 Server schedule monitor started', {});
    monitorSchedules();

    // 매 30초마다 실행 (과도한 호출 방지)
    intervalRef.current = setInterval(monitorSchedules, 30 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        addLog('info', 'ScheduleMonitor', 'Server schedule monitor stopped', {});
      }
    };
  }, [user]);
}