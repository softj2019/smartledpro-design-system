# 03_features / 03_priority_conflict_rules.md

# 송출 우선순위 및 충돌 처리 규칙

## 1. 절대 우선순위 규칙

### 1.1 우선순위 정의 (변경 불가)

```
EMERGENCY(100) > NOTICE(200) > WEATHER(300)
낮은 숫자 = 높은 우선순위 (Unix Convention)
```

| 우선순위 | 콘텐츠 타입 | priority 값 | 설명 | 덮어쓰기 규칙 |
|----------|-------------|-------------|------|---------------|
| **최고** | EMERGENCY | 100 | 재난·안전 긴급 메시지 | 모든 콘텐츠 덮어씀 |
| **중간** | NOTICE | 200 | 운영자 공지 사항 | WEATHER만 덮어씀 |
| **기본** | WEATHER | 300 | 기상청·AirKorea 자동 데이터 | 덮어쓰기 안 됨 |

### 1.2 우선순위 적용 로직

```typescript
// 현재 송출 콘텐츠 결정 로직 (절대 변경 금지)
const runningSchedules = activeSchedules.filter(schedule => {
  const startAt = new Date(schedule.start_at);
  const endAt = schedule.end_at ? new Date(schedule.end_at) : null;
  return startAt <= now && (!endAt || endAt >= now);
});

// 우선순위 정렬: 낮은 숫자가 높은 우선순위
runningSchedules.sort((a, b) => a.priority - b.priority);

// 최고 우선순위 선택
const topSchedule = runningSchedules[0];
```

**핵심 원칙**:
1. **priority 낮은 것이 최우선** (100 > 200 > 300)
2. **priority 동일 시 먼저 생성된 것이 우선** (배열 순서)
3. **시간 범위 내에 있는 것만 유효** (start_at ≤ NOW ≤ end_at)

---

## 2. 시나리오별 우선순위 처리

### 시나리오 1: WEATHER 자동 송출 중 → NOTICE 송출

#### 상황
- 10:00 - WEATHER 자동 송출 시작 (priority=300)
- 10:30 - 운영자가 "방역 안내" NOTICE 즉시 송출 (priority=200)

#### 처리 로직
```sql
-- 1. NOTICE 송출 시
INSERT INTO display_state (
  display_id,
  template_id,
  content_type,
  priority,
  start_at,
  end_at
) VALUES (
  {display_id},
  {template_id},
  'NOTICE',
  200,
  NOW(),
  NULL -- 또는 특정 시각
);

-- 2. 현재 송출 콘텐츠 조회
SELECT * FROM display_state
WHERE display_id = {display_id}
  AND (start_at IS NULL OR start_at <= NOW())
  AND (end_at IS NULL OR end_at >= NOW())
ORDER BY priority DESC, updated_at DESC
LIMIT 1;

-- 결과: NOTICE (priority=200)이 반환됨
```

#### 결과
- ✅ **NOTICE가 즉시 표시됨** (priority 200 > 300)
- ✅ WEATHER는 백그라운드에 유지 (삭제 안 됨)
- ✅ NOTICE 종료 시 자동으로 WEATHER로 복귀

#### 타임라인
```
10:00        10:30        11:00
  |-------------|-------------|
  WEATHER       NOTICE        WEATHER (자동 복귀)
  (300)         (200)         (300)
```

---

### 시나리오 2: NOTICE 송출 중 → EMERGENCY 긴급 송출

#### 상황
- 14:00 - "행사 안내" NOTICE 송출 중 (priority=200)
- 14:30 - "폭염주의보" EMERGENCY 긴급 송출 (priority=100)

#### 처리 로직
```sql
-- 1. EMERGENCY 송출 시 (전체 전광판 대상)
INSERT INTO display_state (
  display_id,
  template_id,
  content_type,
  priority,
  start_at,
  end_at
) SELECT
  id,
  {emergency_template_id},
  'EMERGENCY',
  100,
  NOW(),
  NULL
FROM displays WHERE is_active = true;

-- 2. audit_logs 기록
INSERT INTO audit_logs (
  user_id,
  user_email,
  user_role,
  action,
  resource_type,
  action_detail
) VALUES (
  {user_id},
  {user_email},
  {user_role},
  'EMERGENCY_SEND',
  'display_state',
  jsonb_build_object(
    'display_ids', 'all',
    'message', '폭염주의보',
    'overridden', true
  )
);
```

#### 결과
- ✅ **EMERGENCY가 즉시 모든 전광판에 표시됨** (priority 100 > 200)
- ✅ 기존 NOTICE는 백그라운드에 유지
- ✅ audit_logs에 "EMERGENCY_SEND" 기록
- ✅ Dashboard에 "긴급 송출 중" 배지 표시

#### 타임라인
```
14:00        14:30        15:00
  |-------------|-------------|
  NOTICE        EMERGENCY     EMERGENCY (해제 전까지 계속)
  (200)         (100)         (100)
```

---

### 시나리오 3: EMERGENCY 해제 → 이전 상태 복원

#### 상황
- 15:00 - 관리자가 긴급 메시지 해제

#### 처리 로직
```sql
-- 1. EMERGENCY 레코드 삭제 (또는 end_at 설정)
DELETE FROM display_state
WHERE content_type = 'EMERGENCY'
  AND (end_at IS NULL OR end_at > NOW());

-- 또는
UPDATE display_state
SET end_at = NOW()
WHERE content_type = 'EMERGENCY'
  AND (end_at IS NULL OR end_at > NOW());

-- 2. audit_logs 기록
INSERT INTO audit_logs (
  user_id,
  action,
  resource_type,
  action_detail
) VALUES (
  {user_id},
  'EMERGENCY_RELEASE',
  'display_state',
  jsonb_build_object(
    'released_at', NOW(),
    'restored_to', (
      SELECT content_type FROM display_state
      WHERE display_id = {display_id}
        AND content_type != 'EMERGENCY'
      ORDER BY priority DESC, updated_at DESC
      LIMIT 1
    )
  )
);

-- 3. 현재 송출 콘텐츠 조회 (자동 복원)
SELECT * FROM display_state
WHERE display_id = {display_id}
  AND (start_at IS NULL OR start_at <= NOW())
  AND (end_at IS NULL OR end_at >= NOW())
ORDER BY priority DESC, updated_at DESC
LIMIT 1;

-- 결과: NOTICE (priority=200) 또는 WEATHER (priority=300)로 복원
```

#### 결과
- ✅ EMERGENCY 삭제
- ✅ **이전 NOTICE 또는 WEATHER로 즉시 복원**
- ✅ audit_logs에 "EMERGENCY_RELEASE" 기록
- ✅ Dashboard에서 긴급 송출 배지 제거

#### 타임라인
```
14:00        14:30        15:00 (해제)     16:00
  |-------------|-------------|-------------|
  NOTICE        EMERGENCY     NOTICE        WEATHER
  (200)         (100)         (200 복원)    (300)
```

---

### 시나리오 4: NOTICE ↔ NOTICE 시간 겹침

#### 상황
- 14:00~15:00 - "방역 안내" NOTICE 예약
- 14:30~16:00 - "행사 안내" NOTICE 예약 시도

#### 처리 로직
```sql
-- 1. 충돌 검사
SELECT * FROM schedules
WHERE display_ids @> jsonb_build_array({display_id})
  AND content_type = 'NOTICE'
  AND (
    (start_at <= '2024-06-01 14:30:00' AND end_at >= '2024-06-01 14:30:00')
    OR
    (start_at <= '2024-06-01 16:00:00' AND end_at >= '2024-06-01 16:00:00')
  );

-- 결과: 기존 "방역 안내" 스케줄 발견
```

#### UI 동작
1. **경고 다이얼로그 표시**:
   ```
   시간 충돌 경고
   
   14:00~15:00에 "방역 안내"가 예약되어 있습니다.
   새 예약(14:30~16:00)과 시간이 겹칩니다.
   
   계속하시겠습니까?
   
   [기존 예약 보기] [시간 수정] [무시하고 계속]
   ```

2. **사용자 선택**:
   - **기존 예약 보기**: Schedules 페이지로 이동
   - **시간 수정**: 예약 설정 화면으로 돌아가기
   - **무시하고 계속**: 충돌 무시하고 진행

3. **"무시하고 계속" 선택 시**:
   ```sql
   INSERT INTO schedules (...) VALUES (...);
   
   INSERT INTO audit_logs (
     action_detail
   ) VALUES (
     jsonb_build_object(
       'conflict_detected', true,
       'conflicting_schedule_id', {existing_schedule_id},
       'user_confirmed', true
     )
   );
   ```

#### 실제 송출 동작
```
14:00 - "방역 안내" 송출 시작 (priority=200, updated_at=2024-06-01 13:00)
14:30 - "행사 안내" 송출 시작 (priority=200, updated_at=2024-06-01 13:30)
        → 나중에 생성된 "행사 안내"가 표시됨 (updated_at DESC)
15:00 - "방역 안내" 종료
        → "행사 안내"만 남음
16:00 - "행사 안내" 종료
```

#### 결과
- ⚠️ 경고 표시 (충돌 알림)
- ✅ 사용자 확인 후 진행
- ✅ 14:30부터 "행사 안내" 표시 (나중 것 우선)
- ✅ audit_logs에 충돌 플래그 기록

---

### 시나리오 5: NOTICE ↔ WEATHER 겹침

#### 상황
- 항상 - WEATHER 자동 송출 중 (priority=300)
- 14:00~15:00 - "행사 안내" NOTICE 예약

#### 처리 로직
- **충돌 검사 안 함** (WEATHER는 항상 최하위 우선순위)
- **경고 메시지 표시 안 함**

#### 실제 송출 동작
```
13:59 - WEATHER (priority=300)
14:00 - NOTICE "행사 안내" (priority=200) → 즉시 WEATHER 덮어씀
15:00 - NOTICE 종료 → 자동으로 WEATHER로 복귀
```

#### 결과
- ✅ 경고 없이 자동 처리
- ✅ NOTICE가 우선 표시
- ✅ NOTICE 종료 시 자동 WEATHER 복귀

---

## 3. 우선순위 동일 시 처리 규칙

### 3.1 같은 priority 내 정렬 기준

```sql
ORDER BY priority DESC, updated_at DESC
```

**의미**:
1. **priority 높은 것 우선**
2. **priority 같으면 나중에 생성/수정된 것 우선**

### 3.2 예시

| 레코드 | content_type | priority | updated_at | 결과 |
|--------|--------------|----------|------------|------|
| A | NOTICE | 200 | 2024-06-01 10:00 | ❌ |
| B | NOTICE | 200 | 2024-06-01 10:30 | ✅ (선택됨) |
| C | WEATHER | 300 | 2024-06-01 11:00 | ❌ |

**선택 이유**: 
- A, B 모두 priority=200
- B가 나중에 생성됨 (updated_at DESC)
- C는 priority가 낮아서 제외

---

## 4. 시간 범위 검증 (start_at / end_at)

### 4.1 유효한 콘텐츠 판단

```sql
WHERE (start_at IS NULL OR start_at <= NOW())
  AND (end_at IS NULL OR end_at >= NOW())
```

| start_at | end_at | NOW() | 유효 여부 | 설명 |
|----------|--------|-------|-----------|------|
| NULL | NULL | 언제나 | ✅ | 무기한 송출 (WEATHER 기본값) |
| 10:00 | 11:00 | 10:30 | ✅ | 시간 범위 내 |
| 10:00 | 11:00 | 09:30 | ❌ | 아직 시작 안 함 |
| 10:00 | 11:00 | 11:30 | ❌ | 이미 종료됨 |
| 10:00 | NULL | 10:30 | ✅ | 시작 후 무기한 |

### 4.2 예약 송출 자동 활성화

**Edge Function (Cron)** 또는 **Supabase Realtime**으로 처리:

```sql
-- 매 1분마다 실행
-- start_at 도달한 스케줄 → display_state INSERT
INSERT INTO display_state (
  display_id,
  template_id,
  content_type,
  priority,
  start_at,
  end_at
)
SELECT
  unnest(ARRAY(SELECT jsonb_array_elements_text(display_ids)))::uuid,
  template_id,
  content_type,
  priority,
  start_at,
  end_at
FROM schedules
WHERE start_at <= NOW()
  AND end_at >= NOW()
  AND NOT EXISTS (
    SELECT 1 FROM display_state ds
    WHERE ds.display_id = ANY(SELECT jsonb_array_elements_text(s.display_ids)::uuid)
      AND ds.template_id = s.template_id
      AND ds.start_at = s.start_at
  );
```

---

## 5. 긴급 송출 특수 규칙

### 5.1 긴급 송출 시 강제 규칙

**특징**:
- ✅ **모든 전광판 대상** (개별 선택 불가)
- ✅ **priority=100 고정** (변경 불가)
- ✅ **즉시 송출만 가능** (예약 불가)
- ✅ **모든 충돌 무시** (경고 없음)
- ✅ **해제 권한 제한** (EMERGENCY 권한자만)

### 5.2 긴급 송출 SQL

```sql
-- 1. 모든 활성 전광판에 EMERGENCY INSERT
INSERT INTO display_state (
  display_id,
  template_id,
  content_type,
  priority,
  start_at,
  end_at,
  content_data
)
SELECT
  id,
  NULL, -- 템플릿 없이 직접 입력
  'EMERGENCY',
  100,
  NOW(),
  NULL, -- 해제 전까지 무기한
  jsonb_build_object(
    'title', {emergency_title},
    'body', {emergency_body},
    'highlight', {emergency_highlight}
  )
FROM displays
WHERE is_active = true;

-- 2. audit_logs 기록
INSERT INTO audit_logs (
  user_id,
  action,
  resource_type,
  action_detail
) VALUES (
  {user_id},
  'EMERGENCY_SEND',
  'display_state',
  jsonb_build_object(
    'display_count', (SELECT COUNT(*) FROM displays WHERE is_active = true),
    'message', {emergency_title},
    'timestamp', NOW()
  )
);
```

### 5.3 긴급 해제 권한 검증

```sql
-- Supabase RLS 정책
CREATE POLICY "Only EMERGENCY users can release emergency messages"
ON display_state FOR DELETE
USING (
  content_type = 'EMERGENCY'
  AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND (
        raw_user_meta_data->>'role' = 'ADMIN'
        OR
        (raw_user_meta_data->>'role' = 'OPERATOR' AND raw_user_meta_data->>'can_emergency' = 'true')
      )
  )
);
```

---

## 6. 충돌 검사 알고리즘

### 6.1 시간 겹침 검사 SQL

```sql
-- 새 스케줄의 시간 범위와 겹치는 기존 스케줄 조회
SELECT s.*
FROM schedules s
WHERE s.display_ids @> jsonb_build_array({target_display_id})
  AND s.content_type = 'NOTICE'
  AND (
    -- 케이스 1: 새 시작 시각이 기존 범위 내
    ({new_start_at} BETWEEN s.start_at AND s.end_at)
    OR
    -- 케이스 2: 새 종료 시각이 기존 범위 내
    ({new_end_at} BETWEEN s.start_at AND s.end_at)
    OR
    -- 케이스 3: 새 범위가 기존 범위를 완전히 포함
    (s.start_at BETWEEN {new_start_at} AND {new_end_at})
    OR
    (s.end_at BETWEEN {new_start_at} AND {new_end_at})
  );
```

### 6.2 충돌 유형별 처리

| 충돌 유형 | 검사 여부 | 경고 표시 | 진행 가능 |
|-----------|-----------|-----------|-----------|
| NOTICE ↔ NOTICE | ✅ | ✅ | ✅ (확인 후) |
| NOTICE ↔ WEATHER | ❌ | ❌ | ✅ (자동) |
| EMERGENCY → ALL | ❌ | ❌ | ✅ (강제) |

---

## 7. 우선순위 변경 금지 정책

### 7.1 절대 금지 사항

**다음 행위는 시스템에서 차단됩니다**:

- ❌ priority 값 직접 수정
- ❌ EMERGENCY 이외의 priority=100 설정
- ❌ WEATHER의 priority를 300에서 변경
- ❌ NOTICE의 priority를 200에서 변경

### 7.2 Supabase RLS 정책 (예시)

```sql
-- display_state INSERT 시 priority 검증
CREATE POLICY "Enforce priority rules on insert"
ON display_state FOR INSERT
WITH CHECK (
  (content_type = 'EMERGENCY' AND priority = 100)
  OR
  (content_type = 'NOTICE' AND priority = 200)
  OR
  (content_type = 'WEATHER' AND priority = 300)
);

-- display_state UPDATE 시 priority 변경 금지
CREATE POLICY "Prevent priority modification"
ON display_state FOR UPDATE
USING (true)
WITH CHECK (priority = (SELECT priority FROM display_state WHERE id = display_state.id));
```

---

## 8. 테스트 시나리오

### 테스트 1: 우선순위 정확성 검증

**절차**:
1. WEATHER 자동 송출 확인
2. NOTICE 즉시 송출 → NOTICE 표시 확인
3. EMERGENCY 긴급 송출 → EMERGENCY 표시 확인
4. EMERGENCY 해제 → NOTICE 복원 확인
5. NOTICE 종료 → WEATHER 복원 확인

**예상 결과**:
```
WEATHER → NOTICE → EMERGENCY → NOTICE → WEATHER
(300)     (200)     (100)       (200)     (300)
```

---

### 테스트 2: NOTICE 충돌 경고

**절차**:
1. 14:00~15:00 "방역 안내" 예약
2. 14:30~16:00 "행사 안내" 예약 시도
3. 경고 다이얼로그 표시 확인
4. "무시하고 계속" 선택
5. 14:30부터 "행사 안내" 표시 확인

**예상 결과**:
- ✅ 경고 표시
- ✅ 14:30부터 "행사 안내" (나중 것 우선)

---

### 테스트 3: EMERGENCY 전체 전광판 송출

**절차**:
1. 전광판 3개 등록 (A, B, C)
2. A: WEATHER, B: NOTICE, C: WEATHER 송출 중
3. EMERGENCY 긴급 송출
4. 모든 전광판에 EMERGENCY 표시 확인
5. EMERGENCY 해제
6. A: WEATHER, B: NOTICE, C: WEATHER 복원 확인

**예상 결과**:
- ✅ 3개 전광판 모두 EMERGENCY 동시 표시
- ✅ 해제 후 이전 상태 복원

---

## 9. 우선순위 위반 시 조치

### 9.1 자동 검증

**Supabase Database Webhooks** 또는 **Triggers**:
```sql
CREATE OR REPLACE FUNCTION validate_priority()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content_type = 'EMERGENCY' AND NEW.priority != 100 THEN
    RAISE EXCEPTION 'EMERGENCY must have priority 100';
  ELSIF NEW.content_type = 'NOTICE' AND NEW.priority != 200 THEN
    RAISE EXCEPTION 'NOTICE must have priority 200';
  ELSIF NEW.content_type = 'WEATHER' AND NEW.priority != 300 THEN
    RAISE EXCEPTION 'WEATHER must have priority 300';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_priority
BEFORE INSERT OR UPDATE ON display_state
FOR EACH ROW EXECUTE FUNCTION validate_priority();
```

### 9.2 납품 판정 기준

**다음 중 하나라도 위반 시 납품 불가**:
- [ ] EMERGENCY가 NOTICE/WEATHER를 덮어쓰지 못함
- [ ] NOTICE가 WEATHER를 덮어쓰지 못함
- [ ] EMERGENCY 해제 후 복원 실패
- [ ] 우선순위 값이 잘못 설정됨

---

## 10. 문서 히스토리

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0.0 | 2024-12-16 | 프로젝트팀 | 초안 작성 (완성형) |

---

**이전 문서**: [02_integrated_impl_plan.md](./02_integrated_impl_plan.md)  
**다음 문서**: [../04_design_uiux/01_ia.md](../04_design_uiux/01_ia.md)