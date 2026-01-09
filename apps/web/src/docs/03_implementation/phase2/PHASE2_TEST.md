# Phase 2: Templates 관리 시스템 - 테스트 시나리오

## 📋 개요

Phase 2 Templates 관리 시스템의 기능별 테스트 시나리오 및 예상 결과

## 🧪 테스트 환경 준비

### 필수 조건
1. Supabase 프로젝트 연결 완료
2. 테스트 사용자 계정 생성:
   - ADMIN 권한 계정 1개
   - OPERATOR 권한 계정 1개
   - VIEWER 권한 계정 1개
3. message_templates 테이블 존재
4. audit_logs 테이블 존재

### 테스트 데이터
```sql
-- 샘플 템플릿 (테스트 전 수동 삽입 가능)
INSERT INTO message_templates (name, title, body, category, style_config)
VALUES 
  ('테스트 일반 템플릿', '일반 안내', '이것은 테스트 메시지입니다.', 'general', '{"backgroundColor":"#ffffff","textColor":"#000000","titleColor":"#1e40af","fontSize":"16px"}'),
  ('테스트 긴급 템플릿', '긴급 안내', '긴급 상황입니다!', 'emergency', '{"backgroundColor":"#ff0000","textColor":"#ffffff","titleColor":"#ffff00","fontSize":"24px"}');
```

## 📱 Frontend 테스트

### 1. 템플릿 목록 조회 (TemplateListPage)

#### 테스트 케이스 1-1: 페이지 접근
**단계**:
1. `/login`에서 VIEWER 계정으로 로그인
2. 사이드바에서 "Templates" 클릭
3. `/templates` 페이지 확인

**예상 결과**:
- ✅ 페이지 정상 접근
- ✅ 템플릿 목록 표시 (카드 형식)
- ✅ 카테고리 필터 버튼 표시
- ✅ "새 템플릿" 버튼 **미표시** (VIEWER 권한)
- ✅ 카드 내 편집/삭제 버튼 **미표시**
- ✅ 미리보기 버튼만 표시

#### 테스트 케이스 1-2: OPERATOR 권한 UI
**단계**:
1. 로그아웃 후 OPERATOR 계정으로 재로그인
2. `/templates` 접근

**예상 결과**:
- ✅ "새 템플릿" 버튼 **표시**
- ✅ 카드 내 편집/삭제 버튼 **표시**
- ✅ 미리보기 버튼 표시

#### 테스트 케이스 1-3: 카테고리 필터링
**단계**:
1. "전체" 선택 → 모든 템플릿 확인
2. "긴급" 선택 → emergency 카테고리만 표시
3. "공지" 선택 → notice 카테고리만 표시
4. "일반" 선택 → general 카테고리만 표시

**예상 결과**:
- ✅ 각 카테고리별로 정확히 필터링
- ✅ 선택된 버튼 스타일 변경 (variant="default")
- ✅ 로딩 없이 즉시 필터링 (프론트엔드 필터링은 아니고 API 재요청)

#### 테스트 케이스 1-4: 빈 상태
**단계**:
1. 데이터베이스에서 모든 템플릿 삭제
2. 페이지 새로고침

**예상 결과**:
- ✅ "등록된 템플릿이 없습니다" 메시지 표시
- ✅ "첫 템플릿 만들기" 버튼 표시 (OPERATOR/ADMIN만)
- ✅ 빈 상태 UI 깔끔하게 표시

#### 테스트 케이스 1-5: 새로고침 버튼
**단계**:
1. "새로고침" 버튼 클릭
2. 로딩 스피너 확인

**예상 결과**:
- ✅ 버튼 아이콘이 회전 애니메이션 (animate-spin)
- ✅ 최신 데이터로 목록 갱신
- ✅ 로딩 완료 후 애니메이션 종료

### 2. 템플릿 생성 (TemplateFormPage - New)

#### 테스트 케이스 2-1: 페이지 접근 권한
**단계**:
1. VIEWER 계정으로 `/templates/new` 직접 접근

**예상 결과**:
- ✅ 접근 거부 (ProtectedRoute)
- ✅ 권한 부족 메시지 또는 리다이렉트

**단계**:
2. OPERATOR 계정으로 `/templates/new` 접근

**예상 결과**:
- ✅ 페이지 정상 접근
- ✅ 빈 폼 표시

#### 테스트 케이스 2-2: 필수 필드 검증
**단계**:
1. 폼을 비워둔 채 "생성하기" 버튼 클릭

**예상 결과**:
- ✅ "필수 항목을 모두 입력해주세요" 토스트 에러
- ✅ 폼 제출 실패

**단계**:
2. name만 입력 후 제출

**예상 결과**:
- ✅ 동일한 에러 메시지

#### 테스트 케이스 2-3: 정상 생성
**단계**:
1. 다음 데이터 입력:
   - 템플릿 이름: "테스트 공지 템플릿"
   - 카테고리: "공지"
   - 제목: "공원 운영시간 안내"
   - 본문: "평일 오전 6시 ~ 오후 10시\n주말 오전 5시 ~ 오후 11시"
   - 강조 메시지: "안전하게 이용해주세요"
   - 배경색: #e0f2fe (연한 파랑)
   - 제목 색상: #0c4a6e (진한 파랑)
   - 본문 색상: #374151 (회색)
   - 글자 크기: 18
2. "미리보기" 버튼으로 확인
3. "생성하기" 버튼 클릭

**예상 결과**:
- ✅ "템플릿이 성공적으로 생성되었습니다" 토스트 성공 메시지
- ✅ `/templates` 페이지로 자동 이동
- ✅ 목록에 새 템플릿 표시
- ✅ audit_logs 테이블에 CREATE 액션 기록

#### 테스트 케이스 2-4: 미리보기 기능
**단계**:
1. 폼 작성 중 "미리보기" 버튼 클릭

**예상 결과**:
- ✅ 다이얼로그 팝업
- ✅ 16:9 비율로 전광판 시뮬레이션
- ✅ 입력한 스타일 그대로 적용
- ✅ 제목, 본문, 강조 메시지 모두 표시

### 3. 템플릿 수정 (TemplateFormPage - Edit)

#### 테스트 케이스 3-1: 기존 데이터 로드
**단계**:
1. 목록에서 템플릿 카드의 "수정" 버튼 클릭
2. `/templates/edit/{id}` 페이지 이동

**예상 결과**:
- ✅ 로딩 스피너 표시
- ✅ 기존 데이터로 폼 자동 입력
- ✅ 스타일 설정 값도 정확히 로드

#### 테스트 케이스 3-2: 수정 및 저장
**단계**:
1. 제목을 "공원 운영시간 변경 안내"로 수정
2. 본문에 "※ 12월부터 변경됨" 추가
3. "수정 완료" 버튼 클릭

**예상 결과**:
- ✅ "템플릿이 성공적으로 수정되었습니다" 토스트
- ✅ `/templates` 페이지로 이동
- ✅ 수정된 내용 반영
- ✅ version 필드가 1 증가 (예: v1 → v2)
- ✅ audit_logs에 UPDATE 액션 기록 (previous_version, new_version 포함)

#### 테스트 케이스 3-3: 취소 버튼
**단계**:
1. 수정 페이지에서 데이터 변경
2. "취소" 버튼 클릭

**예상 결과**:
- ✅ `/templates` 페이지로 이동
- ✅ 변경사항 저장 안 됨

### 4. 템플릿 삭제

#### 테스트 케이스 4-1: 삭제 확인 다이얼로그
**단계**:
1. 템플릿 카드의 "삭제" 버튼 클릭

**예상 결과**:
- ✅ 확인 다이얼로그 표시
- ✅ "'{템플릿명}' 템플릿을 삭제하시겠습니까?" 메시지
- ✅ "삭제" / "취소" 버튼 표시

#### 테스트 케이스 4-2: 삭제 실행
**단계**:
1. 확인 다이얼로그에서 "삭제" 클릭

**예상 결과**:
- ✅ "템플릿이 성공적으로 삭제되었습니다" 토스트
- ✅ 목록에서 해당 템플릿 제거
- ✅ audit_logs에 DELETE 액션 기록

#### 테스트 케이스 4-3: 사용 중인 템플릿 삭제 시도
**단계**:
1. schedules 테이블에 해당 template_id 참조하는 레코드 생성
2. 삭제 시도

**예상 결과**:
- ✅ "Cannot delete template. It is currently being used in schedules." 에러 메시지
- ✅ 삭제 실패
- ✅ 템플릿 그대로 유지

### 5. 템플릿 미리보기

#### 테스트 케이스 5-1: 목록에서 미리보기
**단계**:
1. 템플릿 카드의 "미리보기" 버튼 (눈 아이콘) 클릭

**예상 결과**:
- ✅ 미리보기 다이얼로그 팝업
- ✅ 16:9 비율 디스플레이
- ✅ 실제 style_config 적용
- ✅ 제목/본문/강조 메시지 표시
- ✅ 하단에 메타데이터 (카테고리, 버전, 생성일, 수정일) 표시
- ✅ 스타일 설정 정보 (색상 견본 포함) 표시

#### 테스트 케이스 5-2: 다이얼로그 닫기
**단계**:
1. 미리보기 다이얼로그의 X 버튼 클릭
2. 또는 ESC 키 입력
3. 또는 배경 클릭

**예상 결과**:
- ✅ 다이얼로그 닫힘
- ✅ 목록 페이지로 복귀

## 🔌 Backend API 테스트

### API 테스트 도구 사용 (Postman / curl)

#### 환경 변수 설정
```bash
SUPABASE_URL=https://{project-id}.supabase.co
ACCESS_TOKEN={로그인 후 세션 토큰}
```

### 테스트 케이스 API-1: GET /templates (전체 조회)
```bash
curl -X GET \
  "$SUPABASE_URL/functions/v1/make-server-5231839f/templates?category=all" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**예상 응답** (200 OK):
```json
{
  "templates": [...]
}
```

### 테스트 케이스 API-2: GET /templates (카테고리 필터)
```bash
curl -X GET \
  "$SUPABASE_URL/functions/v1/make-server-5231839f/templates?category=emergency" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**예상 응답**:
- ✅ category='emergency'인 템플릿만 반환

### 테스트 케이스 API-3: GET /templates/:id
```bash
curl -X GET \
  "$SUPABASE_URL/functions/v1/make-server-5231839f/templates/{template-id}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**예상 응답** (200 OK):
```json
{
  "template": {...}
}
```

**예상 응답** (404 Not Found - 존재하지 않는 ID):
```json
{
  "error": "Template not found"
}
```

### 테스트 케이스 API-4: POST /templates (생성)
```bash
curl -X POST \
  "$SUPABASE_URL/functions/v1/make-server-5231839f/templates" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API 테스트 템플릿",
    "title": "API로 생성한 템플릿",
    "body": "테스트 본문입니다.",
    "highlight": "테스트 강조",
    "category": "notice",
    "style_config": {
      "backgroundColor": "#ffffff",
      "textColor": "#000000",
      "titleColor": "#1e40af",
      "fontSize": "16px"
    }
  }'
```

**예상 응답** (201 Created):
```json
{
  "template": {
    "id": "new-uuid",
    "name": "API 테스트 템플릿",
    ...
  }
}
```

**예상 응답** (400 Bad Request - 필수 필드 누락):
```json
{
  "error": "Missing required fields: name, title, body"
}
```

**예상 응답** (403 Forbidden - VIEWER 권한):
```json
{
  "error": "Insufficient permissions. OPERATOR or ADMIN role required."
}
```

### 테스트 케이스 API-5: PUT /templates/:id (수정)
```bash
curl -X PUT \
  "$SUPABASE_URL/functions/v1/make-server-5231839f/templates/{template-id}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "수정된 템플릿",
    "title": "수정된 제목",
    "body": "수정된 본문",
    "category": "general",
    "style_config": {
      "backgroundColor": "#f0f0f0",
      "textColor": "#333333",
      "titleColor": "#0066cc",
      "fontSize": "18px"
    }
  }'
```

**예상 응답** (200 OK):
```json
{
  "template": {
    "id": "{template-id}",
    "version": 2,  // 증가
    ...
  }
}
```

### 테스트 케이스 API-6: DELETE /templates/:id (삭제)
```bash
curl -X DELETE \
  "$SUPABASE_URL/functions/v1/make-server-5231839f/templates/{template-id}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**예상 응답** (200 OK):
```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

**예상 응답** (400 Bad Request - 스케줄에서 사용 중):
```json
{
  "error": "Cannot delete template. It is currently being used in schedules."
}
```

### 테스트 케이스 API-7: 인증 없이 요청
```bash
curl -X GET \
  "$SUPABASE_URL/functions/v1/make-server-5231839f/templates" \
  -H "Content-Type: application/json"
```

**예상 응답** (401 Unauthorized):
```json
{
  "error": "Missing Authorization header"
}
```

## 🔍 데이터베이스 검증

### Audit Logs 확인
```sql
SELECT * FROM audit_logs
WHERE resource_type = 'TEMPLATE'
ORDER BY created_at DESC
LIMIT 10;
```

**예상 결과**:
- ✅ CREATE 액션: template_name, category 기록
- ✅ UPDATE 액션: template_name, previous_version, new_version 기록
- ✅ DELETE 액션: template_name 기록
- ✅ user_email, user_role 정확히 기록
- ✅ action_detail JSON 정확히 저장

### Version 증가 확인
```sql
SELECT id, name, version, created_at, updated_at
FROM message_templates
WHERE name = '수정 테스트 템플릿'
ORDER BY updated_at DESC;
```

**예상 결과**:
- ✅ 수정 시마다 version 1씩 증가
- ✅ updated_at 자동 갱신

## 📊 성능 테스트

### 로딩 시간
- 템플릿 목록 조회 (10개): < 500ms
- 템플릿 단건 조회: < 200ms
- 템플릿 생성: < 1s
- 템플릿 수정: < 1s
- 템플릿 삭제: < 500ms

### 동시 사용자
- 5명 동시 접속 시 정상 동작
- 동시 생성/수정 시 트랜잭션 처리 정확

## ✅ 체크리스트

### Frontend
- [ ] VIEWER 권한으로 목록 조회 가능
- [ ] OPERATOR 권한으로 생성/수정/삭제 가능
- [ ] ADMIN 권한으로 생성/수정/삭제 가능
- [ ] 카테고리 필터링 정상 작동
- [ ] 미리보기 다이얼로그 정상 표시
- [ ] 필수 필드 검증 작동
- [ ] 스타일 설정 정확히 적용
- [ ] 토스트 메시지 정상 표시
- [ ] 반응형 레이아웃 (모바일/태블릿/PC)

### Backend
- [ ] GET /templates 정상 응답
- [ ] GET /templates/:id 정상 응답
- [ ] POST /templates 정상 생성
- [ ] PUT /templates/:id 정상 수정
- [ ] DELETE /templates/:id 정상 삭제
- [ ] 권한 검증 정확
- [ ] Audit Log 자동 기록
- [ ] 사용 중인 템플릿 삭제 방지
- [ ] 에러 메시지 명확

### Database
- [ ] message_templates 테이블 CRUD 정상
- [ ] audit_logs 테이블 자동 삽입
- [ ] version 자동 증가
- [ ] 외래키 제약 조건 (schedules 참조 시 삭제 불가)

## 🐛 알려진 이슈 및 해결

현재 알려진 이슈 없음

## 📝 테스트 완료 후 보고서

### 테스트 실행일: ___________
### 테스터: ___________
### 총 테스트 케이스: 30개
### 통과: _____ / 30
### 실패: _____ / 30
### 이슈 발견: _____

---

**작성자**: Figma Make AI  
**최종 수정**: 2024-12-16
