// ================================================================
// Schedule KV Store Helper Functions
// ================================================================

import * as kv from './kv_store.tsx';

// ================================================================
// Types (duplicated from frontend for server use)
// ================================================================

export type RepeatType = 'none' | 'daily' | 'weekly' | 'custom';

export interface RepeatConfig {
  days_of_week?: number[];
  interval?: number;
}

export interface Schedule {
  id: string;
  name: string;
  template_id: string;
  start_datetime: string;
  end_datetime?: string;
  repeat_type: RepeatType;
  repeat_config?: RepeatConfig;
  is_active: boolean;
  priority: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
}

export interface ScheduleExecution {
  id: string;
  schedule_id: string;
  template_id: string;
  executed_at: string;
  status: 'success' | 'failed';
  error_message?: string;
}

// ================================================================
// Schedule CRUD Functions
// ================================================================

/**
 * 스케줄 생성
 */
export async function createSchedule(schedule: Schedule): Promise<void> {
  // 1. 스케줄 데이터 저장
  await kv.set(`schedule:${schedule.id}`, schedule);
  
  // 2. 전체 스케줄 목록에 추가
  const allSchedules = await kv.get<string[]>('schedules:all') || [];
  if (!allSchedules.includes(schedule.id)) {
    allSchedules.push(schedule.id);
    await kv.set('schedules:all', allSchedules);
  }
  
  // 3. 활성 스케줄 목록에 추가 (is_active인 경우)
  if (schedule.is_active) {
    const activeSchedules = await kv.get<string[]>('schedules:active') || [];
    if (!activeSchedules.includes(schedule.id)) {
      activeSchedules.push(schedule.id);
      await kv.set('schedules:active', activeSchedules);
    }
  }
}

/**
 * 스케줄 조회 (단일)
 */
export async function getSchedule(id: string): Promise<Schedule | null> {
  return await kv.get<Schedule>(`schedule:${id}`);
}

/**
 * 모든 스케줄 조회
 */
export async function getAllSchedules(): Promise<Schedule[]> {
  const scheduleIds = await kv.get<string[]>('schedules:all') || [];
  const schedules: Schedule[] = [];
  
  for (const id of scheduleIds) {
    const schedule = await getSchedule(id);
    if (schedule) {
      schedules.push(schedule);
    }
  }
  
  // 시작 시간 기준 오름차순 정렬
  schedules.sort((a, b) => 
    new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
  );
  
  return schedules;
}

/**
 * 활성 스케줄 조회
 */
export async function getActiveSchedules(): Promise<Schedule[]> {
  const activeIds = await kv.get<string[]>('schedules:active') || [];
  const schedules: Schedule[] = [];
  
  for (const id of activeIds) {
    const schedule = await getSchedule(id);
    if (schedule && schedule.is_active) {
      schedules.push(schedule);
    }
  }
  
  // 우선순위 높은 순 정렬 (낮은 숫자가 높은 우선순위)
  schedules.sort((a, b) => a.priority - b.priority);
  
  return schedules;
}

/**
 * 스케줄 업데이트
 */
export async function updateSchedule(
  id: string, 
  updates: Partial<Schedule>
): Promise<Schedule | null> {
  const existing = await getSchedule(id);
  if (!existing) {
    return null;
  }
  
  // 활성화 상태 변경 시 인덱스 업데이트
  if (updates.is_active !== undefined && updates.is_active !== existing.is_active) {
    const activeSchedules = await kv.get<string[]>('schedules:active') || [];
    
    if (updates.is_active) {
      // 활성화: 목록에 추가
      if (!activeSchedules.includes(id)) {
        activeSchedules.push(id);
        await kv.set('schedules:active', activeSchedules);
      }
    } else {
      // 비활성화: 목록에서 제거
      const filtered = activeSchedules.filter(sid => sid !== id);
      await kv.set('schedules:active', filtered);
    }
  }
  
  // 스케줄 업데이트
  const updated: Schedule = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  await kv.set(`schedule:${id}`, updated);
  return updated;
}

/**
 * 스케줄 삭제
 */
export async function deleteSchedule(id: string): Promise<boolean> {
  const existing = await getSchedule(id);
  if (!existing) {
    return false;
  }
  
  // 1. 스케줄 데이터 삭제
  await kv.del(`schedule:${id}`);
  
  // 2. 전체 목록에서 제거
  const allSchedules = await kv.get<string[]>('schedules:all') || [];
  const filteredAll = allSchedules.filter(sid => sid !== id);
  await kv.set('schedules:all', filteredAll);
  
  // 3. 활성 목록에서 제거
  const activeSchedules = await kv.get<string[]>('schedules:active') || [];
  const filteredActive = activeSchedules.filter(sid => sid !== id);
  await kv.set('schedules:active', filteredActive);
  
  // 4. 실행 이력 삭제 (선택사항)
  const executions = await kv.get<string[]>(`schedule_executions:${id}`) || [];
  for (const execId of executions) {
    await kv.del(`schedule_execution:${id}:${execId}`);
  }
  await kv.del(`schedule_executions:${id}`);
  
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
  const { schedule_id, id } = execution;
  
  // 1. 실행 데이터 저장
  await kv.set(`schedule_execution:${schedule_id}:${id}`, execution);
  
  // 2. 실행 목록에 추가 (최근 100건만 보관)
  const executions = await kv.get<string[]>(`schedule_executions:${schedule_id}`) || [];
  executions.unshift(id);  // 최신 항목을 앞에 추가
  
  // 100개 초과 시 오래된 항목 삭제
  if (executions.length > 100) {
    const toDelete = executions.slice(100);
    for (const execId of toDelete) {
      await kv.del(`schedule_execution:${schedule_id}:${execId}`);
    }
    executions.splice(100);  // 100개만 유지
  }
  
  await kv.set(`schedule_executions:${schedule_id}`, executions);
}

/**
 * 스케줄의 실행 이력 조회
 */
export async function getScheduleExecutions(
  scheduleId: string, 
  limit: number = 100
): Promise<ScheduleExecution[]> {
  const executionIds = await kv.get<string[]>(`schedule_executions:${scheduleId}`) || [];
  const executions: ScheduleExecution[] = [];
  
  const idsToFetch = executionIds.slice(0, limit);
  
  for (const id of idsToFetch) {
    const execution = await kv.get<ScheduleExecution>(`schedule_execution:${scheduleId}:${id}`);
    if (execution) {
      executions.push(execution);
    }
  }
  
  return executions;
}

/**
 * 마지막 실행 이력 조회
 */
export async function getLastExecution(
  scheduleId: string
): Promise<ScheduleExecution | null> {
  const executions = await getScheduleExecutions(scheduleId, 1);
  return executions[0] || null;
}
