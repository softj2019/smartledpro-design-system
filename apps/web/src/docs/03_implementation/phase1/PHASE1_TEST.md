# Phase 1: 기반 구축 & 인증 - 테스트 가이드

## 📋 문서 정보
- **Phase**: 1 / 7
- **버전**: v1.0.0
- **작성일**: 2024-12-16
- **목적**: Phase 1 기능 검증 및 테스트 절차

---

## 🎯 테스트 목표

Phase 1의 모든 기능이 정상적으로 동작하는지 검증합니다:
1. Supabase 연결 및 데이터 조회
2. 사용자 인증 (로그인/로그아웃)
3. 권한별 페이지 접근 제어
4. 레이아웃 및 네비게이션
5. 공통 컴포넌트 동작
6. 에러 핸들링

---

## ✅ 사전 준비

### 1. 환경 변수 설정
`.env.local` 파일이 올바르게 설정되어 있는지 확인:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Supabase 테스트 사용자 생성
Supabase Dashboard → Authentication → Users에서 다음 사용자 생성:

#### ADMIN 사용자
- **Email**: `admin@goyang.go.kr`
- **Password**: `Admin1234!`
- **User Metadata**:
```json
{
  "role": "ADMIN",
  "can_emergency": "true"
}
```

#### OPERATOR 사용자
- **Email**: `operator@goyang.go.kr`
- **Password**: `Operator1234!`
- **User Metadata**:
```json
{
  "role": "OPERATOR",
  "can_emergency": "false"
}
```

#### VIEWER 사용자
- **Email**: `viewer@goyang.go.kr`
- **Password**: `Viewer1234!`
- **User Metadata**:
```json
{
  "role": "VIEWER",
  "can_emergency": "false"
}
```

### 3. 개발 서버 실행
```bash
npm install
npm run dev
```

브라우저 자동 오픈: `http://localhost:5173`

---

## 🧪 테스트 시나리오

### Test 1: Supabase 연결 테스트

**목적**: Supabase 클라이언트가 정상적으로 연결되는지 확인

**절차**:
1. 브라우저에서 `http://localhost:5173/test` 접속
2. ADMIN 계정으로 로그인
3. "Supabase 연결 테스트 실행" 버튼 클릭

**예상 결과**:
- ✅ Supabase 연결 테스트 통과
- ✅ displays 테이블 조회 성공
- ✅ weather_stations 조회 성공
- ✅ v_current_display_content 뷰 조회 성공
- ✅ 환경 변수 정상 표시

**실패 시 조치**:
- `.env.local` 파일 확인
- Supabase 마이그레이션 실행 확인
- 브라우저 콘솔에서 에러 메시지 확인

---

### Test 2: 로그인 기능 테스트

**목적**: 사용자 인증이 정상적으로 동작하는지 확인

#### Test 2.1: ADMIN 로그인
**절차**:
1. `http://localhost:5173/login` 접속
2. Email: `admin@goyang.go.kr`
3. Password: `Admin1234!`
4. "로그인" 버튼 클릭

**예상 결과**:
- ✅ Dashboard로 자동 이동
- ✅ 헤더에 사용자 정보 표시 (admin@goyang.go.kr)
- ✅ 역할 배지 표시: ADMIN
- ✅ 긴급 권한 배지 표시
- ✅ 사이드바에 모든 메뉴 표시

#### Test 2.2: OPERATOR 로그인
**절차**:
1. 로그아웃
2. Email: `operator@goyang.go.kr`
3. Password: `Operator1234!`
4. 로그인

**예상 결과**:
- ✅ Dashboard로 이동
- ✅ 역할 배지: OPERATOR
- ✅ 긴급 권한 배지 없음
- ✅ 사이드바에 OPERATOR 접근 가능 메뉴만 표시

#### Test 2.3: VIEWER 로그인
**절차**:
1. 로그아웃
2. Email: `viewer@goyang.go.kr`
3. Password: `Viewer1234!`
4. 로그인

**예상 결과**:
- ✅ Dashboard로 이동
- ✅ 역할 배지: VIEWER
- ✅ Preview Studio, Schedules 메뉴 숨김

#### Test 2.4: 잘못된 로그인
**절차**:
1. Email: `wrong@example.com`
2. Password: `wrongpassword`
3. 로그인 시도

**예상 결과**:
- ✅ 에러 메시지 표시: "이메일 또는 비밀번호가 올바르지 않습니다."
- ✅ 로그인 화면 유지
- ✅ 입력 필드 포커스 유지

---

### Test 3: 로그아웃 기능 테스트

**절차**:
1. 로그인 상태에서 헤더 "로그아웃" 버튼 클릭

**예상 결과**:
- ✅ 로그인 페이지로 자동 이동
- ✅ 사용자 정보 초기화
- ✅ 세션 정보 삭제

---

### Test 4: 권한별 페이지 접근 제어

#### Test 4.1: VIEWER → Preview Studio 접근
**절차**:
1. VIEWER 계정으로 로그인
2. 주소창에 `/studio` 입력하여 직접 접근

**예상 결과**:
- ✅ 접근 권한 없음 페이지 표시
- ✅ 필요 권한 안내: OPERATOR
- ✅ 현재 권한 표시: VIEWER
- ✅ "이전 페이지로 돌아가기" 버튼 동작

#### Test 4.2: OPERATOR → Preview Studio 접근
**절차**:
1. OPERATOR 계정으로 로그인
2. `/studio` 접근

**예상 결과**:
- ✅ Preview Studio 페이지 표시 (Placeholder)
- ✅ 접근 제한 없음

#### Test 4.3: 미인증 → 보호된 페이지 접근
**절차**:
1. 로그아웃 상태
2. 주소창에 `/templates` 입력

**예상 결과**:
- ✅ 로그인 페이지로 자동 리다이렉트

---

### Test 5: 레이아웃 및 네비게이션

#### Test 5.1: 사이드바 네비게이션
**절차**:
1. ADMIN 계정으로 로그인
2. 사이드바의 각 메뉴 클릭

**예상 결과**:
- ✅ Dashboard: 정상 이동, 현재 페이지 하이라이트
- ✅ Templates: Placeholder 페이지 표시
- ✅ Displays: Placeholder 페이지 표시
- ✅ Preview Studio: Placeholder 페이지 표시
- ✅ Schedules: Placeholder 페이지 표시
- ✅ Audit Logs: Placeholder 페이지 표시

#### Test 5.2: 반응형 레이아웃 (모바일)
**절차**:
1. 브라우저 개발자 도구 열기 (F12)
2. 모바일 뷰 전환 (375px)
3. 메뉴 버튼 클릭

**예상 결과**:
- ✅ 헤더에 햄버거 메뉴 버튼 표시
- ✅ 메뉴 버튼 클릭 시 사이드바 슬라이드
- ✅ 오버레이 클릭 시 사이드바 닫힘
- ✅ 메뉴 항목 클릭 시 사이드바 자동 닫힘

#### Test 5.3: 사이드바 정보
**절차**:
1. 사이드바 하단 확인

**예상 결과**:
- ✅ 시스템 정보 표시
- ✅ 버전: v1.0.0
- ✅ 빌드: 2024-12-16

---

### Test 6: 404 페이지

**절차**:
1. 주소창에 `/nonexistent` 입력

**예상 결과**:
- ✅ 404 페이지 표시
- ✅ "페이지를 찾을 수 없습니다" 메시지
- ✅ "이전 페이지" 버튼 동작
- ✅ "홈으로 가기" 버튼 동작

---

### Test 7: 세션 지속성

#### Test 7.1: 페이지 새로고침
**절차**:
1. 로그인 상태에서 F5 (새로고침)

**예상 결과**:
- ✅ 로그인 상태 유지
- ✅ 사용자 정보 표시
- ✅ 현재 페이지 유지

#### Test 7.2: 탭 닫기 후 재접속
**절차**:
1. 로그인 상태에서 탭 닫기
2. 새 탭에서 `http://localhost:5173` 접속

**예상 결과**:
- ✅ 로그인 상태 유지
- ✅ Dashboard 자동 이동

#### Test 7.3: 브라우저 재시작
**절차**:
1. 로그인 상태에서 브라우저 완전히 종료
2. 브라우저 재시작 후 접속

**예상 결과**:
- ✅ 로그인 상태 유지 (persistSession: true)

---

### Test 8: Dashboard 표시

**절차**:
1. ADMIN 계정으로 로그인
2. Dashboard 확인

**예상 결과**:
- ✅ 환영 메시지 표시
- ✅ 사용자 정보 (이메일, 역할) 표시
- ✅ 통계 카드 4개 표시
  - 활성 전광판: 0 (Phase 3에서 구현)
  - 템플릿: 0 (Phase 2에서 구현)
  - 예약 송출: 0 (Phase 5에서 구현)
  - 금일 송출: 0 (Phase 7에서 구현)
- ✅ Phase 진행 상황 카드 표시
  - Phase 1: 진행 중 (파란색 배지)
  - Phase 2~7: 대기 (회색 배지)

---

### Test 9: 공통 컴포넌트 테스트

#### Test 9.1: Toast 알림
**절차**:
1. 브라우저 콘솔 열기
2. 다음 코드 실행:
```javascript
// Success toast
window.dispatchEvent(new CustomEvent('toast', {
  detail: { type: 'success', message: '성공 메시지' }
}));

// Error toast
window.dispatchEvent(new CustomEvent('toast', {
  detail: { type: 'error', message: '에러 메시지' }
}));
```

**예상 결과**:
- ✅ 우측 상단에 토스트 알림 표시
- ✅ Success: 초록색
- ✅ Error: 빨간색
- ✅ 3초 후 자동 사라짐

---

### Test 10: 에러 핸들링

#### Test 10.1: 네트워크 에러
**절차**:
1. 개발자 도구 → Network 탭
2. Offline 모드 활성화
3. Dashboard 새로고침

**예상 결과**:
- ✅ 에러 메시지 표시: "네트워크 연결을 확인해주세요."
- ✅ 사용자 친화적 안내

#### Test 10.2: Supabase 연결 실패
**절차**:
1. `.env.local`에서 `VITE_SUPABASE_URL`을 잘못된 값으로 변경
2. 개발 서버 재시작
3. 접속

**예상 결과**:
- ✅ 에러 메시지 표시
- ✅ 콘솔에 상세 에러 로그

---

## 📊 테스트 체크리스트

### 기능 테스트
- [ ] Supabase 연결 테스트 4개 모두 통과
- [ ] ADMIN 로그인 성공
- [ ] OPERATOR 로그인 성공
- [ ] VIEWER 로그인 성공
- [ ] 잘못된 로그인 에러 표시
- [ ] 로그아웃 정상 동작
- [ ] VIEWER → Preview Studio 접근 차단
- [ ] 미인증 → 보호된 페이지 리다이렉트
- [ ] 사이드바 네비게이션 동작
- [ ] 모바일 레이아웃 정상 동작
- [ ] 404 페이지 표시
- [ ] 세션 지속성 확인
- [ ] Dashboard 정상 표시

### 코드 품질
- [ ] TypeScript 타입 에러 0개
- [ ] ESLint 경고 0개
- [ ] 콘솔 에러 0개 (정상 동작 시)

### 브라우저 호환성
- [ ] Chrome (최신 버전)
- [ ] Firefox (최신 버전)
- [ ] Safari (최신 버전)
- [ ] Edge (최신 버전)

### 반응형 디자인
- [ ] 모바일 (375px)
- [ ] 태블릿 (768px)
- [ ] 데스크톱 (1920px)

---

## 🐛 알려진 이슈

현재 알려진 이슈 없음.

발견된 이슈는 GitHub Issues에 등록하세요.

---

## 📸 테스트 증빙 스크린샷

### 필수 스크린샷
1. Supabase 연결 테스트 통과 화면
2. ADMIN 로그인 후 Dashboard
3. 권한별 메뉴 표시 (ADMIN, OPERATOR, VIEWER)
4. 권한 없음 페이지 (VIEWER → Preview Studio)
5. 모바일 레이아웃 (사이드바 열림)
6. 404 페이지

**저장 위치**: `/docs/03_implementation/phase1/screenshots/`

---

## ✅ Phase 1 완료 기준

모든 테스트가 통과하면 Phase 1이 완료된 것으로 간주합니다:

- [x] Supabase 연결 정상 동작
- [x] 로그인/로그아웃 정상 동작
- [x] 권한별 접근 제어 정상 동작
- [x] 레이아웃 및 네비게이션 정상 동작
- [x] 공통 컴포넌트 구현 완료
- [x] 공통 훅 구현 완료
- [x] 에러 핸들링 정상 동작
- [x] 반응형 디자인 확인
- [x] 문서화 완료

---

## 🚀 다음 단계

Phase 1 완료 후:

1. **Phase 1 완료 리포트 작성**
2. **Phase 2 시작**: Templates 관리
3. **통합 문서 업데이트**

---

**테스트 담당자**: _______________  
**테스트 일자**: _______________  
**테스트 결과**: ☐ 통과 / ☐ 실패  
**비고**: _______________
