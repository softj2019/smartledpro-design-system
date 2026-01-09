// ================================================================
// Schedule Type Definitions
// ================================================================

export type RepeatType = 'none' | 'daily' | 'weekly' | 'custom';
export type DisplayDurationType = '10sec' | '1min' | '5min' | '10min' | 'all-day' | 'custom';

export interface RepeatConfig {
  // repeat_type이 'weekly'일 때
  days_of_week?: number[];     // [0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토]
  
  // repeat_type이 'custom'일 때 (Phase 4+)
  interval?: number;           // 반복 간격 (일 단위)
}

export interface Schedule {
  id: string;                    // UUID
  name: string;                  // 스케줄 이름 (예: "매일 아침 공원 운영시간")
  template_id: string;           // 송출할 템플릿 ID
  start_datetime: string;        // ISO 8601 (예: "2024-01-20T09:00:00+09:00")
  end_datetime?: string;         // ISO 8601 (선택사항) - 스케줄 종료 날짜
  display_duration_type: DisplayDurationType;  // 표시 시간 타입
  display_duration_minutes?: number;  // 직접입력 시 분 단위 (custom인 경우)
  repeat_type: RepeatType;
  repeat_config?: RepeatConfig;
  is_active: boolean;            // 활성화 상태
  priority: number;              // 우선순위 (Phase 4, 기본값: 5)
  created_by: string;            // 생성자 User ID
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
  last_executed_at?: string;     // 마지막 실행 시간 (ISO 8601)
}

export interface ScheduleExecution {
  id: string;                    // UUID
  schedule_id: string;           // 스케줄 ID
  template_id: string;           // 송출된 템플릿 ID
  executed_at: string;           // 실행 시간 (ISO 8601)
  status: 'success' | 'failed';  // 실행 결과
  error_message?: string;        // 에러 메시지 (실패 시)
}

export interface ScheduleFormData {
  name: string;
  template_id: string;
  start_datetime: string;
  end_datetime?: string;
  display_duration_type: DisplayDurationType;
  display_duration_minutes?: number;
  repeat_type: RepeatType;
  repeat_config?: RepeatConfig;
  is_active: boolean;
}

// 요일 이름 매핑 (한글)
export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 반복 타입 라벨
export const REPEAT_TYPE_LABELS: Record<RepeatType, string> = {
  none: '반복 없음',
  daily: '매일',
  weekly: '매주',
  custom: '사용자 정의',
};

// 표시 시간 타입 라벨
export const DISPLAY_DURATION_LABELS: Record<DisplayDurationType, string> = {
  '10sec': '10초',
  '1min': '1분',
  '5min': '5분',
  '10min': '10분',
  'all-day': '종일',
  'custom': '직접입력',
};

// 표시 시간 타입 -> 분 변환
export function getDisplayDurationMinutes(type: DisplayDurationType, customMinutes?: number): number | null {
  switch (type) {
    case '10sec': return 10 / 60; // 10초 = 0.167분
    case '1min': return 1;
    case '5min': return 5;
    case '10min': return 10;
    case 'all-day': return null; // 종일은 null (무제한)
    case 'custom': return customMinutes || 1;
  }
}