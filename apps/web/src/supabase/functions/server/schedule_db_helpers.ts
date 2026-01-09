// ================================================================
// Schedule Database Helper Functions - PostgreSQL 전용
// KV Store 완전 제거, PostgreSQL만 사용
// ================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ================================================================
// Types - PostgreSQL 스키마에 맞춤
// ================================================================

export interface RecurrenceRule {
  freq?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval?: number;
  byweekday?: number[];
  until?: string;
}

export interface Schedule {
  id: string;
  name?: string | null;
  template_id: string | null;
  content_type: string; // 'NOTICE' | 'EMERGENCY' | 'WEATHER'
  display_ids: string[]; // JSONB array
  start_at: string; // TIMESTAMPTZ
  end_at: string; // TIMESTAMPTZ
  recurrence_rule: RecurrenceRule | null;
  priority: number;
  is_active: boolean;
  display_duration_type?: string | null; // ✅ 템플릿 표시 시간 타입 (1min, 5min, 10min, all-day, custom)
  display_duration_minutes?: number | null; // ✅ 직접 입력 표시 시간 (분)
  last_executed_at?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleExecution {
  id: string;
  schedule_id: string;
  template_id: string;
  executed_at: string;
  status: 'success' | 'failed';
  error_message?: string | null;
  execution_context?: Record<string, any> | null;
  created_at?: string;
}

// ================================================================
// Schedule CRUD Functions
// ================================================================

/**
 * 스케줄 생성
 */
export async function createSchedule(schedule: Schedule): Promise<void> {
  const { error } = await supabase
    .from('schedules')
    .insert({
      id: schedule.id,
      name: schedule.name || null,
      template_id: schedule.template_id,
      content_type: schedule.content_type,
      display_ids: schedule.display_ids,
      start_at: schedule.start_at,
      end_at: schedule.end_at,
      recurrence_rule: schedule.recurrence_rule || null,
      priority: schedule.priority,
      is_active: schedule.is_active !== false,
      display_duration_type: schedule.display_duration_type || null,
      display_duration_minutes: schedule.display_duration_minutes || null,
      last_executed_at: schedule.last_executed_at || null,
      created_by: schedule.created_by,
      created_at: schedule.created_at,
      updated_at: schedule.updated_at,
    });

  if (error) {
    throw new Error(`Failed to create schedule: ${error.message}`);
  }
}

/**
 * 스케줄 조회 (단일)
 */
export async function getSchedule(id: string): Promise<Schedule | null> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get schedule: ${error.message}`);
  }

  return data as Schedule;
}

/**
 * 모든 스케줄 조회
 */
export async function getAllSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('start_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get all schedules: ${error.message}`);
  }

  return (data || []) as Schedule[];
}

/**
 * 활성 스케줄 조회
 */
export async function getActiveSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .order('start_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get active schedules: ${error.message}`);
  }

  return (data || []) as Schedule[];
}

/**
 * 스케줄 업데이트
 */
export async function updateSchedule(
  id: string,
  updates: Partial<Schedule>
): Promise<Schedule | null> {
  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('schedules')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to update schedule: ${error.message}`);
  }

  return data as Schedule;
}

/**
 * 스케줄 삭제
 */
export async function deleteSchedule(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete schedule: ${error.message}`);
  }

  return true;
}

// ================================================================
// Schedule Execution Functions
// ================================================================

/**
 * 실행 이력 생성
 */
export async function createScheduleExecution(
  execution: ScheduleExecution
): Promise<void> {
  const { error } = await supabase
    .from('schedule_executions')
    .insert({
      id: execution.id,
      schedule_id: execution.schedule_id,
      template_id: execution.template_id,
      executed_at: execution.executed_at,
      status: execution.status,
      error_message: execution.error_message || null,
      execution_context: execution.execution_context || null,
      created_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to create schedule execution: ${error.message}`);
  }
}

/**
 * 스케줄의 실행 이력 조회
 */
export async function getScheduleExecutions(
  scheduleId: string,
  limit: number = 100
): Promise<ScheduleExecution[]> {
  const { data, error } = await supabase
    .from('schedule_executions')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('executed_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get schedule executions: ${error.message}`);
  }

  return (data || []) as ScheduleExecution[];
}

/**
 * 마지막 실행 이력 조회
 */
export async function getLastExecution(
  scheduleId: string
): Promise<ScheduleExecution | null> {
  const { data, error } = await supabase
    .from('schedule_executions')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('executed_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get last execution: ${error.message}`);
  }

  return data as ScheduleExecution;
}

/**
 * 모든 최근 실행 이력 조회
 */
export async function getAllRecentExecutions(
  limit: number = 100
): Promise<ScheduleExecution[]> {
  const { data, error } = await supabase
    .from('schedule_executions')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get recent executions: ${error.message}`);
  }

  return (data || []) as ScheduleExecution[];
}

/**
 * 실행 통계 조회
 */
export async function getExecutionStats(scheduleId?: string): Promise<{
  total: number;
  success: number;
  failed: number;
  success_rate: number;
}> {
  let query = supabase.from('schedule_executions').select('status');
  
  if (scheduleId) {
    query = query.eq('schedule_id', scheduleId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get execution stats: ${error.message}`);
  }

  const executions = (data || []) as Array<{ status: string }>;
  const total = executions.length;
  const success = executions.filter(e => e.status === 'success').length;
  const failed = executions.filter(e => e.status === 'failed').length;
  const success_rate = total > 0 ? (success / total) * 100 : 0;

  return { total, success, failed, success_rate };
}