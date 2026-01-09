-- ================================================================
-- Migration: Create rotation_broadcasts Table
-- Description: KV Store의 rotation 데이터를 PostgreSQL로 마이그레이션
-- ================================================================

-- 1. rotation_broadcasts 테이블 생성
CREATE TABLE IF NOT EXISTS public.rotation_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_ids JSONB NOT NULL, -- 템플릿 ID 배열
  duration_per_template INTEGER NOT NULL, -- 분 단위
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  priority INTEGER NOT NULL DEFAULT 150,
  current_index INTEGER NOT NULL DEFAULT 0,
  last_switched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_switch_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stopped_at TIMESTAMPTZ,
  stopped_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stopped_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_rotation_broadcasts_active ON public.rotation_broadcasts(is_active, start_date, end_date);
CREATE INDEX idx_rotation_broadcasts_priority ON public.rotation_broadcasts(priority DESC, created_at DESC);
CREATE INDEX idx_rotation_broadcasts_dates ON public.rotation_broadcasts(start_date, end_date);
CREATE INDEX idx_rotation_broadcasts_next_switch ON public.rotation_broadcasts(next_switch_at) WHERE is_active = true;

-- 3. 코멘트 추가
COMMENT ON TABLE public.rotation_broadcasts IS '순차 반복 송출 설정 (구 KV Store rotation_broadcast)';
COMMENT ON COLUMN public.rotation_broadcasts.template_ids IS '송출할 템플릿 ID 배열 (순서 유지)';
COMMENT ON COLUMN public.rotation_broadcasts.duration_per_template IS '템플릿당 표시 시간 (분)';
COMMENT ON COLUMN public.rotation_broadcasts.current_index IS '현재 송출 중인 템플릿 인덱스';
COMMENT ON COLUMN public.rotation_broadcasts.next_switch_at IS '다음 전환 예정 시간';

-- 4. RLS 정책 (선택사항)
ALTER TABLE public.rotation_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모든 인증된 사용자는 rotation을 조회할 수 있습니다" 
  ON public.rotation_broadcasts FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "OPERATOR 이상만 rotation을 생성/수정할 수 있습니다" 
  ON public.rotation_broadcasts FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('OPERATOR', 'ADMIN')
    )
  );
