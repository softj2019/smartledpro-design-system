// ================================================================
// Authentication Provider
// ================================================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getUserRole, getSessionInfo } from '../lib/supabase';
import type { CurrentUser } from '../lib/types';
import { logger } from '../lib/debug-logger';

interface AuthContextType {
  user: CurrentUser | null;
  session: { access_token: string; user: any } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Create context with null as default (will be replaced by provider)
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [session, setSession] = useState<{ access_token: string; user: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 10초 타임아웃 설정 - 로딩이 너무 오래 걸리면 강제 종료
    const timeout = setTimeout(() => {
      if (loading) {
        logger.error('Auth', 'Auth check timeout - forcing completion');
        setLoading(false);
      }
    }, 10000);
    
    // 초기 세션 확인
    checkUser().finally(() => {
      clearTimeout(timeout);
    });

    // 세션 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, supabaseSession) => {
        logger.info('Auth', `Auth state changed: ${event}`);
        if (supabaseSession?.user) {
          // access_token 저장
          if (supabaseSession.access_token) {
            localStorage.setItem('access_token', supabaseSession.access_token);
            logger.info('Auth', 'Access token updated in localStorage');
            
            // session state 업데이트
            setSession({
              access_token: supabaseSession.access_token,
              user: supabaseSession.user,
            });
          }
          await updateUser(supabaseSession.user);
        } else {
          // 로그아웃 시 토큰 제거
          localStorage.removeItem('access_token');
          setUser(null);
          setSession(null);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      setMounted(false);
    };
  }, []);

  async function checkUser() {
    try {
      logger.info('Auth', 'Checking user session...');
      
      // localStorage에서 세션 직접 확인 (더 빠름)
      const sessionStr = localStorage.getItem('sb-lcgaxwmqolcuorodrecd-auth-token');
      
      if (!sessionStr) {
        logger.info('Auth', 'No session found in localStorage');
        setLoading(false);
        return;
      }

      try {
        const sessionData = JSON.parse(sessionStr);
        
        if (!sessionData || !sessionData.access_token) {
          logger.info('Auth', 'Invalid session data');
          setLoading(false);
          return;
        }

        // 세션 만료 체크
        const expiresAt = sessionData.expires_at;
        const now = Math.floor(Date.now() / 1000);
        
        if (expiresAt && expiresAt < now) {
          logger.info('Auth', 'Session expired');
          localStorage.removeItem('sb-lcgaxwmqolcuorodrecd-auth-token');
          setLoading(false);
          return;
        }

        // user_metadata에서 직접 정보 추출
        const user = sessionData.user;
        if (user) {
          logger.info('Auth', 'User found in session', { email: user.email });
          
          // access_token을 localStorage에 저장
          if (sessionData.access_token) {
            localStorage.setItem('access_token', sessionData.access_token);
            logger.info('Auth', 'Access token saved to localStorage');
            
            // session state 업데이트
            setSession({
              access_token: sessionData.access_token,
              user: user,
            });
          }
          
          const currentUser: CurrentUser = {
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role || 'VIEWER',
            canEmergency: user.user_metadata?.can_emergency === true || user.user_metadata?.can_emergency === 'true',
          };
          
          setUser(currentUser);
          logger.success('Auth', 'User loaded from session', currentUser);
        } else {
          logger.info('Auth', 'No user in session');
        }
      } catch (parseError) {
        logger.error('Auth', 'Error parsing session', parseError);
      }
    } catch (error) {
      logger.error('Auth', 'Error checking user', error);
    } finally {
      setLoading(false);
      logger.info('Auth', 'Auth check complete');
    }
  }

  async function updateUser(supabaseUser: User) {
    try {
      logger.info('Auth', 'Updating user data...', { email: supabaseUser.email });
      
      const currentUser: CurrentUser = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        role: supabaseUser.user_metadata?.role || 'VIEWER',
        canEmergency: supabaseUser.user_metadata?.can_emergency === true || supabaseUser.user_metadata?.can_emergency === 'true',
      };
      
      setUser(currentUser);
      logger.success('Auth', 'User updated', currentUser);
    } catch (error) {
      logger.error('Auth', 'Error updating user', error);
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('Auth', 'Sign in failed', { error: error.message, email });
      throw error;
    }
    
    if (data.user && data.session) {
      // session state 업데이트
      setSession({
        access_token: data.session.access_token,
        user: data.user,
      });
      
      await updateUser(data.user);
      
      // 세션 정보 로깅
      const sessionInfo = await getSessionInfo();
      if (sessionInfo) {
        logger.success('Auth', 'Sign in successful - Session created', { 
          email,
          expiresIn: `${Math.floor(sessionInfo.expiresIn / 60)}분`,
          remaining: `${Math.floor(sessionInfo.remainingSeconds / 60)}분`,
        });
      } else {
        logger.success('Auth', 'Sign in successful', { email });
      }
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Auth', 'Sign out failed', { error: error.message });
      throw error;
    }
    // access_token 제거
    localStorage.removeItem('access_token');
    setUser(null);
    setSession(null);
    logger.info('Auth', 'Sign out successful');
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
