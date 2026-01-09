// ================================================================
// Error Handler Utility
// ================================================================

/**
 * Supabase 및 일반 에러를 사용자 친화적인 메시지로 변환
 */
export function handleError(error: any): string {
  // Supabase 에러 처리
  if (error.code) {
    switch (error.code) {
      // PostgreSQL 에러 코드
      case '23505': // unique_violation
        return '이미 존재하는 데이터입니다.';
      
      case '23503': // foreign_key_violation
        return '연결된 데이터가 존재하여 작업을 수행할 수 없습니다.';
      
      case '23502': // not_null_violation
        return '필수 항목이 누락되었습니다.';
      
      case '22001': // string_data_right_truncation
        return '입력 데이터가 너무 깁니다.';
      
      case '22003': // numeric_value_out_of_range
        return '숫자 범위를 초과했습니다.';
      
      // PostgREST 에러 코드
      case 'PGRST116': // no rows returned
        return '데이터를 찾을 수 없습니다.';
      
      case 'PGRST301': // 권한 에러
        return '이 작업을 수행할 권한이 없습니다.';
      
      // 인증 에러
      case '42501': // insufficient_privilege
        return '접근 권한이 없습니다.';
      
      default:
        // 알 수 없는 코드는 원본 메시지 사용
        if (error.message) {
          return error.message;
        }
        return `데이터베이스 오류 (${error.code})`;
    }
  }

  // Supabase Auth 에러
  if (error.message) {
    if (error.message.includes('Invalid login credentials')) {
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }
    
    if (error.message.includes('Email not confirmed')) {
      return '이메일 인증이 필요합니다.';
    }
    
    if (error.message.includes('User already registered')) {
      return '이미 등록된 사용자입니다.';
    }
    
    if (error.message.includes('Password should be')) {
      return '비밀번호는 최소 6자 이상이어야 합니다.';
    }
  }

  // 네트워크 에러
  if (error.message === 'Failed to fetch') {
    return '네트워크 연결을 확인해주세요.';
  }

  if (error.message === 'Network request failed') {
    return '서버에 연결할 수 없습니다.';
  }

  // Timeout 에러
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
  }

  // 기본 메시지
  if (error.message) {
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * 에러 로깅 (개발 환경에서만)
 */
export function logError(error: any, context?: string) {
  if (import.meta.env.DEV) {
    console.group(`❌ Error${context ? ` in ${context}` : ''}`);
    console.error(error);
    if (error.details) console.log('Details:', error.details);
    if (error.hint) console.log('Hint:', error.hint);
    console.groupEnd();
  }
}

/**
 * 에러 토스트 표시를 위한 헬퍼
 */
export function getErrorToast(error: any) {
  const message = handleError(error);
  return {
    title: '오류가 발생했습니다',
    description: message,
    variant: 'destructive' as const,
  };
}
