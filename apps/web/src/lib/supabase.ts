// ================================================================
// Supabase Client Configuration
// ================================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { logger } from './debug-logger';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// ================================================================
// Supabase 클라이언트 싱글톤 (중복 인스턴스 방지)
// ================================================================
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseInstance() {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        // JWT 토큰 자동 갱신 활성화
        autoRefreshToken: true,
        // 세션 영구 저장 (localStorage 사용)
        persistSession: true,
        // URL에서 세션 감지 (OAuth 콜백용)
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        // 플로우 타입: pkce (더 안전한 OAuth 플로우)
        flowType: 'pkce',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'X-Client-Info': 'goyang-smartcity-liviglab',
        },
      },
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabaseInstance();

// ================================================================
// JWT 세션 정보 확인 함수
// ================================================================

/**
 * 현재 JWT 세션 정보 조회 (만료시간 포함)
 */
export async function getSessionInfo() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return null;
  }

  // JWT 토큰 만료 시간 확인
  const expiresAt = session.expires_at; // Unix timestamp
  const expiresIn = session.expires_in; // seconds
  const now = Math.floor(Date.now() / 1000);
  const remainingSeconds = expiresAt ? expiresAt - now : 0;

  logger.info('Auth', 'Session info', {
    expiresAt: new Date((expiresAt || 0) * 1000).toLocaleString('ko-KR'),
    expiresIn: `${expiresIn}초 (${Math.floor(expiresIn / 60)}분)`,
    remaining: `${remainingSeconds}초 (${Math.floor(remainingSeconds / 60)}분)`,
    accessToken: session.access_token.substring(0, 20) + '...',
  });

  return {
    session,
    expiresAt,
    expiresIn,
    remainingSeconds,
    willExpireSoon: remainingSeconds < 300, // 5분 이내 만료 예정
  };
}

// ================================================================
// Helper Functions
// ================================================================

/**
 * 현재 로그인된 사용자 정보 조회
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    logger.error('Auth', 'Error fetching user', { message: error.message });
    return null;
  }
  
  return user;
}

/**
 * 사용자 역할 조회
 */
export async function getUserRole() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      logger.error('Auth', 'Error fetching user for role', { message: error.message });
      return null;
    }
    
    if (!user) {
      logger.warn('Auth', 'No user found for role check');
      return null;
    }
    
    const role = user.user_metadata?.role || 'VIEWER';
    const canEmergency = user.user_metadata?.can_emergency === true || user.user_metadata?.can_emergency === 'true';
    
    logger.debug('Auth', 'Get user role', { role, canEmergency, user_metadata: user.user_metadata });
    
    return { role, canEmergency };
  } catch (error) {
    logger.error('Auth', 'Exception in getUserRole', error);
    return null;
  }
}

/**
 * 로그인
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  // 로그인 성공 후 세션 정보 로그
  await getSessionInfo();
  
  return data;
}

/**
 * 로그아웃
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * 세션 변경 구독
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

// ================================================================
// Audit Log Helper
// ================================================================

/**
 * 감사 로그 기록
 */
export async function logAction(params: {
  action: string;
  resourceType: string;
  resourceId?: string;
  actionDetail?: any;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    logger.warn('Audit', 'Cannot log action: User not authenticated');
    return;
  }
  
  const { role } = await getUserRole() || { role: 'VIEWER' };
  
  const { error } = await supabase.from('audit_logs').insert({
    user_id: user.id,
    user_email: user.email!,
    user_role: role,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    action_detail: params.actionDetail,
  });
  
  if (error) {
    logger.error('Audit', 'Failed to log action', { error: error.message, params });
  } else {
    logger.info('Audit', `Action logged: ${params.action}`, { resourceType: params.resourceType, resourceId: params.resourceId });
  }
}