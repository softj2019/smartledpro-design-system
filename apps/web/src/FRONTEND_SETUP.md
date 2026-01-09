# 프론트엔드 설정 가이드

## 1. 필수 의존성 설치

### 1.1 Supabase 클라이언트 설치

```bash
npm install @supabase/supabase-js
```

이미 설치되어 있을 수 있습니다. 버전 확인:
```bash
npm list @supabase/supabase-js
```

필요한 버전: `@supabase/supabase-js@2.0.0` 이상

---

## 2. 환경 변수 설정

### 2.1 .env.local 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성하세요:

```bash
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2.2 Supabase 프로젝트 정보 확인

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Settings** → **API** 클릭
4. 다음 정보 복사:
   - **Project URL**: `VITE_SUPABASE_URL`에 입력
   - **anon public**: `VITE_SUPABASE_ANON_KEY`에 입력

### 2.3 .gitignore 확인

`.env.local` 파일이 git에 커밋되지 않도록 `.gitignore`에 추가:

```
# .gitignore
.env.local
.env
```

---

## 3. 프론트엔드 실행

### 3.1 개발 서버 시작

```bash
npm run dev
```

브라우저에서 자동으로 열립니다 (보통 `http://localhost:5173`)

### 3.2 빌드 (프로덕션)

```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

---

## 4. Supabase 연결 테스트

### 4.1 로그인 화면

1. 개발 서버 실행 후 브라우저에서 접속
2. 로그인 화면이 표시됩니다
3. 테스트 계정으로 로그인:

```
Email: admin@goyang.go.kr
Password: Admin1234!
```

**주의**: 이 계정은 Supabase에서 먼저 생성되어 있어야 합니다.  
(SUPABASE_SETUP.md의 "Step 6: 테스트 사용자 생성" 참조)

### 4.2 연결 테스트 실행

로그인 후:
1. "Supabase 연결 테스트 실행" 버튼 클릭
2. 다음 테스트가 자동으로 실행됩니다:
   - ✅ Supabase 연결
   - ✅ 테이블 조회 (displays)
   - ✅ 측정소 데이터 (weather_stations)
   - ✅ 뷰 조회 (v_current_display_content)

모든 테스트가 통과하면 초록색 성공 메시지가 표시됩니다.

---

## 5. 생성된 파일 구조

```
/
├── lib/
│   ├── supabase.ts              # Supabase 클라이언트 설정
│   └── types.ts                 # TypeScript 타입 정의
│
├── components/
│   ├── AuthProvider.tsx         # 인증 컨텍스트
│   ├── Login.tsx                # 로그인 화면
│   └── SupabaseTest.tsx         # 연결 테스트 컴포넌트
│
├── App.tsx                      # 메인 진입점 (수정됨)
├── .env.example                 # 환경 변수 템플릿
└── .env.local                   # 실제 환경 변수 (생성 필요)
```

---

## 6. 주요 기능 설명

### 6.1 인증 (AuthProvider)

`/lib/supabase.ts`에서 제공하는 함수:

```typescript
import { supabase, signIn, signOut, getCurrentUser } from './lib/supabase';

// 로그인
await signIn('admin@goyang.go.kr', 'Admin1234!');

// 로그아웃
await signOut();

// 현재 사용자 조회
const user = await getCurrentUser();
```

### 6.2 데이터 조회

```typescript
// displays 테이블 조회
const { data, error } = await supabase
  .from('displays')
  .select('*')
  .eq('is_active', true);

// message_templates 조회
const { data: templates } = await supabase
  .from('message_templates')
  .select('*')
  .order('created_at', { ascending: false });
```

### 6.3 데이터 삽입 (감사 로그 자동 기록)

```typescript
import { logAction } from './lib/supabase';

// 템플릿 생성
const { data, error } = await supabase
  .from('message_templates')
  .insert({
    name: '방역 안내',
    title: '오늘 방역 소독 실시',
    body: '주차장 이용이 제한됩니다.',
    category: '방역',
  })
  .select()
  .single();

// 감사 로그 기록
await logAction({
  action: 'CREATE',
  resourceType: 'template',
  resourceId: data.id,
  actionDetail: { name: '방역 안내' },
});
```

### 6.4 Realtime 구독 (송출 페이지용)

```typescript
// display_state 변경 감지
const channel = supabase
  .channel('display_state_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'display_state',
    filter: `display_id=eq.${displayId}`
  }, (payload) => {
    console.log('Display state changed:', payload);
    // 화면 업데이트
  })
  .subscribe();

// 구독 해제
channel.unsubscribe();
```

---

## 7. 문제 해결

### 문제 1: "Missing Supabase environment variables" 오류

**원인**: `.env.local` 파일이 없거나 환경 변수가 설정되지 않음

**해결**:
1. `.env.example` 파일을 `.env.local`로 복사
2. Supabase Dashboard에서 URL과 anon key 복사하여 입력
3. 개발 서버 재시작

### 문제 2: 로그인 실패 (Invalid login credentials)

**원인**: Supabase에 해당 사용자가 없음

**해결**:
1. Supabase Dashboard → Authentication → Users
2. 테스트 사용자 생성 (SUPABASE_SETUP.md 참조)
3. User Metadata 설정:
```json
{
  "role": "ADMIN",
  "can_emergency": "true"
}
```

### 문제 3: 테이블 조회 실패

**원인**: RLS 정책 또는 마이그레이션 미실행

**해결**:
1. Supabase Dashboard → SQL Editor
2. `/supabase/migrations/` 스크립트 실행 확인
3. Table Editor에서 테이블 존재 확인

### 문제 4: CORS 오류

**원인**: Supabase 프로젝트 설정 문제

**해결**:
1. Supabase Dashboard → Settings → API
2. "Site URL" 확인: `http://localhost:5173` 추가
3. "Additional Redirect URLs" 확인

---

## 8. 다음 단계

Supabase 연결 완료 후:

### A. 주요 화면 구현
1. **Dashboard**: 최근 송출 이력, 통계
2. **Preview Studio**: 실시간 미리보기, 송출 설정
3. **Templates**: CRUD, 카테고리 필터
4. **Schedules**: 캘린더 뷰, 예약/반복 설정
5. **Displays**: 전광판 관리, 측정소 선택
6. **Audit Logs**: 필터링, CSV Export

### B. 송출 페이지 구현
- `/display/:id` 라우트 설정
- Realtime 구독으로 자동 갱신
- 우선순위 기반 콘텐츠 표시

### C. 통합 테스트
- 전체 시스템 동작 검증
- 시연 준비

---

## 9. 참고 문서

- **[Supabase 공식 문서](https://supabase.com/docs)**
- **[React Query + Supabase](https://supabase.com/docs/guides/getting-started/tutorials/with-react)**
- **[프로젝트 README](./README.md)**
- **[Supabase 설정 가이드](./SUPABASE_SETUP.md)**

---

**작성일**: 2024-12-16  
**문서 버전**: v1.0.0
