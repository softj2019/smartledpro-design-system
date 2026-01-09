# PostgreSQL 마이그레이션 빠른 시작 가이드

**⏱️ 예상 소요 시간**: 5분

---

## 🎯 한 줄 요약

KV Store를 PostgreSQL로 완전 전환하여 데이터 영구 저장 및 성능 향상

---

## ✅ 사전 확인

현재 상태:
- ✅ `schedules` 테이블 존재 (name, is_active, last_executed_at 포함)
- ✅ `schedule_executions` 테이블 존재 (execution_context 누락)
- ❌ `display_current_state` 테이블 없음 → **생성 필요**
- ❌ `display_settings` 테이블 없음 → **생성 필요**

---

## 🚀 마이그레이션 3단계

### 1단계: SQL 실행 (2분)

**Supabase Dashboard에서 실행**:

```bash
1. https://supabase.com/dashboard/project/{project-id}/sql 접속
2. 새 쿼리 생성
3. 아래 SQL 전체 복사 & 붙여넣기
4. Run 클릭
```

**SQL 파일**: `/docs/05_development/POSTGRESQL_MIGRATION_FINAL.sql`

**실행 후 확인**:
```
[✓] schedule_executions.execution_context 컬럼 추가됨
[✓] display_current_state 테이블 생성 및 인덱스 완료
[✓] display_settings 테이블 생성됨
[✓] display_settings 초기 데이터 삽입됨
========================================
마이그레이션 완료!
========================================
```

---

### 2단계: 서버 재배포 확인 (자동)

서버 코드는 이미 PostgreSQL로 수정되어 있으므로 자동 재배포됩니다.

**확인 방법**:
```bash
# Supabase Dashboard → Edge Functions → Logs
# 에러 없이 정상 동작 확인
```

---

### 3단계: 기능 테스트 (3분)

#### 3.1 스케줄 생성 테스트

1. 관리자 페이지 접속
2. 새 스케줄 생성
3. DB 확인:

```sql
SELECT id, name, is_active, last_executed_at 
FROM schedules 
ORDER BY created_at DESC 
LIMIT 1;
```

#### 3.2 자동 실행 테스트

1. 스케줄 시작 시간을 현재 시간으로 설정
2. 1분 대기
3. 실행 이력 확인:

```sql
SELECT * FROM schedule_executions 
ORDER BY executed_at DESC 
LIMIT 5;
```

#### 3.3 현재 송출 확인

```sql
SELECT * FROM display_current_state 
ORDER BY activated_at DESC;
```

---

## ✅ 완료 체크리스트

- [ ] SQL 실행 완료 (`마이그레이션 완료!` 메시지 확인)
- [ ] `display_current_state` 테이블 존재 확인
- [ ] `display_settings` 테이블 존재 확인
- [ ] `schedule_executions.execution_context` 컬럼 추가 확인
- [ ] 스케줄 생성 테스트 통과
- [ ] 스케줄 자동 실행 테스트 통과
- [ ] 실행 이력 조회 정상 동작

---

## 🎉 마이그레이션 완료!

모든 체크리스트가 ✅ 이면 마이그레이션 성공!

**다음 단계**:
1. 프로덕션 배포
2. 모니터링 설정
3. KV Store 데이터 정리 (선택사항)

---

## 📚 상세 문서

- [완전한 마이그레이션 가이드](/docs/05_development/06_postgresql_migration.md)
- [마이그레이션 완료 보고서](/docs/00_meta/POSTGRESQL_MIGRATION_COMPLETE.md)
- [마이그레이션 체크리스트](/docs/00_meta/POSTGRESQL_MIGRATION_CHECKLIST.md)

---

**작성일**: 2024-12-19
**소요 시간**: 5분
**난이도**: ⭐ (쉬움)
