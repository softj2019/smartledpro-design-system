// ================================================================
// Priority Constants - 고양 스마트시티 전광판 우선순위 시스템
// 
// 우선순위 원칙: 낮은 숫자 = 높은 우선순위 (Unix Convention)
// EMERGENCY(100) > NOTICE(200) > WEATHER(300)
// ================================================================

export const PRIORITY = {
  EMERGENCY: 100,  // 긴급 공지 (최우선) - 재난·안전 긴급 메시지
  NOTICE: 200,     // 일반 공지 - 운영자 공지 사항
  WEATHER: 300,    // 날씨/대기질 정보 - 기상청·AirKorea 자동 데이터
} as const;

export const PRIORITY_LABELS = {
  [PRIORITY.EMERGENCY]: '긴급',
  [PRIORITY.NOTICE]: '공지',
  [PRIORITY.WEATHER]: '날씨',
} as const;

export const PRIORITY_COLORS = {
  [PRIORITY.EMERGENCY]: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    badge: 'bg-red-600',
  },
  [PRIORITY.NOTICE]: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    badge: 'bg-blue-600',
  },
  [PRIORITY.WEATHER]: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    badge: 'bg-green-600',
  },
} as const;

export type PriorityValue = typeof PRIORITY[keyof typeof PRIORITY];
export type ContentType = 'EMERGENCY' | 'NOTICE' | 'WEATHER';

export function getPriorityLabel(priority: number): string {
  return PRIORITY_LABELS[priority as PriorityValue] || '알 수 없음';
}

export function getContentTypeFromPriority(priority: number): ContentType {
  if (priority === PRIORITY.EMERGENCY) return 'EMERGENCY';
  if (priority === PRIORITY.NOTICE) return 'NOTICE';
  if (priority === PRIORITY.WEATHER) return 'WEATHER';
  return 'NOTICE';
}

export function getPriorityFromContentType(contentType: ContentType): number {
  return PRIORITY[contentType];
}