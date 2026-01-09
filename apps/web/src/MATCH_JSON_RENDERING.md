# 경기 일정 템플릿 HTML 직접 생성 시스템

**날짜:** 2024-12-22
**작업:** 서버에서 전광판 최적화 스타일의 HTML을 직접 생성하여 저장

## 문제 원인

크롤링된 경기 데이터가 전광판에 제대로 표시되지 않았던 이유:

1. **서버에서 옛날 스타일 HTML 생성** (`/supabase/functions/server/index.tsx` 3067-3093 라인)
   - 작은 폰트 (font-size: 28px, 24px)
   - 불필요한 여백 (margin-bottom: 15px, padding: 12px)
   - 시간 형식이 "10:30 ~ 13:00 시"로 분까지 표시 (전광판에서 불필요)
   - 줄간격 있음 (전광판에서 낭비)

2. **DisplayView가 HTML을 그대로 렌더링**
   - `dangerouslySetInnerHTML`로 서버 HTML을 그대로 표시
   - 전광판 특성에 맞지 않는 스타일

## 해결 방법

### 서버에서 전광판 최적화 HTML 직접 생성
```
[기존] 서버 → 작은 폰트 HTML (28px, 24px) → DisplayView
[변경] 서버 → 큰 폰트 HTML (48px, 줄간격 없음) → DisplayView
```

## 구현 내용

### 1. 서버: 전광판 최적화 HTML 생성 (`/supabase/functions/server/index.tsx`)

**변경 전 (옛날 스타일):**
```typescript
let matchesHtml = allMatches.map(match => {
  return `
    <div style="margin-bottom: 15px; padding: 12px;">
      <div style="font-size: 28px;">${clubName}</div>
      <div style="font-size: 24px;">${startHour}:${startMin} ~ ${endHour}:${endMin} 시</div>
    </div>
  `;
}).join('');
```

**변경 후 (전광판 최적화):**
```typescript
// 제목
const titleHtml = '<div style="font-size: 48px; line-height: 48px; color: white; text-align: center; margin: 0; padding: 0;">오늘 대관 정보</div>';

// 경기 목록
const matchesListHtml = allMatches.map(match => {
  const startHour = startTime.getHours();
  const endHour = endTime.getHours();
  
  return `<div style="font-size: 48px; line-height: 48px; color: white; text-align: center; margin: 0; padding: 0;">${clubName} ${startHour}~${endHour}</div>`;
}).filter(html => html).join('');

const matchesHtml = titleHtml + matchesListHtml;

await supabase.from('message_templates').upsert({
  body: matchesHtml,
  category: 'joongsan_match',
  // ...
});
```

**주요 변경점:**
- ✅ 큰 폰트: 48px (기존 28px, 24px에서 2배 확대)
- ✅ 줄간격 없음: line-height: 48px (font-size와 동일)
- ✅ 여백 제거: margin: 0, padding: 0
- ✅ 시간 간소화: "10~13" (기존 "10:30 ~ 13:00 시"에서 시만 표시)
- ✅ 중앙 정렬: text-align: center
- ✅ 흰색 텍스트: color: white

### 2. DisplayView: HTML 렌더링 (`/pages/DisplayView.tsx`)

**변경 사항:**
```typescript
{template && (
  <div>
    {/* Body (HTML 지원) - 본문만 표시 */}
    <div
      style={{
        fontSize: '21px',
        lineHeight: '1.3',
        width: '100%',
      }}
      dangerouslySetInnerHTML={{ __html: template.body }}
    />
  </div>
)}
```

**주요 변경점:**
- ✅ 변경 없음 - 기존대로 HTML을 그대로 렌더링
- ✅ 서버에서 생성한 인라인 스타일이 그대로 적용됨
- ✅ 템플릿 미리보기도 동일한 방식으로 작동

## 데이터 흐름

```
1. 크롤링 시스템
   ↓ 경기 데이터 (club_name, start_time, end_time)
   
2. /matches/sync-templates (서버)
   ↓ HTML 생성 (48px, 줄간격 없음, 시만 표시)
   ↓ category: 'joongsan_match'
   
3. message_templates 테이블
   ↓ body 필드에 HTML 문자열 저장
   
4. /display/current (서버)
   ↓ 템플릿 조회 및 반환
   
5. DisplayView (프론트엔드)
   ↓ dangerouslySetInnerHTML로 HTML 렌더링
   ↓ 서버 인라인 스타일 그대로 적용
   
6. 전광판 표시 ✅
   - 48px 폰트
   - 줄간격 없음 (line-height: 48px)
   - 여백 없음 (margin: 0, padding: 0)
   - 중앙 정렬
   - "팀명 10~13" 형식
```

## 장점

1. **간단한 아키텍처**
   - 서버: HTML 생성 및 저장
   - 프론트엔드: HTML 렌더링
   - 추가 파싱이나 변환 불필요

2. **템플릿 미리보기 동일**
   - 관리자 화면과 전광판 화면이 동일한 HTML 사용
   - 미리보기 = 실제 표시

3. **전광판 최적화**
   - 48px 큰 폰트로 가독성 향상
   - 줄간격 없애서 공간 절약
   - 시만 표시하여 정보 간소화

4. **유지보수 용이**
   - 스타일 변경 시 서버 코드만 수정
   - 인라인 스타일로 명확한 제어

5. **하위 호환성**
   - 일반 템플릿은 기존 방식 유지
   - HTML 렌더링 방식은 동일

## 테스트 방법

1. **수동 동기화**
   - 관리자 → 중산 경기 일정 → "지금 동기화" 버튼
   - 경기 데이터가 HTML로 저장되는지 확인

2. **전광판 확인**
   - `/display/view` 접속
   - 48px 폰트, 줄간격 없이 표시되는지 확인
   - "오늘 대관 정보" + "팀명 10~13" 형식

3. **템플릿 미리보기**
   - 관리자 → 템플릿 목록 → "[자동] 오늘의 경기 일정"
   - 미리보기 화면과 전광판 화면이 동일한지 확인

4. **디버그 로그**
   - 우측 중앙 플로팅 버튼 클릭
   - 템플릿 로딩 로그 확인

## HTML 예시

```html
<div style="font-size: 48px; line-height: 48px; color: white; text-align: center; margin: 0; padding: 0;">오늘 대관 정보</div>
<div style="font-size: 48px; line-height: 48px; color: white; text-align: center; margin: 0; padding: 0;">벚꽃 10~12</div>
<div style="font-size: 48px; line-height: 48px; color: white; text-align: center; margin: 0; padding: 0;">축구동호회 13~15</div>
```

## 문서 업데이트

- `/MATCH_TEMPLATE_ULTRAMINIMAL.md` - UI 초단순화 기록
- `/MATCH_JSON_RENDERING.md` (이 파일) - HTML 직접 생성 시스템
