# 순차 반복 송출 시스템 가이드

## 📋 개요
여러 템플릿을 순차적으로 반복 표시하는 Playlist/Rotation 송출 시스템입니다.

---

## 🎯 핵심 개념

### **순차 반복 송출이란?**
```
템플릿 A (5분) → 템플릿 B (5분) → 템플릿 C (5분) → 템플릿 A (5분)...
계속 반복 (24시간 무중단)
```

### **우선순위 기반 중단/재개**
```
순차 송출 중 (우선순위 50)
  ↓
예약 스케줄 시작 (우선순위 100) → 순차 송출 일시 중단
  ↓
예약 스케줄 종료 → 순차 송출 자동 재개
  ↓
긴급 송출 시작 (우선순위 1000) → 모든 송출 중단
  ↓
긴급 송출 종료 → 순차 송출 자동 재개
```

---

## 🚀 사용 방법

### **Preview Studio에서 생성**

#### **1단계: Preview Studio 열기**
```
/studio
```

#### **2단계: "순차 반복" 탭 선택**
```
탭: 즉시 | 긴급 | 예약/반복 | [순차 반복] ← 클릭
```

#### **3단계: 템플릿 선택**
```
┌─────────────────────────────────┐
│ 선택 가능한 템플릿              │
├─────────────────────────────────┤
│ [공지사항 A]              [+]   │
│ [공지사항 B]              [+]   │
│ [공지사항 C]              [+]   │
│ [이벤트 안내]             [+]   │
└─────────────────────────────────┘

클릭하여 2개 이상 선택 (최대 10개)
```

#### **4단계: 송출 순서 조정**
```
┌─────────────────────────────────┐
│ 송출 순서 (3개)  *최소 2개      │
├─────────────────────────────────┤
│ [1] 공지사항 A  [↑] [↓] [×]    │
│ [2] 공지사항 B  [↑] [↓] [×]    │
│ [3] 공지사항 C  [↑] [↓] [×]    │
└─────────────────────────────────┘

• 위/아래 화살표로 순서 변경
• × 버튼으로 제거
```

#### **5단계: 설정**
```
순차 반복 이름: 24시간 순환 공지
각 템플릿 표시 시간: 5분
시작 날짜: 2024-12-20
종료 날짜: 2025-12-20 (1년)

→ 전체 순환 시간: 15분 (3개 × 5분)
```

#### **6단계: 순차 반복 시작**
```
[순차 반복 시작] 버튼 클릭
```

---

## 📊 우선순위 시스템

### **Priority 레벨**
```
EMERGENCY    1000 (긴급 송출)
  ↑
INSTANT       200 (즉시 송출)
  ↑
SCHEDULE      100 (예약/반복 스케줄)
  ↑
ROTATION       50 (순차 반복) ← 가장 낮음
```

### **동작 원리**
```javascript
// 1분마다 자동 체크
function checkCurrentBroadcast() {
  // 1. EMERGENCY (1000) 확인
  if (hasEmergencyBroadcast()) {
    return showEmergency();
  }
  
  // 2. INSTANT (200) 확인
  if (hasInstantBroadcast()) {
    return showInstant();
  }
  
  // 3. SCHEDULE (100) 확인
  if (hasScheduleBroadcast()) {
    return showSchedule();
  }
  
  // 4. ROTATION (50) - 마지막
  if (hasRotationBroadcast()) {
    return showNextRotationTemplate();
  }
  
  // 5. 기본 템플릿
  return showDefaultTemplate();
}
```

---

## 🔄 순차 반복 실행 로직

### **서버 구현 (개념)**

```typescript
// POST /broadcast/rotation - 순차 반복 생성
{
  name: "24시간 순환 공지",
  template_ids: ["id1", "id2", "id3"],
  duration_per_template: 5,
  start_date: "2024-12-20",
  end_date: "2025-12-20",
  is_active: true
}

// DB 저장
rotation_broadcasts {
  id: uuid,
  name: string,
  template_ids: jsonb, // ["id1", "id2", "id3"]
  duration_per_template: integer, // 5분
  current_index: integer, // 현재 표시 중인 템플릿 인덱스 (0-based)
  last_switched_at: timestamp, // 마지막 전환 시간
  start_date: date,
  end_date: date,
  priority: 50,
  is_active: boolean
}
```

### **자동 전환 로직**

```typescript
// 1분마다 실행
async function checkRotationBroadcasts() {
  // 활성 Rotation 조회
  const rotation = await getActiveRotation();
  if (!rotation) return;
  
  // 더 높은 우선순위가 있는지 확인
  const hasHigherPriority = await checkHigherPriority(50);
  if (hasHigherPriority) {
    // 순차 송출 일시 중단 (DB는 유지)
    return;
  }
  
  // 마지막 전환 시간 확인
  const now = new Date();
  const lastSwitched = new Date(rotation.last_switched_at);
  const minutesPassed = (now - lastSwitched) / 1000 / 60;
  
  // 표시 시간이 지났으면 다음 템플릿으로 전환
  if (minutesPassed >= rotation.duration_per_template) {
    const nextIndex = (rotation.current_index + 1) % rotation.template_ids.length;
    const nextTemplateId = rotation.template_ids[nextIndex];
    
    // display_current_state 업데이트
    await updateDisplayState({
      template_id: nextTemplateId,
      source: 'rotation',
      source_id: rotation.id,
      priority: 50,
      activated_at: now,
      expires_at: new Date(now.getTime() + rotation.duration_per_template * 60 * 1000)
    });
    
    // Rotation 인덱스 및 시간 업데이트
    await updateRotation(rotation.id, {
      current_index: nextIndex,
      last_switched_at: now
    });
    
    console.log(`Rotation switched to template ${nextIndex + 1}/${rotation.template_ids.length}`);
  }
}
```

---

## 📋 테스트 시나리오

### **시나리오 1: 기본 순차 반복**

**설정:**
```
템플릿: A, B, C
표시 시간: 각 5분
기간: 1년
```

**예상 동작:**
```
00:00 - A 표시 시작
00:05 - B 표시 시작
00:10 - C 표시 시작
00:15 - A 표시 시작 (반복)
00:20 - B 표시 시작
...
```

**확인 사항:**
- ✅ 정확한 순서로 전환
- ✅ 각 템플릿이 5분 표시
- ✅ 무한 반복

---

### **시나리오 2: 예약 스케줄과의 우선순위**

**설정:**
```
순차 반복: A(5분) → B(5분) → C(5분) - Priority 50
예약 스케줄: D 템플릿, 09:00-09:30 - Priority 100
```

**예상 동작:**
```
08:50 - 순차 반복 B 표시 중
08:55 - 순차 반복 C 표시 시작
09:00 - 예약 스케줄 D 표시 시작 (순차 중단)
09:30 - 예약 스케줄 종료
09:30 - 순차 반복 재개 (C 다음인 A부터)
09:35 - 순차 반복 B 표시
```

**확인 사항:**
- ✅ 09:00에 예약 스케줄로 즉시 전환
- ✅ 순차 반복이 백그라운드에서 대기
- ✅ 09:30에 순차 반복 자동 재개
- ✅ 재개 시 정확한 순서 유지

---

### **시나리오 3: 긴급 송출 우선순위**

**설정:**
```
순차 반복: A → B → C - Priority 50
긴급 송출: E 템플릿, 10:00-10:10 - Priority 1000
```

**예상 동작:**
```
09:58 - 순차 반복 B 표시 중
10:00 - 긴급 송출 E 표시 (모든 송출 중단)
10:10 - 긴급 송출 종료
10:10 - 순차 반복 재개
```

**확인 사항:**
- ✅ 긴급 송출이 즉시 표시
- ✅ 순차 반복 일시 중단
- ✅ 긴급 종료 후 자동 재개

---

## 🐛 트러블슈팅

### ❌ **순차 반복이 시작되지 않음**

**원인:**
1. 템플릿 2개 미만 선택
2. 시작 날짜가 미래
3. 종료 날짜가 과거
4. is_active = false

**해결:**
```
1. 최소 2개 템플릿 선택 확인
2. 시작 날짜를 오늘 또는 과거로 설정
3. 종료 날짜를 미래로 설정
4. 활성화 상태 확인
```

---

### ❌ **템플릿이 전환되지 않음**

**원인:**
1. check-and-execute가 실행되지 않음
2. 표시 시간 설정 오류
3. DB 업데이트 실패

**해결:**
```
1. useScheduleExecutor가 1분마다 실행되는지 확인
2. duration_per_template 값 확인
3. 서버 로그에서 에러 확인
4. Debug Log Drawer에서 API 응답 확인
```

---

### ❌ **예약 스케줄 후 재개되지 않음**

**원인:**
1. Rotation의 priority가 Schedule보다 높음
2. Rotation이 비활성화됨
3. 종료 날짜가 지남

**해결:**
```
1. Priority 확인: Rotation(50) < Schedule(100)
2. is_active = true 확인
3. end_date가 유효한지 확인
```

---

## 📊 DB 스키마 (추가 필요)

```sql
-- rotation_broadcasts 테이블 생성
CREATE TABLE rotation_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  template_ids JSONB NOT NULL, -- ["id1", "id2", "id3"]
  duration_per_template INTEGER NOT NULL, -- 분 단위
  current_index INTEGER DEFAULT 0, -- 현재 표시 중인 템플릿 인덱스
  last_switched_at TIMESTAMP DEFAULT NOW(), -- 마지막 전환 시간
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  priority INTEGER DEFAULT 50, -- 가장 낮은 우선순위
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_rotation_active ON rotation_broadcasts(is_active);
CREATE INDEX idx_rotation_dates ON rotation_broadcasts(start_date, end_date);
```

---

## 🎯 구현 체크리스트

### **프론트엔드 (완료)**
- [x] RotationControls 컴포넌트
- [x] 템플릿 다중 선택 UI
- [x] 순서 조정 (위/아래 화살표)
- [x] Preview Studio 통합
- [x] 탭 UI (4개 탭)

### **백엔드 (구현 필요)**
- [ ] POST /broadcast/rotation API
- [ ] rotation_broadcasts 테이블 생성
- [ ] checkRotationBroadcasts() 함수
- [ ] 우선순위 비교 로직
- [ ] 자동 전환 로직
- [ ] check-and-execute에 rotation 체크 추가

### **테스트 (구현 필요)**
- [ ] 기본 순차 반복 테스트
- [ ] 우선순위 중단/재개 테스트
- [ ] 긴급 송출 우선순위 테스트
- [ ] 1년 장기 실행 테스트

---

## 🚀 다음 단계

**서버 API 구현이 필요합니다:**

1. **DB 스키마 추가**
   - rotation_broadcasts 테이블 생성
   - 외래 키 및 인덱스 설정

2. **API 엔드포인트 구현**
   ```
   POST   /broadcast/rotation        - 순차 반복 생성
   GET    /broadcast/rotation        - 목록 조회
   GET    /broadcast/rotation/:id    - 상세 조회
   PUT    /broadcast/rotation/:id    - 수정
   DELETE /broadcast/rotation/:id    - 삭제
   PUT    /broadcast/rotation/:id/toggle - 활성화/비활성화
   ```

3. **자동 실행 로직**
   - check-and-execute에 rotation 체크 추가
   - 우선순위 비교 로직 구현
   - 자동 전환 및 인덱스 업데이트

4. **테스트 및 검증**
   - 단위 테스트
   - 통합 테스트
   - 실제 환경 테스트

---

**작성일**: 2024-12-20  
**버전**: v1.0.0  
**담당자**: 시스템 개발팀
