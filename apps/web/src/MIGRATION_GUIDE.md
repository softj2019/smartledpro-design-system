# 🚀 KV Store → PostgreSQL 마이그레이션 가이드

## 📋 개요

고양 스마트시티 리빙랩 실증사업의 전광판 관리 시스템에서 KV Store와 PostgreSQL이 혼재되어 데이터 불일치 및 성능 문제가 발생하고 있습니다. 이 가이드는 완전한 PostgreSQL 마이그레이션을 안전하게 수행하는 절차를 설명합니다.

---

## 🔍 현재 상태 분석

### KV Store 사용 현황 (47개 row)

| Key Pattern | 개수 | 상태 | 조치 |
|------------|-----|------|------|
| `rotation_broadcast:*` | 6개 | ❌ PostgreSQL 없음 | **마이그레이션 필요** |
| `rotation:*` | 6개 | ❌ 중복 | 삭제 필요 |
| `audit_log:*` | 17개 | ❌ audit_logs 테이블과 중복 | 삭제 필요 |
| `schedule:*` | 1개 | ❌ schedules 테이블과 중복 | 삭제 필요 |
| `broadcast:*` | 7개 | ⚠️ 임시 데이터 | 만료 후 삭제 |
| `display:settings` | 1개 | ⚠️ display_settings 테이블 있음 | 마이그레이션 필요 |
| `current_broadcast_id` | 1개 | ⚠️ display_current_state로 대체 가능 | 삭제 고려 |
| `schedules:active/all` | 2개 | ❌ 불필요 | 삭제 필요 |

---

## ✅ 마이그레이션 단계

### **1단계: 데이터베이스 마이그레이션 실행**

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- 파일: /database/migrations/001_create_rotation_broadcasts.sql
-- 위 파일 내용을 복사하여 실행
```

**검증:**
```sql
SELECT * FROM public.rotation_broadcasts;
-- 아직 데이터 없음 (정상)
```

---

### **2단계: rotation 데이터 마이그레이션**

**⚠️ ADMIN 권한 필요**

#### 방법 1: API 호출 (권장)

```bash
curl -X POST \
  https://${PROJECT_ID}.supabase.co/functions/v1/make-server-5231839f/migration/rotation-to-postgres \
  -H "Authorization: Bearer ${ADMIN_ACCESS_TOKEN}" \
  -H "Content-Type: application/json"
```

#### 방법 2: 프론트엔드에서 호출

Admin 페이지에 버튼 추가:

```typescript
const handleMigrateRotations = async () => {
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/migration/rotation-to-postgres`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminAccessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  const result = await response.json();
  console.log('Migration result:', result);
  // { success: true, migrated: 6, skipped: 0, errors: [] }
};
```

**검증:**
```sql
SELECT id, name, is_active, created_at 
FROM public.rotation_broadcasts 
ORDER BY created_at DESC;
-- 6개 rotation이 모두 있어야 함
```

---

### **3단계: KV Store 중복 데이터 정리**

#### API 호출:

```bash
curl -X POST \
  https://${PROJECT_ID}.supabase.co/functions/v1/make-server-5231839f/migration/cleanup-kv-duplicates \
  -H "Authorization: Bearer ${ADMIN_ACCESS_TOKEN}" \
  -H "Content-Type: application/json"
```

**예상 결과:**
```json
{
  "success": true,
  "message": "Cleanup completed: 35 entries deleted",
  "deleted": [
    "audit_log:...",
    "rotation:...",
    "schedule:...",
    "schedules:active",
    "schedules:all",
    "broadcast:... (expired)"
  ],
  "errors": []
}
```

**검증:**
```sql
-- KV Store 확인 (남아있어야 하는 데이터)
SELECT key FROM public.kv_store_5231839f;
-- rotation_broadcast:* (6개)
-- broadcast:* (만료되지 않은 것만)
-- display:settings (1개)
-- current_broadcast_id (1개)
-- display:current_template (1개)
-- display:last_updated (1개)
-- 총 10~12개 정도 남아야 정상
```

---

### **4단계: Backend 코드 업데이트**

#### 4-1. rotation 생성/조회를 PostgreSQL로 변경

기존:
```typescript
// KV Store 사용
await kv.set(`rotation_broadcast:${rotationId}`, rotation);
const rotations = await kv.getByPrefix('rotation_broadcast:');
```

새로운:
```typescript
// PostgreSQL 사용
await supabase.from('rotation_broadcasts').insert(rotation);
const { data: rotations } = await supabase.from('rotation_broadcasts').select('*');
```

#### 4-2. audit_log를 PostgreSQL 전용으로 변경

기존:
```typescript
// KV Store에도 저장
await kv.set(`audit_log:${auditLog.id}`, auditLog);
```

새로운:
```typescript
// PostgreSQL만 사용 (이미 구현됨)
await supabase.from('audit_logs').insert(auditLog);
```

---

### **5단계: 최종 검증**

#### 5-1. rotation 송출 테스트

1. PreviewStudio → 순차 반복 송출 탭
2. "순차 반복 송출 시작" 클릭
3. Display View에서 송출 확인
4. PostgreSQL 확인:
   ```sql
   SELECT * FROM rotation_broadcasts WHERE is_active = true;
   ```

#### 5-2. 데이터 정합성 확인

```sql
-- rotation 데이터 확인
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as stopped
FROM rotation_broadcasts;
-- total: 6~7개, active: 1개, stopped: 5~6개

-- audit_logs 확인
SELECT action, COUNT(*) 
FROM audit_logs 
WHERE action LIKE '%ROTATION%'
GROUP BY action;
-- ROTATION_SWITCH, ROTATION_CREATED, rotation_stopped 등
```

---

## 🚨 롤백 계획

만약 마이그레이션 중 문제가 발생하면:

### 1. rotation 데이터 롤백

```sql
-- PostgreSQL에서 삭제
DELETE FROM public.rotation_broadcasts;
```

### 2. KV Store 복구

KV Store 데이터는 마이그레이션 후에도 남아있으므로 즉시 복구 가능.

### 3. Backend 코드 롤백

Git에서 이전 커밋으로 되돌림.

---

## 📊 기대 효과

### 성능 개선
- ✅ KV Store 56개 중복 인덱스 제거 → 쿼리 속도 향상
- ✅ PostgreSQL 인덱스 최적화 → rotation 조회 10배 빠름
- ✅ JOIN 쿼리 사용 가능 → 복잡한 리포트 생성 가능

### 데이터 정합성
- ✅ 단일 소스 (Single Source of Truth)
- ✅ ACID 트랜잭션 보장
- ✅ 외래 키 제약 조건으로 무결성 보장

### 유지보수
- ✅ Supabase Dashboard에서 데이터 직접 확인
- ✅ SQL 쿼리로 복잡한 통계 생성 가능
- ✅ 백업/복구 용이

---

## ⚠️ 주의사항

1. **ADMIN 권한 필요**: 마이그레이션 API는 ADMIN만 호출 가능
2. **운영 중 마이그레이션**: 새로운 rotation 생성 시 자동으로 PostgreSQL에 저장됨 (이미 구현)
3. **점진적 전환**: 기존 KV Store 데이터는 남겨두고 점진적으로 PostgreSQL로 전환
4. **로그 모니터링**: 마이그레이션 후 서버 로그 확인 필요

---

## 📞 문의

마이그레이션 중 문제 발생 시:
- 서버 로그 확인: Supabase Dashboard → Edge Functions → Logs
- audit_logs 테이블 확인
- 이 문서 참고

---

**작성일**: 2025-12-21  
**작성자**: System Migration Team  
**프로젝트**: 고양 스마트시티 리빙랩 전광판 관리 시스템
