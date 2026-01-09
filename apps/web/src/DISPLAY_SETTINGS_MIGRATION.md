# Display Settings 마이그레이션 가이드

## 문제점

KV Store 삭제 시 display settings (위치, 크기, 테두리 표시) 설정이 PostgreSQL로 마이그레이션되지 않고 하드코딩된 기본값만 사용하게 되었습니다.

## 해결 방법

`display_settings` 테이블을 PostgreSQL에 생성하고 서버 코드를 수정했습니다.

## Supabase SQL Editor에서 실행

아래 SQL을 Supabase SQL Editor에서 실행하세요:

```sql
-- ================================================================
-- display_settings 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS display_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  scale_x DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
  scale_y DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
  show_border BOOLEAN NOT NULL DEFAULT true,
  default_template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_scale CHECK (scale_x > 0 AND scale_y > 0 AND scale_x <= 5 AND scale_y <= 5)
);

-- 초기 데이터 삽입 (없을 경우)
INSERT INTO display_settings (position_x, position_y, scale_x, scale_y, show_border)
SELECT 0, 0, 1.00, 1.00, true
WHERE NOT EXISTS (SELECT 1 FROM display_settings);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_display_settings_updated_at ON display_settings;
CREATE TRIGGER trg_display_settings_updated_at
BEFORE UPDATE ON display_settings
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- RLS 비활성화 (Service Role Key 사용)
ALTER TABLE display_settings DISABLE ROW LEVEL SECURITY;

-- 코멘트 추가
COMMENT ON TABLE display_settings IS '전광판 UI 설정 - 위치, 크기, 테두리 표시';
COMMENT ON COLUMN display_settings.position_x IS 'X 좌표 (px)';
COMMENT ON COLUMN display_settings.position_y IS 'Y 좌표 (px)';
COMMENT ON COLUMN display_settings.scale_x IS 'X축 배율 (0.01 ~ 5.00)';
COMMENT ON COLUMN display_settings.scale_y IS 'Y축 배율 (0.01 ~ 5.00)';
COMMENT ON COLUMN display_settings.show_border IS '테두리 표시 여부';
COMMENT ON COLUMN display_settings.default_template_id IS '기본 템플릿 ID';
```

## 변경된 기능

### 1. GET /display/current
- `display_settings` 테이블에서 설정 조회
- 없으면 기본값 사용

### 2. PUT /display/settings
- `display_settings` 테이블에 설정 저장 (UPSERT)
- Audit Log 기록

### 3. GET /display/settings/history
- Audit Log에서 변경 이력 조회 (기존과 동일)

## 테스트

1. 전광판 컨트롤러에서 위치/크기 조정
2. 테두리 표시/숨김 토글
3. 설정이 새로고침 후에도 유지되는지 확인
4. /display/view 페이지에서 테두리가 정상 표시/숨김되는지 확인

## 복구 완료 사항

✅ 테두리 표시 삭제 기능
✅ 위치 및 크기 조정 설정 저장
✅ 설정 변경 이력 조회
✅ 프리셋 적용 기능
✅ 히스토리 복원 기능
