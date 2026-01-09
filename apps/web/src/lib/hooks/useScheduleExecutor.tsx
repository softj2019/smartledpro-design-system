// ================================================================
// useScheduleExecutor - 스케줄 자동 실행 훅
// ================================================================
// 매 10초마다 활성 스케줄을 확인하고 우선순위에 따라 템플릿을 display_current_state에 업데이트

import { useEffect, useRef } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../supabase';
import { addLog } from '../debug-logger';

export function useScheduleExecutor() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<Date | null>(null);

  useEffect(() => {
    // 로그인하지 않은 경우 실행하지 않음
    if (!user) {
      return;
    }

    const executeSchedules = async () => {
      try {
        const now = new Date();
        
        // 현재 시간에 활성화되어야 할 스케줄 조회
        const { data: activeSchedules, error } = await supabase
          .from('schedules')
          .select('*')
          .eq('is_active', true)
          .lte('start_at', now.toISOString())
          .gte('end_at', now.toISOString());

        if (error) {
          addLog('error', 'ScheduleExecutor', 'Failed to fetch schedules', { error: error.message });
          return;
        }

        if (!activeSchedules || activeSchedules.length === 0) {
          // 활성 스케줄이 없으면 아무것도 하지 않음
          return;
        }

        // 우선순위 정렬 (priority 높은 순)
        const sortedSchedules = activeSchedules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        const highestPrioritySchedule = sortedSchedules[0];

        addLog('info', 'ScheduleExecutor', 'Active schedules found', {
          count: activeSchedules.length,
          highest_priority: highestPrioritySchedule,
        });

        // 현재 display_current_state 확인
        const { data: currentState } = await supabase
          .from('display_current_state')
          .select('*')
          .order('activated_at', { ascending: false })
          .limit(1)
          .single();

        // 현재 송출 중인 스케줄과 같거나, 우선순위가 더 낮으면 업데이트하지 않음
        if (currentState && 
            currentState.source === 'schedule' &&
            currentState.source_id === highestPrioritySchedule.id &&
            currentState.priority >= highestPrioritySchedule.priority) {
          return; // 이미 올바른 스케줄이 송출 중
        }

        // 템플릿 조회
        let templateId = highestPrioritySchedule.template_id;
        
        // ✅ PostgreSQL에서 템플릿 확인
        const { data: template, error: templateError } = await supabase
          .from('message_templates')
          .select('id')
          .eq('id', templateId)
          .single();

        if (templateError || !template) {
          addLog('warn', 'ScheduleExecutor', 'Template not found', { templateId });
          return;
        }

        // display_current_state 업데이트
        await supabase.from('display_current_state').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        const { error: insertError } = await supabase.from('display_current_state').insert({
          template_id: templateId,
          source: 'schedule',
          source_id: highestPrioritySchedule.id,
          content_type: 'NOTICE', // 기본값
          priority: highestPrioritySchedule.priority || 150,
          activated_at: new Date().toISOString(),
          expires_at: highestPrioritySchedule.end_at,
        });

        if (insertError) {
          addLog('error', 'ScheduleExecutor', 'Failed to update display state', {
            error: insertError.message,
          });
          return;
        }

        addLog('info', 'ScheduleExecutor', 'Display updated', {
          schedule_id: highestPrioritySchedule.id,
          schedule_name: highestPrioritySchedule.name,
          template_id: templateId,
          priority: highestPrioritySchedule.priority,
        });

        lastCheckRef.current = now;
      } catch (error) {
        addLog('error', 'ScheduleExecutor', 'Schedule execution error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    // 즉시 한 번 실행
    addLog('info', 'ScheduleExecutor', 'Starting schedule executor system...', {});
    executeSchedules();

    // 매 10초마다 실행
    intervalRef.current = setInterval(executeSchedules, 10 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        addLog('info', 'ScheduleExecutor', 'Schedule executor system stopped', {});
      }
    };
  }, [user]);
}