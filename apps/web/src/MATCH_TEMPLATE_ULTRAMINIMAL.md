# 경기 일정 템플릿 초단순화 업데이트

**날짜:** 2024-12-22
**작업:** 전광판 표시 제약을 고려한 UI 완전 단순화

## 변경 이유
- 전광판은 표시 가능한 글자 수가 제한적
- 불필요한 스타일 모두 제거
- 줄간격 최소화
- 폰트 크기 48px 고정

## 새로운 UI 사양

### 스타일
- **배경:** 검정 (`bg-black`)
- **폰트 크기:** 48px
- **폰트 색상:** 흰색
- **줄간격:** 없음 (`lineHeight: 1`)
- **기타 스타일:** 전혀 없음

### 표시 형식
```
오늘 대관 정보

팀명1 10~13시
팀명2 14~15시
```

## 구현 내용

### `/components/templates/MatchScheduleTemplate.tsx`

**완전히 단순화된 구조:**
```tsx
export function MatchScheduleTemplate({ matches }: MatchScheduleTemplateProps) {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center" style={{ lineHeight: 1 }}>
      <div className="text-white text-center" style={{ fontSize: '48px', lineHeight: 1 }}>
        <div style={{ marginBottom: '48px' }}>오늘 대관 정보</div>
        {matches.map((match, index) => (
          <div key={index} style={{ marginBottom: '48px' }}>
            {match.club_name} {match.time_range}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 제거된 요소
1. ✅ 모든 그라데이션 배경
2. ✅ 모든 카드/박스 스타일
3. ✅ 아이콘 (🏟️)
4. ✅ 경기장 명칭 표시
5. ✅ 푸터
6. ✅ hover 효과
7. ✅ 그림자
8. ✅ 애니메이션
9. ✅ 줄간격
10. ✅ 패딩/마진 (간격용 최소한만 유지)

## 유지된 요소
- 검정 배경
- 48px 흰색 폰트
- "오늘 대관 정보" 제목
- "팀명 시간" 형식의 경기 정보

## 결과
전광판 특성에 최적화된 초단순 UI로 가독성 극대화
