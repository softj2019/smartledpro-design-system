-- ================================================================
-- RLS (Row Level Security) Policies
-- Project: 고양 스마트시티 리빙랩 - 전광판 송출 시스템
-- Date: 2024-12-16
-- ================================================================

-- ================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ================================================================

ALTER TABLE displays ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_air_quality_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 2. displays POLICIES
-- ================================================================

-- Anyone can view displays
CREATE POLICY "Anyone can view displays"
ON displays FOR SELECT
USING (true);

-- Only ADMIN can insert displays
CREATE POLICY "Only ADMIN can insert displays"
ON displays FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
);

-- Only ADMIN can update displays
CREATE POLICY "Only ADMIN can update displays"
ON displays FOR UPDATE
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
);

-- Only ADMIN can delete displays
CREATE POLICY "Only ADMIN can delete displays"
ON displays FOR DELETE
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
);

-- ================================================================
-- 3. display_config POLICIES
-- ================================================================

CREATE POLICY "Anyone can view display_config"
ON display_config FOR SELECT
USING (true);

CREATE POLICY "OPERATOR and ADMIN can modify display_config"
ON display_config FOR ALL
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('OPERATOR', 'ADMIN')
)
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('OPERATOR', 'ADMIN')
);

-- ================================================================
-- 4. weather_stations & air_stations POLICIES
-- ================================================================

CREATE POLICY "Anyone can view weather_stations"
ON weather_stations FOR SELECT
USING (true);

CREATE POLICY "Only ADMIN can modify weather_stations"
ON weather_stations FOR ALL
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
)
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
);

CREATE POLICY "Anyone can view air_stations"
ON air_stations FOR SELECT
USING (true);

CREATE POLICY "Only ADMIN can modify air_stations"
ON air_stations FOR ALL
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
)
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
);

-- ================================================================
-- 5. message_templates POLICIES
-- ================================================================

CREATE POLICY "Anyone can view templates"
ON message_templates FOR SELECT
USING (true);

CREATE POLICY "OPERATOR and ADMIN can insert templates"
ON message_templates FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('OPERATOR', 'ADMIN')
);

CREATE POLICY "Owner or ADMIN can update templates"
ON message_templates FOR UPDATE
USING (
  created_by = auth.uid() 
  OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
)
WITH CHECK (
  created_by = auth.uid() 
  OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
);

CREATE POLICY "Owner or ADMIN can delete templates"
ON message_templates FOR DELETE
USING (
  created_by = auth.uid() 
  OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
);

-- ================================================================
-- 6. schedules POLICIES
-- ================================================================

CREATE POLICY "Anyone can view schedules"
ON schedules FOR SELECT
USING (true);

CREATE POLICY "OPERATOR and ADMIN can insert schedules"
ON schedules FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('OPERATOR', 'ADMIN')
);

CREATE POLICY "Owner or ADMIN can update schedules"
ON schedules FOR UPDATE
USING (
  created_by = auth.uid() 
  OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
)
WITH CHECK (
  created_by = auth.uid() 
  OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
);

CREATE POLICY "Owner or ADMIN can delete schedules"
ON schedules FOR DELETE
USING (
  created_by = auth.uid() 
  OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
);

-- ================================================================
-- 7. display_state POLICIES
-- ================================================================

CREATE POLICY "Anyone can view display_state"
ON display_state FOR SELECT
USING (true);

CREATE POLICY "OPERATOR and ADMIN can insert display_state"
ON display_state FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('OPERATOR', 'ADMIN')
);

CREATE POLICY "OPERATOR and ADMIN can update display_state"
ON display_state FOR UPDATE
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('OPERATOR', 'ADMIN')
)
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('OPERATOR', 'ADMIN')
);

-- Only EMERGENCY users can delete emergency messages
CREATE POLICY "Only EMERGENCY users can delete emergency messages"
ON display_state FOR DELETE
USING (
  content_type != 'EMERGENCY'
  OR
  (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'ADMIN'
    OR
    (
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'OPERATOR' 
      AND (auth.jwt() ->> 'user_metadata')::jsonb ->> 'can_emergency' = 'true'
    )
  )
);

-- ================================================================
-- 8. weather_air_quality_readings POLICIES
-- ================================================================

CREATE POLICY "Anyone can view readings"
ON weather_air_quality_readings FOR SELECT
USING (true);

-- Only Edge Functions (service_role) can insert readings
-- This is handled by service_role key, not by RLS

-- ================================================================
-- 9. audit_logs POLICIES
-- ================================================================

CREATE POLICY "Anyone can view audit_logs"
ON audit_logs FOR SELECT
USING (true);

-- Only Edge Functions (service_role) can insert audit_logs
-- This is handled by service_role key, not by RLS

-- ================================================================
-- RLS Setup Complete
-- ================================================================
