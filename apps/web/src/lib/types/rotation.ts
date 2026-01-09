// ================================================================
// Rotation Type Definitions - 순차 반복 타입 정의
// ================================================================

export interface Rotation {
  id: string;
  name: string;
  template_ids: string[];
  duration_per_template: number; // ✅ 초 단위 (seconds)
  start_date: string;
  end_date: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RotationWithTemplates extends Rotation {
  template_names?: string[];
}