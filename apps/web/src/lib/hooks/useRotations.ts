// ================================================================
// useRotations Hook - 순차 반복 데이터 관리
// ================================================================

import { useState, useEffect, useCallback } from 'react';
import { projectId } from '../../utils/supabase/info';
import { logger } from '../debug-logger';
import type { Rotation } from '../types/rotation';

export function useRotations() {
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRotations = useCallback(async () => {
    logger.info('Rotations', '순차 반복 목록 조회 시작');
    setLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('인증 토큰이 없습니다');
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/broadcast/rotations`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '순차 반복 목록을 가져오는데 실패했습니다');
      }

      const data = await response.json();
      logger.success('Rotations', '순차 반복 목록 조회 성공', { count: data.rotations?.length || 0 });
      setRotations(data.rotations || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      logger.error('Rotations', '순차 반복 목록 조회 실패', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleRotation = useCallback(async (id: string): Promise<Rotation | null> => {
    logger.info('Rotations', '순차 반복 토글 시작', { id });

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('인증 토큰이 없습니다');
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/broadcast/rotation/${id}/toggle`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '순차 반복 상태 변경에 실패했습니다');
      }

      const data = await response.json();
      logger.success('Rotations', '순차 반복 토글 성공', { 
        id, 
        is_active: data.rotation.is_active 
      });

      // 목록 갱신
      setRotations(prev => 
        prev.map(r => r.id === id ? data.rotation : r)
      );

      return data.rotation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      logger.error('Rotations', '순차 반복 토글 실패', { id, error: errorMessage });
      return null;
    }
  }, []);

  const deleteRotation = useCallback(async (id: string): Promise<boolean> => {
    logger.info('Rotations', '순차 반복 삭제 시작', { id });

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('인증 토큰이 없습니다');
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/broadcast/rotation/${id}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '순차 반복 삭제에 실패했습니다');
      }

      logger.success('Rotations', '순차 반복 삭제 성공', { id });

      // 목록에서 제거
      setRotations(prev => prev.filter(r => r.id !== id));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      logger.error('Rotations', '순차 반복 삭제 실패', { id, error: errorMessage });
      return false;
    }
  }, []);

  useEffect(() => {
    fetchRotations();
  }, [fetchRotations]);

  return {
    rotations,
    loading,
    error,
    toggleRotation,
    deleteRotation,
    refreshRotations: fetchRotations,
  };
}
