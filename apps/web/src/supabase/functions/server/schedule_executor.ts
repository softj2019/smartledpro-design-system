// ================================================================
// Schedule Executor - Automatic Schedule Execution Engine
// PostgreSQL 전용 (KV Store 완전 제거)
// ================================================================

import * as scheduleHelpers from './schedule_db_helpers.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

// Initialize Supabase client for audit logs and display state
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

/**
 * Audit log 생성 헬퍼
 */
async function createExecutionAuditLog(
  scheduleId: string,
  scheduleName: string,
  templateId: string,
  templateName: string,
  status: 'success' | 'failed',
  previousTemplateId?: string | null,
  previousTemplateName?: string | null,
  previousSource?: string | null,
  errorMessage?: string
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: null, // ✅ 시스템 자동 실행은 user_id null (FK 제약 조건 만족)
      user_email: 'system@scheduler',
      user_role: 'SYSTEM',
      action: 'EXECUTE',
      resource_type: 'schedule',
      resource_id: scheduleId,
      action_detail: {
        schedule_name: scheduleName,
        template_id: templateId,
        template_name: templateName,
        status,
        error_message: errorMessage || null,
        executed_at: new Date().toISOString(),
        send_type: 'schedule', // ✅ 스케줄 전송 명시
        source: 'schedule', // ✅ 전송 소스
        // ✅ 이전 템플릿 정보 추가
        previous_template_id: previousTemplateId || null,
        previous_template_name: previousTemplateName || null,
        previous_source: previousSource || null,
        replaced: !!previousTemplateId, // 교체 여부
      },
    });
    console.log(`[Audit Log] Created execution audit log for schedule ${scheduleId}`, {
      previous: previousTemplateId ? `${previousTemplateName} (${previousSource})` : 'none'
    });
  } catch (error) {
    console.error('[Audit Log] Failed to create execution audit log:', error);
  }
}

/**
 * 스케줄 종료 audit log 생성 헬퍼
 */
async function createScheduleEndAuditLog(
  scheduleId: string,
  scheduleName: string,
  templateId: string,
  nextTemplateId: string | null,
  nextTemplateName: string | null
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: null,
      user_email: 'system@scheduler',
      user_role: 'SYSTEM',
      action: 'SCHEDULE_END',
      resource_type: 'schedule',
      resource_id: scheduleId,
      action_detail: {
        schedule_name: scheduleName,
        ended_template_id: templateId,
        ended_at: new Date().toISOString(),
        next_template_id: nextTemplateId,
        next_template_name: nextTemplateName,
        restored: !!nextTemplateId, // 복구 여부
        restored_type: nextTemplateId ? 'default' : 'none',
      },
    });
    console.log(`[Audit Log] Created schedule end audit log for schedule ${scheduleId}`);
  } catch (error) {
    console.error('[Audit Log] Failed to create schedule end audit log:', error);
  }
}

/**
 * 현재 시간(UTC)을 가져옴
 */
function getCurrentUTC(): Date {
  return new Date();
}

/**
 * 스케줄이 현재 실행되어야 하는지 체크
 */
function shouldExecuteSchedule(
  schedule: scheduleHelpers.Schedule,
  currentTime: Date
): boolean {
  const startDate = new Date(schedule.start_at);  // ✅ start_at 사용 (UTC)
  const endDate = schedule.end_at ? new Date(schedule.end_at) : null;  // ✅ end_at 사용 (UTC)

  console.log(`[Schedule Executor] Checking schedule: ${schedule.name} (${schedule.id.substring(0, 8)}...)`);
  console.log(`[Schedule Executor]   start_at: ${schedule.start_at}, current: ${currentTime.toISOString()}`);

  // 1. 시작 시간 체크 (현재 시간이 시작 시간 이후여야 함)
  if (currentTime < startDate) {
    console.log(`[Schedule Executor]   ❌ Not started yet (current < start)`);
    return false;
  }

  // 2. 종료 시간 체크 - ✅ 날짜만 비교 (시간은 무시)
  // end_at은 "이 날짜까지 반복"을 의미 (당일 종료 시간이 아님)
  if (endDate) {
    // 날짜만 비교 (시/분/초 제거)
    const currentDate = new Date(currentTime);
    currentDate.setHours(0, 0, 0, 0);
    
    const scheduleEndDate = new Date(endDate);
    scheduleEndDate.setHours(0, 0, 0, 0);
    
    if (currentDate > scheduleEndDate) {
      console.log(`[Schedule Executor]   ❌ Schedule ended: current=${currentDate.toISOString()}, end=${scheduleEndDate.toISOString()}`);
      return false;
    }
  }

  // 3. 마지막 실행 시간 체크 (1분 이내 재실행 방지)
  if (schedule.last_executed_at) {
    const lastExecuted = new Date(schedule.last_executed_at);
    const diffMinutes = (currentTime.getTime() - lastExecuted.getTime()) / (1000 * 60);
    
    console.log(`[Schedule Executor]   last_executed_at: ${schedule.last_executed_at}, diff: ${diffMinutes.toFixed(1)} min`);
    
    // ✅ 마지막 실행이 23시간 이상 지났으면 다시 실행 가능 (DAILY 반복 고려)
    if (schedule.recurrence_rule?.freq === 'DAILY' && diffMinutes < 1440 - 2) {
      // 23시간 58분 이내면 아직 오늘 실행됨 (2분 여유)
      // 단, 시/분이 일치하면 실행
      const startHour = startDate.getUTCHours();
      const startMinute = startDate.getUTCMinutes();
      const currentHour = currentTime.getUTCHours();
      const currentMinute = currentTime.getUTCMinutes();
      
      const hourMatch = currentHour === startHour;
      const minuteMatch = Math.abs(currentMinute - startMinute) <= 1;
      
      if (!hourMatch || !minuteMatch) {
        // 시/분이 일치하지 않으면 아직 실행 시간이 아님
        console.log(`[Schedule Executor]   ❌ Already executed today, time mismatch: start=${startHour}:${startMinute}, current=${currentHour}:${currentMinute}`);
        return false;
      } else {
        console.log(`[Schedule Executor]   ✅ Already executed but time matches (re-execution allowed)`);
      }
    } else if (diffMinutes < 1) {
      // 일반적인 1분 이내 재실행 방지
      console.log(`[Schedule Executor]   ❌ Executed within 1 minute (${diffMinutes.toFixed(1)} min ago)`);
      return false;
    }
  }

  // 4. 반복 설정 체크
  if (schedule.recurrence_rule === null || !schedule.recurrence_rule) {
    // 반복 없음: 마지막 실행이 없어야 함
    const canExecute = !schedule.last_executed_at;
    console.log(`[Schedule Executor]   No recurrence: can execute = ${canExecute}`);
    return canExecute;
  }

  if (schedule.recurrence_rule.freq === 'DAILY') {
    // 매일: 시작 시간과 현재 시간의 시/분이 일치하는지 확인 (±1분 오차 허용)
    const startHour = startDate.getUTCHours();
    const startMinute = startDate.getUTCMinutes();
    const currentHour = currentTime.getUTCHours();
    const currentMinute = currentTime.getUTCMinutes();

    const hourMatch = currentHour === startHour;
    const minuteMatch = Math.abs(currentMinute - startMinute) <= 1;

    const result = hourMatch && minuteMatch;
    
    if (result) {
      console.log(`[Schedule Executor]   ✅ DAILY schedule time match: start=${startHour}:${startMinute}, current=${currentHour}:${currentMinute}`);
    } else {
      console.log(`[Schedule Executor]   ❌ DAILY schedule time mismatch: start=${startHour}:${startMinute}, current=${currentHour}:${currentMinute}`);
    }

    return result;
  }

  if (schedule.recurrence_rule.freq === 'WEEKLY') {
    // 매주: 요일 체크 + 시/분 일치
    const currentDayOfWeek = currentTime.getDay(); // 0=일, 1=월, ..., 6=토
    const daysOfWeek = schedule.recurrence_rule.byweekday || [];

    if (!daysOfWeek.includes(currentDayOfWeek)) {
      console.log(`[Schedule Executor]   ❌ WEEKLY schedule day mismatch`);
      return false;
    }

    const startHour = startDate.getUTCHours();
    const startMinute = startDate.getUTCMinutes();
    const currentHour = currentTime.getUTCHours();
    const currentMinute = currentTime.getUTCMinutes();

    const hourMatch = currentHour === startHour;
    const minuteMatch = Math.abs(currentMinute - startMinute) <= 1;

    return hourMatch && minuteMatch;
  }

  if (schedule.recurrence_rule.freq === 'MONTHLY') {
    // 사용자 정의 반복 (Phase 4+)
    // TODO: 구현 예정
    console.log(`[Schedule Executor]   ❌ MONTHLY recurrence not implemented`);
    return false;
  }

  console.log(`[Schedule Executor]   ❌ Unknown recurrence type`);
  return false;
}

/**
 * 템플릿을 전광판으로 송출 (PostgreSQL 사용)
 * ✅ display_duration_type에 따라 expires_at 자동 계산
 */
async function sendTemplateToDisplay(
  templateId: string,
  scheduleId?: string,
  displayDurationType?: string,
  displayDurationMinutes?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // ✅ 표시 시간에 따른 expires_at 계산
    let expiresAt: string | null = null;
    
    if (displayDurationType) {
      const now = new Date();
      
      switch (displayDurationType) {
        case '10sec':
          expiresAt = new Date(now.getTime() + 10 * 1000).toISOString();
          console.log(`[Schedule Executor] Template will expire in 10 seconds at ${expiresAt}`);
          break;
        case '1min':
          expiresAt = new Date(now.getTime() + 1 * 60 * 1000).toISOString();
          console.log(`[Schedule Executor] Template will expire in 1 minute at ${expiresAt}`);
          break;
        case '5min':
          expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
          console.log(`[Schedule Executor] Template will expire in 5 minutes at ${expiresAt}`);
          break;
        case '10min':
          expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
          console.log(`[Schedule Executor] Template will expire in 10 minutes at ${expiresAt}`);
          break;
        case 'custom':
          if (displayDurationMinutes && displayDurationMinutes > 0) {
            expiresAt = new Date(now.getTime() + displayDurationMinutes * 60 * 1000).toISOString();
            console.log(`[Schedule Executor] Template will expire in ${displayDurationMinutes} minutes at ${expiresAt}`);
          }
          break;
        case 'all-day':
          // 종일 표시: 당일 23:59:59까지
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);
          expiresAt = endOfDay.toISOString();
          console.log(`[Schedule Executor] Template will expire at end of day: ${expiresAt}`);
          break;
        default:
          // 기본값: 만료 없음 (null)
          console.log(`[Schedule Executor] Template will not expire (continuous display)`);
      }
    }
    
    // display_current_state 테이블 전체 삭제 후 새로 삽입 (싱글톤 패턴)
    await supabase.from('display_current_state').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 레코드 삭제
    
    // 새로운 상태 삽입
    const { error } = await supabase.from('display_current_state').insert({
      template_id: templateId,
      source: scheduleId ? 'schedule' : 'manual',
      source_id: scheduleId || null,
      content_type: 'NOTICE', // 기본값, 실제로는 스케줄의 content_type 사용
      priority: 200,
      activated_at: new Date().toISOString(),
      expires_at: expiresAt, // ✅ 계산된 만료 시간
    });

    if (error) {
      throw error;
    }

    console.log(`[Schedule Executor] Sent template ${templateId} to display (source: ${scheduleId ? 'schedule' : 'manual'}, expires_at: ${expiresAt})`);
    return { success: true };
  } catch (error) {
    console.error(`[Schedule Executor] Failed to send template to display:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Rotation broadcast 자동 전환 체크 및 실행
 */
async function checkAndRotateRotationBroadcasts(): Promise<{
  rotated: boolean;
  rotation_id?: string;
  template_id?: string;
  error?: string;
}> {
  try {
    console.log('[Rotation Executor] Starting rotation broadcast check...');
    const currentTime = getCurrentUTC();
    
    // ✅ PostgreSQL에서 활성 rotation broadcasts 조회 (KV Store 제거)
    console.log('[Rotation Executor] Fetching rotation broadcasts from PostgreSQL...');
    const { data: rotations, error: fetchError } = await supabase
      .from('rotation_broadcasts')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })  // 높은 우선순위 먼저
      .order('created_at', { ascending: false });  // 같으면 최신 우선

    if (fetchError) {
      console.error('[Rotation Executor] Error fetching rotations:', fetchError);
      return { rotated: false, error: `Failed to fetch rotations: ${fetchError.message}` };
    }

    console.log(`[Rotation Executor] Found ${rotations?.length || 0} total rotations`);
    
    if (!rotations || rotations.length === 0) {
      console.log('[Rotation Executor] No rotation broadcasts found');
      return { rotated: false, error: 'No active rotation broadcasts' };
    }

    // 2. 현재 날짜 범위 내의 rotation 필터링
    const activeRotations = rotations.filter((rotation: any) => {
      const startDate = new Date(rotation.start_date);
      const endDate = new Date(rotation.end_date);
      
      const isInRange = currentTime >= startDate && currentTime <= endDate;
      console.log(`[Rotation Executor] Rotation ${rotation.name}: start=${rotation.start_date}, end=${rotation.end_date}, inRange=${isInRange}`);
      
      return isInRange;
    });

    console.log(`[Rotation Executor] ${activeRotations.length} active rotations in current date range`);

    if (activeRotations.length === 0) {
      console.log('[Rotation Executor] No rotations in current date range');
      return { rotated: false, error: 'No rotations in current date range' };
    }

    // ✅ 2-1. 현재 display_current_state 확인
    const { data: currentDisplayState, error: stateError } = await supabase
      .from('display_current_state')
      .select('*')
      .order('activated_at', { ascending: false })
      .limit(1)
      .single();

    console.log(`[Rotation Executor] Current display state:`, {
      exists: !!currentDisplayState,
      source_id: currentDisplayState?.source_id,
      template_id: currentDisplayState?.template_id,
      error: stateError?.message,
    });

    // ✅ 2-2. Rotation이 활성화되어 있지만 display_current_state에 없는 경우 첫 번째 템플릿 표시
    const highestPriorityRotation = activeRotations[0]; // 이미 우선순위로 정렬됨
    
    console.log(`[Rotation Executor] Highest priority rotation:`, {
      id: highestPriorityRotation.id,
      name: highestPriorityRotation.name,
      priority: highestPriorityRotation.priority,
      template_ids: highestPriorityRotation.template_ids,
    });
    
    // ✅ 개선: rotation이 이미 활성화되어 있으면 재초기화하지 않고 전환 체크만 수행
    const isCurrentRotation = currentDisplayState?.source === 'schedule' && currentDisplayState?.source_id === highestPriorityRotation.id;
    
    if (!isCurrentRotation) {
      console.log(`[Rotation Executor] Active rotation not in display_current_state. Initializing first template...`, {
        reason: !currentDisplayState ? 'no_display_state' : 'source_id_mismatch',
        current_source_id: currentDisplayState?.source_id,
        rotation_id: highestPriorityRotation.id,
      });
      
      const firstTemplateId = highestPriorityRotation.template_ids[0];
      
      // 템플릿 조회
      const { data: templateData, error: templateError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', firstTemplateId)
        .single();

      if (templateError || !templateData) {
        console.error(`[Rotation Executor] Failed to fetch first template ${firstTemplateId}:`, templateError);
        return { rotated: false, error: `Failed to fetch first template: ${templateError?.message}` };
      }

      console.log(`[Rotation Executor] Initializing rotation with first template: ${templateData.name}`);

      // ✅ 카테고리를 유효한 content_type으로 매핑
      const categoryMapping: Record<string, string> = {
        'emergency': 'EMERGENCY',
        'notice': 'NOTICE',
        'air_quality': 'NOTICE',  // ✅ AIR_QUALITY → NOTICE (CHECK 제약 조건 준수)
        'weather': 'WEATHER',
        'joongsan_match': 'NOTICE',  // ✅ 경기 일정은 NOTICE로 매핑
        'default': 'NOTICE',
      };
      
      const contentType = templateData.category 
        ? (categoryMapping[templateData.category.toLowerCase()] || 'NOTICE')
        : 'NOTICE';

      console.log(`[Rotation Executor] Template category: ${templateData.category} → content_type: ${contentType}`);

      // ✅ Display state 업데이트 (UPSERT: DELETE 없이 고정 ID로 INSERT/UPDATE)
      const DISPLAY_STATE_ID = '00000000-0000-0000-0000-000000000001';
      
      const { error: upsertError } = await supabase
        .from('display_current_state')
        .upsert({
          id: DISPLAY_STATE_ID,  // 고정 ID 사용
          template_id: templateData.id,
          source: 'schedule',  // ✅ CHECK 제약 조건 준수: rotation도 'schedule'로 저장, source_id로 구분
          source_id: highestPriorityRotation.id,
          content_type: contentType,  // ✅ 매핑된 content_type 사용
          priority: highestPriorityRotation.priority || 50,
          activated_at: currentTime.toISOString(),
          expires_at: null,  // ✅ rotation은 만료 없음 (무한 반복)
          updated_at: currentTime.toISOString(),
        }, {
          onConflict: 'id',  // id 충돌 시 업데이트
        });
      
      if (upsertError) {
        console.error(`[Rotation Executor] Error upserting display_current_state:`, upsertError);
        return { rotated: false, error: `Failed to update display state: ${upsertError.message}` };
      }

      console.log(`[Rotation Executor] Display state updated`);

      // ✅ Rotation 상태 업데이트 (last_switched_at, next_switch_at, current_index)
      const { error: updateError } = await supabase
        .from('rotation_broadcasts')
        .update({
          current_index: 0,
          last_switched_at: currentTime.toISOString(),
          next_switch_at: new Date(currentTime.getTime() + highestPriorityRotation.duration_per_template * 1000).toISOString(),
          updated_at: currentTime.toISOString(),
        })
        .eq('id', highestPriorityRotation.id);

      if (updateError) {
        console.error(`[Rotation Executor] Error updating rotation_broadcasts after init:`, updateError);
      } else {
        console.log(`[Rotation Executor] ✅ Rotation state updated: current_index=0, next_switch_at=${new Date(currentTime.getTime() + highestPriorityRotation.duration_per_template * 1000).toISOString()}`);
      }

      // Audit log 생성
      await supabase.from('audit_logs').insert({
        user_id: null,
        user_email: 'system@rotation',
        user_role: 'SYSTEM',
        action: 'ROTATION_INIT',
        resource_type: 'rotation_broadcast',
        resource_id: highestPriorityRotation.id,
        action_detail: {
          rotation_name: highestPriorityRotation.name,
          template_id: firstTemplateId,
          template_name: templateData.name,
          index: 0,
          total: highestPriorityRotation.template_ids.length,
          initialized_at: currentTime.toISOString(),
        },
      });

      return {
        rotated: true,
        rotation_id: highestPriorityRotation.id,
        template_id: firstTemplateId,
      };
    }

    // 3. 전환이 필요한 rotation 체크 (가장 우선순위가 높은 것만 처리)
    for (const rotation of activeRotations) {
      const lastSwitched = new Date(rotation.last_switched_at);
      const diffSeconds = (currentTime.getTime() - lastSwitched.getTime()) / 1000;
      
      console.log(`[Rotation Executor] Checking rotation: ${rotation.name}, last_switched: ${rotation.last_switched_at}, diff: ${diffSeconds.toFixed(1)} sec, duration: ${rotation.duration_per_template} sec`);
      
      // duration_per_template 경과 확인 (초 단위)
      if (diffSeconds >= rotation.duration_per_template) {
        console.log(`[Rotation Executor] ✅ Switching rotation: ${rotation.name} (${diffSeconds.toFixed(1)} sec elapsed)`);
        
        // 다음 템플릿으로 전환
        const nextIndex = (rotation.current_index + 1) % rotation.template_ids.length;
        const nextTemplateId = rotation.template_ids[nextIndex];
        
        console.log(`[Rotation Executor] Next template index: ${nextIndex}, template_id: ${nextTemplateId}`);
        
        // 템플릿 조회
        const { data: templateData, error: templateError } = await supabase
          .from('message_templates')
          .select('*')
          .eq('id', nextTemplateId)
          .single();

        if (templateError || !templateData) {
          console.error(`[Rotation Executor] ❌ Failed to fetch template ${nextTemplateId}:`, {
            error: templateError,
            rotation_id: rotation.id,
            rotation_name: rotation.name,
            current_index: rotation.current_index,
            next_index: nextIndex,
            template_ids: rotation.template_ids,
          });
          
          // ✅ 템플릿 조회 실패해도 인덱스는 증가시켜서 다음 템플릿으로 넘어가도록 함
          console.log(`[Rotation Executor] ⏭️ Skipping to next template due to fetch error...`);
          
          const { error: updateError } = await supabase
            .from('rotation_broadcasts')
            .update({
              current_index: nextIndex,
              last_switched_at: currentTime.toISOString(),
              next_switch_at: new Date(currentTime.getTime() + rotation.duration_per_template * 1000).toISOString(),
              updated_at: currentTime.toISOString(),
            })
            .eq('id', rotation.id);
          
          if (updateError) {
            console.error(`[Rotation Executor] Error updating rotation_broadcasts after skip:`, updateError);
          } else {
            console.log(`[Rotation Executor] ✅ Rotation index updated to ${nextIndex} (skipped missing template)`);
          }
          
          return {
            rotated: false,
            rotation_id: rotation.id,
            error: `Template ${nextTemplateId} not found, skipped to next`,
          };
        }

        console.log(`[Rotation Executor] Template fetched: ${templateData.name}`);

        // ✅ 카테고리를 유효한 content_type으로 매핑
        const categoryMapping: Record<string, string> = {
          'emergency': 'EMERGENCY',
          'notice': 'NOTICE',
          'air_quality': 'NOTICE',  // ✅ AIR_QUALITY → NOTICE (CHECK 제약 조건 준수)
          'weather': 'WEATHER',
          'joongsan_match': 'NOTICE',  // ✅ 경기 일정은 NOTICE로 매핑
          'default': 'NOTICE',
        };
        
        const contentType = templateData.category 
          ? (categoryMapping[templateData.category.toLowerCase()] || 'NOTICE')
          : 'NOTICE';

        console.log(`[Rotation Executor] Template category: ${templateData.category} → content_type: ${contentType}`);

        // ✅ Display state 업데이트 (UPSERT: DELETE 없이 고정 ID로 INSERT/UPDATE)
        const DISPLAY_STATE_ID = '00000000-0000-0000-0000-000000000001';
        
        const { error: upsertError } = await supabase
          .from('display_current_state')
          .upsert({
            id: DISPLAY_STATE_ID,  // 고정 ID 사용
            template_id: templateData.id,
            source: 'schedule',  // ✅ CHECK 제약 조건 준수: rotation도 'schedule'로 저장, source_id로 구분
            source_id: rotation.id,
            content_type: contentType,  // ✅ 매핑된 content_type 사용
            priority: rotation.priority || 50,
            activated_at: currentTime.toISOString(),
            expires_at: null,  // ✅ rotation은 만료 없음 (무한 반복)
            updated_at: currentTime.toISOString(),
          }, {
            onConflict: 'id',  // id 충돌 시 업데이트
          });
        
        if (upsertError) {
          console.error(`[Rotation Executor] Error upserting display_current_state:`, upsertError);
          return { rotated: false, error: `Failed to update display state: ${upsertError.message}` };
        }

        console.log(`[Rotation Executor] Display state updated`);

        // Rotation 상태 업데이트 (duration_per_template은 초 단위)
        rotation.current_index = nextIndex;
        rotation.last_switched_at = currentTime.toISOString();
        rotation.next_switch_at = new Date(currentTime.getTime() + rotation.duration_per_template * 1000).toISOString();
        
        // ✅ PostgreSQL: rotation_broadcasts 테이블 업데이트
        const { error: updateError } = await supabase
          .from('rotation_broadcasts')
          .update({
            current_index: nextIndex,
            last_switched_at: currentTime.toISOString(),
            next_switch_at: new Date(currentTime.getTime() + rotation.duration_per_template * 1000).toISOString(),
            updated_at: currentTime.toISOString(),
          })
          .eq('id', rotation.id);

        if (updateError) {
          console.error(`[Rotation Executor] Error updating rotation_broadcasts:`, updateError);
        }

        console.log(`[Rotation Executor] Rotation state updated: index=${nextIndex}`);

        // Audit log 성
        await supabase.from('audit_logs').insert({
          user_id: null,
          user_email: 'system@rotation',
          user_role: 'SYSTEM',
          action: 'ROTATION_SWITCH',
          resource_type: 'rotation_broadcast',
          resource_id: rotation.id,
          action_detail: {
            rotation_name: rotation.name,
            template_id: nextTemplateId,
            template_name: templateData.name,
            index: nextIndex,
            total: rotation.template_ids.length,
            switched_at: currentTime.toISOString(),
          },
        });

        console.log(`[Rotation Executor] ✅ Successfully switched to template: ${templateData.name} (${nextIndex + 1}/${rotation.template_ids.length})`);
        
        return {
          rotated: true,
          rotation_id: rotation.id,
          template_id: nextTemplateId,
        };
      }
    }

    console.log('[Rotation Executor] No rotations need switching at this time');
    return { rotated: false, error: 'No rotations need switching at this time' };
  } catch (error) {
    console.error('[Rotation Executor] Unexpected error:', error);
    return {
      rotated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 스케줄 자동 실행 체크 및 실행
 */
export async function checkAndExecuteSchedules(): Promise<{
  executed: boolean;
  schedule_id?: string;
  template_id?: string;
  executed_at?: string;
  schedule_ended?: boolean;
  restored_template?: string;
  error?: string;
}> {
  try {
    const currentTime = getCurrentUTC();
    console.log(`[Schedule Executor] Checking schedules at ${currentTime.toISOString()}`);

    // 0. Rotation broadcasts 체크 및 전환
    const rotationResult = await checkAndRotateRotationBroadcasts();
    
    // ✅ 현재 display_current_state 확인
    const { data: currentDisplayState } = await supabase
      .from('display_current_state')
      .select('*')
      .order('activated_at', { ascending: false })
      .limit(1)
      .single();

    // 1. 활성 스케줄 목록 조회
    const activeSchedules = await scheduleHelpers.getActiveSchedules();
    console.log(`[Schedule Executor] Found ${activeSchedules.length} active schedules`);

    // ✅ 종료된 스케줄 감지 및 처리
    await checkAndHandleEndedSchedules(activeSchedules, currentTime);

    if (activeSchedules.length === 0) {
      // 활성 스케줄 없으면 rotation 전환만 수행
      if (rotationResult.rotated) {
        console.log(`[Schedule Executor] Rotation switched, no active schedules`);
        return { executed: false, error: 'Rotation switched, no active schedules' };
      }
      return { executed: false, error: 'No active schedules' };
    }

    // 2. 실행 대상 스케줄 필터링
    const schedulesToExecute = activeSchedules.filter(schedule => 
      shouldExecuteSchedule(schedule, currentTime)
    );

    console.log(`[Schedule Executor] ${schedulesToExecute.length} schedules ready to execute`);

    if (schedulesToExecute.length === 0) {
      return { executed: false, error: 'No schedules to execute at this time' };
    }

    // 3. 우선순위 정렬 (낮은 숫자가 높은 우선순위)
    schedulesToExecute.sort((a, b) => a.priority - b.priority);

    // ✅ 4. Rotation과 Schedule 우선순위 비교
    const scheduleToExecute = schedulesToExecute[0];
    
    // Rotation이 활성화되어 있고, 현재 display_current_state가 rotation인 경우
    if (currentDisplayState && currentDisplayState.source === 'schedule' && currentDisplayState.source_id) {
      // Rotation을 확인 (source_id가 rotation_broadcasts 테이블에 있는지)
      const { data: currentRotation } = await supabase
        .from('rotation_broadcasts')
        .select('priority, is_active')
        .eq('id', currentDisplayState.source_id)
        .eq('is_active', true)
        .single();
      
      if (currentRotation) {
        // Rotation의 우선순위가 더 높으면 스케줄 실행 건너뛰기
        console.log(`[Schedule Executor] Comparing priorities: Schedule=${scheduleToExecute.priority}, Rotation=${currentRotation.priority}`);
        
        if (currentRotation.priority > scheduleToExecute.priority) {
          console.log(`[Schedule Executor] Schedule priority (${scheduleToExecute.priority}) is higher than Rotation (${currentRotation.priority}). Executing schedule.`);
        } else {
          console.log(`[Schedule Executor] Rotation priority (${currentRotation.priority}) is higher than or equal to Schedule (${scheduleToExecute.priority}). Skipping schedule execution.`);
          return { executed: false, error: 'Rotation has higher or equal priority' };
        }
      }
    }

    console.log(`[Schedule Executor] Executing schedule: ${scheduleToExecute.name || scheduleToExecute.id} (ID: ${scheduleToExecute.id})`);

    // ✅ 4-1. 현재 송출 중인 템플릿 정보 조회 (교체 전)
    const { data: previousState } = await supabase
      .from('display_current_state')
      .select('*')
      .order('activated_at', { ascending: false })
      .limit(1)
      .single();

    let previousTemplateId: string | null = null;
    let previousTemplateName: string | null = null;
    let previousSource: string | null = null;

    if (previousState) {
      previousTemplateId = previousState.template_id;
      previousSource = previousState.source;

      // 이전 템플릿 이름 조회
      const { data: previousTemplate } = await supabase
        .from('message_templates')
        .select('name')
        .eq('id', previousState.template_id)
        .single();

      previousTemplateName = previousTemplate?.name || 'Unknown Template';

      console.log(`[Schedule Executor] Previous template: ${previousTemplateName} (source: ${previousSource})`);
    } else {
      console.log(`[Schedule Executor] No previous template (first display)`);
    }

    // ✅ 4-2. 새로운 템플릿 이름 조회
    const { data: newTemplate } = await supabase
      .from('message_templates')
      .select('name')
      .eq('id', scheduleToExecute.template_id)
      .single();

    const newTemplateName = newTemplate?.name || 'Unknown Template';

    // 5. 템플릿 송출 (display_duration_type 전달)
    const sendResult = await sendTemplateToDisplay(
      scheduleToExecute.template_id, 
      scheduleToExecute.id,
      scheduleToExecute.display_duration_type || '5min', // ✅ 템플릿 표시 시간 타입 전달
      scheduleToExecute.display_duration_minutes || undefined // ✅ custom 시 분 단위 전달
    );

    const executionId = crypto.randomUUID();
    const executedAt = new Date().toISOString();

    if (sendResult.success) {
      // 6. 실행 이력 생성 (성공) - PostgreSQL에 저장
      const execution: scheduleHelpers.ScheduleExecution = {
        id: executionId,
        schedule_id: scheduleToExecute.id,
        template_id: scheduleToExecute.template_id,
        executed_at: executedAt,
        status: 'success',
      };

      await scheduleHelpers.createScheduleExecution(execution);
      console.log(`[Schedule Executor] Saved execution to DB`);

      // 7. 스케줄의 last_executed_at 업데이트
      await scheduleHelpers.updateSchedule(scheduleToExecute.id, {
        last_executed_at: executedAt,
      });

      console.log(`[Schedule Executor] Successfully executed schedule: ${scheduleToExecute.name || scheduleToExecute.id}`);

      // ✅ Audit log 생성 (이전 템플릿 정보 포함)
      await createExecutionAuditLog(
        scheduleToExecute.id,
        scheduleToExecute.name || 'Unnamed Schedule',
        scheduleToExecute.template_id,
        newTemplateName,
        'success',
        previousTemplateId,
        previousTemplateName,
        previousSource
      );

      return {
        executed: true,
        schedule_id: scheduleToExecute.id,
        template_id: scheduleToExecute.template_id,
        executed_at: executedAt,
      };
    } else {
      // 실행 실패
      const execution: scheduleHelpers.ScheduleExecution = {
        id: executionId,
        schedule_id: scheduleToExecute.id,
        template_id: scheduleToExecute.template_id,
        executed_at: executedAt,
        status: 'failed',
        error_message: sendResult.error,
      };

      await scheduleHelpers.createScheduleExecution(execution);

      console.error(`[Schedule Executor] Failed to execute schedule: ${scheduleToExecute.name || scheduleToExecute.id}`, sendResult.error);

      // ✅ Audit log 생성 (이전 템플릿 정보 포함)
      await createExecutionAuditLog(
        scheduleToExecute.id,
        scheduleToExecute.name || 'Unnamed Schedule',
        scheduleToExecute.template_id,
        newTemplateName,
        'failed',
        previousTemplateId,
        previousTemplateName,
        previousSource,
        sendResult.error
      );

      return {
        executed: false,
        schedule_id: scheduleToExecute.id,
        template_id: scheduleToExecute.template_id,
        error: sendResult.error,
      };
    }
  } catch (error) {
    console.error('[Schedule Executor] Unexpected error:', error);
    return {
      executed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 종료된 스케줄 감지 및 처리
 */
async function checkAndHandleEndedSchedules(
  activeSchedules: scheduleHelpers.Schedule[],
  currentTime: Date
): Promise<void> {
  try {
    // 현재 송출 중인 템플릿 확인
    const { data: currentState } = await supabase
      .from('display_current_state')
      .select('*')
      .order('activated_at', { ascending: false })
      .limit(1)
      .single();

    if (!currentState) {
      // 송출 중인 콘텐츠 없음
      return;
    }

    // ✅ 1. 템플릿 표시 시간(expires_at) 체크 - 최우선
    if (currentState.expires_at) {
      const expiresAt = new Date(currentState.expires_at);
      
      if (currentTime >= expiresAt) {
        console.log(`[Schedule Executor] Template has expired at ${currentState.expires_at}`);
        
        // 현재 스케줄 찾기
        const currentSchedule = currentState.source === 'schedule' 
          ? activeSchedules.find(s => s.id === currentState.source_id)
          : null;
        
        // 다른 실행 중인 스케줄 확인
        const runningSchedules = activeSchedules.filter(schedule => {
          if (currentSchedule && schedule.id === currentSchedule.id) return false; // 현재 스케줄 제외
          
          const startAt = new Date(schedule.start_at);
          const endAt = schedule.end_at ? new Date(schedule.end_at) : null;
          
          return startAt <= currentTime && (!endAt || endAt >= currentTime);
        });

        if (runningSchedules.length > 0) {
          // 다른 실행 중인 스케줄이 있음 - 가장 높은 우선순위 스케줄로 전환
          runningSchedules.sort((a, b) => a.priority - b.priority);
          const nextSchedule = runningSchedules[0];
          
          console.log(`[Schedule Executor] Template expired, switching to next schedule: ${nextSchedule.name}`);
          await sendTemplateToDisplay(
            nextSchedule.template_id, 
            nextSchedule.id,
            nextSchedule.display_duration_type || '5min',
            nextSchedule.display_duration_minutes || undefined
          );
          
          // 종료 로그 (다음 스케줄로 전환)
          const { data: nextTemplate } = await supabase
            .from('message_templates')
            .select('name')
            .eq('id', nextSchedule.template_id)
            .single();
          
          if (currentSchedule) {
            await createScheduleEndAuditLog(
              currentSchedule.id,
              currentSchedule.name || 'Unnamed Schedule',
              currentState.template_id,
              nextSchedule.template_id,
              nextTemplate?.name || 'Next Template'
            );
          }
        } else {
          // 실행 중인 다른 스케줄 없음 - 이전 템플릿으로 복구
          console.log(`[Schedule Executor] Template expired, restoring to previous template`);
          await restorePreviousTemplate(
            currentSchedule?.id || null,
            currentSchedule?.name || 'Expired Template',
            currentState.template_id
          );
        }
        
        return; // expires_at 처리 완료
      }
    }

    // ✅ 2. Rotation 체크 - source_id가 rotation_broadcasts에 있는지 확인
    if (currentState.source === 'schedule' && currentState.source_id) {
      const { data: rotationCheck } = await supabase
        .from('rotation_broadcasts')
        .select('id, is_active')
        .eq('id', currentState.source_id)
        .single();
      
      if (rotationCheck) {
        // Rotation인 경우 - 종료 처리 불필요 (rotation_executor에서 처리)
        console.log(`[Schedule Executor] Current display is rotation, skipping schedule end check`);
        return;
      }
    }

    // ✅ 3. 스케줄 소스인 경우만 end_at 체크
    if (currentState.source !== 'schedule') {
      // 스케줄로 송출된 것이 아니면 종료 처리 불필요
      return;
    }

    // 현재 송출 중인 스케줄 찾기
    const currentSchedule = activeSchedules.find(s => s.id === currentState.source_id);
    
    if (!currentSchedule) {
      // 스케줄이 삭제되었거나 비활성화됨
      console.log(`[Schedule Executor] Current schedule not found or inactive`);
      await restorePreviousTemplate(null, 'Unknown Schedule', currentState.template_id);
      return;
    }

    // ✅ 4. 스케줄 종료일(end_at) 체크
    if (currentSchedule.end_at) {
      const endTime = new Date(currentSchedule.end_at);
      
      if (currentTime > endTime) {
        // 스케줄 종료됨
        console.log(`[Schedule Executor] Schedule ${currentSchedule.name} has ended (end_at: ${currentSchedule.end_at})`);
        
        // 다른 활성 스케줄 확인
        const runningSchedules = activeSchedules.filter(schedule => {
          if (schedule.id === currentSchedule.id) return false; // 현재 종료된 스케줄 제외
          
          const startAt = new Date(schedule.start_at);
          const endAt = schedule.end_at ? new Date(schedule.end_at) : null;
          
          return startAt <= currentTime && (!endAt || endAt >= currentTime);
        });

        if (runningSchedules.length > 0) {
          // 다른 실행 중인 스케줄이 있음 - 가장 높은 우선순위 스케줄로 전환
          runningSchedules.sort((a, b) => a.priority - b.priority);
          const nextSchedule = runningSchedules[0];
          
          console.log(`[Schedule Executor] Switching to next schedule: ${nextSchedule.name}`);
          await sendTemplateToDisplay(
            nextSchedule.template_id, 
            nextSchedule.id,
            nextSchedule.display_duration_type || '5min',
            nextSchedule.display_duration_minutes || undefined
          );
          
          // 종료 로그 (다음 스케줄로 전환)
          const { data: nextTemplate } = await supabase
            .from('message_templates')
            .select('name')
            .eq('id', nextSchedule.template_id)
            .single();
          
          await createScheduleEndAuditLog(
            currentSchedule.id,
            currentSchedule.name || 'Unnamed Schedule',
            currentState.template_id,
            nextSchedule.template_id,
            nextTemplate?.name || 'Next Template'
          );
        } else {
          // 실행 중인 다른 스케줄 없음 - 이전 템플릿으로 복구
          await restorePreviousTemplate(
            currentSchedule.id,
            currentSchedule.name || 'Unnamed Schedule',
            currentState.template_id
          );
        }
      }
    }
  } catch (error) {
    console.error('[Schedule Executor] Error checking ended schedules:', error);
  }
}

/**
 * 이전 템플릿으로 복구 (audit_logs에서 조회)
 */
async function restorePreviousTemplate(
  endedScheduleId: string | null,
  endedScheduleName: string,
  endedTemplateId: string
): Promise<void> {
  try {
    // ✅ audit_logs에서 가장 최근 EXECUTE 로그 조회 (이전 템플릿 정보 포함)
    const { data: recentExecutionLog } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'EXECUTE')
      .eq('resource_type', 'schedule')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!recentExecutionLog || !recentExecutionLog.action_detail?.previous_template_id) {
      // 이전 템플릿 정보가 없으면 기본 템플릿으로 복구
      console.log(`[Schedule Executor] No previous template info in audit log, using default template`);
      await restoreDefaultTemplate(endedScheduleId, endedScheduleName, endedTemplateId);
      return;
    }

    const previousTemplateId = recentExecutionLog.action_detail.previous_template_id;
    const previousSource = recentExecutionLog.action_detail.previous_source || 'unknown';
    
    console.log(`[Schedule Executor] Found previous template from audit log: ${previousTemplateId} (source: ${previousSource})`);

    // 이전 템플릿 조회
    const { data: previousTemplate } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', previousTemplateId)
      .single();

    if (previousTemplate) {
      console.log(`[Schedule Executor] Restoring to previous template: ${previousTemplate.name}`);
      
      // display_current_state 업데이트
      await supabase.from('display_current_state').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('display_current_state').insert({
        template_id: previousTemplate.id,
        source: previousSource === 'schedule' ? 'schedule' : (previousSource === 'default' ? 'default' : 'manual'),
        source_id: null, // ✅ 원래 source_id는 복구하지 않음 (스케줄은 이미 종료됨)
        content_type: previousTemplate.category?.toUpperCase() || 'NOTICE',
        priority: 200,
        activated_at: new Date().toISOString(),
        expires_at: null, // ✅ 복구된 템플릿은 만료 시간 없음
      });

      // ✅ 복구 audit log 생성
      await supabase.from('audit_logs').insert({
        user_id: null,
        user_email: 'system@scheduler',
        user_role: 'SYSTEM',
        action: 'RESTORE',
        resource_type: 'template',
        resource_id: previousTemplate.id,
        action_detail: {
          restored_from: 'schedule_end',
          ended_schedule_id: endedScheduleId,
          ended_schedule_name: endedScheduleName,
          ended_template_id: endedTemplateId,
          restored_template_id: previousTemplate.id,
          restored_template_name: previousTemplate.name,
          previous_source: previousSource,
          restored_at: new Date().toISOString(),
        },
      });

      console.log(`[Schedule Executor] Successfully restored to previous template: ${previousTemplate.name}`);
    } else {
      console.log(`[Schedule Executor] Previous template not found, using default template`);
      await restoreDefaultTemplate(endedScheduleId, endedScheduleName, endedTemplateId);
    }
  } catch (error) {
    console.error('[Schedule Executor] Error restoring previous template:', error);
    // 오류 발생 시 기본 템플릿으로 복구
    await restoreDefaultTemplate(endedScheduleId, endedScheduleName, endedTemplateId);
  }
}

/**
 * 기본 템플릿으로 복구
 */
async function restoreDefaultTemplate(
  endedScheduleId: string | null,
  endedScheduleName: string,
  endedTemplateId: string
): Promise<void> {
  try {
    // 기본 템플릿 설정 조회
    const { data: settings } = await supabase
      .from('display_settings')
      .select('*')
      .limit(1)
      .single();

    if (settings && settings.default_template_id) {
      // 기본 템플릿으로 복구
      const { data: defaultTemplate } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', settings.default_template_id)
        .single();

      if (defaultTemplate) {
        console.log(`[Schedule Executor] Restoring to default template: ${defaultTemplate.name}`);
        
        // display_current_state 업데이트
        await supabase.from('display_current_state').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('display_current_state').insert({
          template_id: defaultTemplate.id,
          source: 'default',
          source_id: null,
          content_type: defaultTemplate.category?.toUpperCase() || 'NOTICE',
          priority: 200,
          activated_at: new Date().toISOString(),
          expires_at: null,
        });

        // 종료 및 복구 로그
        if (endedScheduleId) {
          await createScheduleEndAuditLog(
            endedScheduleId,
            endedScheduleName,
            endedTemplateId,
            defaultTemplate.id,
            defaultTemplate.name
          );
        }

        console.log(`[Schedule Executor] Successfully restored to default template`);
      } else {
        console.log(`[Schedule Executor] Default template not found, clearing display`);
        await clearDisplay(endedScheduleId, endedScheduleName, endedTemplateId);
      }
    } else {
      console.log(`[Schedule Executor] No default template configured, clearing display`);
      await clearDisplay(endedScheduleId, endedScheduleName, endedTemplateId);
    }
  } catch (error) {
    console.error('[Schedule Executor] Error restoring default template:', error);
  }
}

/**
 * 전광판 표시 내용 초기화
 */
async function clearDisplay(
  endedScheduleId: string | null,
  endedScheduleName: string,
  endedTemplateId: string
): Promise<void> {
  try {
    // display_current_state 비우기
    await supabase.from('display_current_state').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // 종료 로그 (복구 없음)
    if (endedScheduleId) {
      await createScheduleEndAuditLog(
        endedScheduleId,
        endedScheduleName,
        endedTemplateId,
        null,
        null
      );
    }

    console.log(`[Schedule Executor] Display cleared`);
  } catch (error) {
    console.error('[Schedule Executor] Error clearing display:', error);
  }
}