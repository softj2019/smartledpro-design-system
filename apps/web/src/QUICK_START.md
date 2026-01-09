# 🚀 빠른 시작 가이드

## ❌ 에러 발생?

```
Error: Failed to run sql query: ERROR: 42703: column "is_active" does not exist
```

👉 **즉시 해결**: `/docs/README_FIRST.md` 파일을 확인하세요!

---

## ✅ 3단계로 시작하기

### **1️⃣ Supabase 테이블 설정**

```
1. https://supabase.com/dashboard 접속
2. SQL Editor 열기
3. /docs/SUPABASE_FIX_STEP_BY_STEP.sql 복사 & 실행
4. ✅ 완료!
```

### **2️⃣ 템플릿 생성**

```
1. /templates/new 접속
2. 템플릿 작성
   - 이름: "공원 운영시간"
   - 내용: "<h2>평일: 09:00-18:00</h2>"
3. 저장
```

### **3️⃣ 스케줄 생성**

```
1. /schedules/new 접속
2. 스케줄 설정
   - 템플릿: "공원 운영시간" 선택
   - 시작 시간: 현재 + 2분
   - 표시 시간: 1분
   - 반복: 없음
3. 저장
```

---

## 🖥️ 전광판 확인

```
1. /display/view 페이지 열기
2. 설정한 시간에 자동으로 템플릿 표시 ✅
3. 성공!
```

---

## 🔄 동작 방식

```
스케줄 생성 → Supabase DB 저장
    ↓
Cron (1분마다) → 실행 조건 체크
    ↓
KV Store 업데이트 → 현재 송출 상태
    ↓
/display/view 폴링 (3초마다) → 자동 갱신
```

**응답 시간**: 최대 1분 3초

---

## 📚 문서

| 문서 | 내용 |
|------|------|
| `/docs/README_FIRST.md` | 🚨 에러 해결 |
| `/docs/ERROR_FIX_GUIDE.md` | 🔧 상세 트러블슈팅 |
| `/docs/SCHEDULE_COMPLETE_GUIDE.md` | 📖 완성 가이드 |
| `/docs/DISPLAY_SYSTEM_FLOW.md` | 🔄 전체 동작 방식 |

---

## 🆘 문제 발생?

1. ⬜ SQL을 실행했나요?
2. ⬜ 웹 페이지를 새로고침했나요?
3. ⬜ 2분 이상 기다렸나요? (Cron 실행 대기)

👉 `/docs/README_FIRST.md` 확인

---

**고양 스마트시티 리빙랩 실증사업** 🏙️
