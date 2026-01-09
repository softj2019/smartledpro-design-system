// ================================================================
// useTemplates Hook - Template CRUD Operations
// ================================================================

import { useState, useEffect, useRef } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import { logger } from '../debug-logger';

export interface MessageTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  highlight: string | null;
  style_config: any;
  category: string | null;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  thumbnail_url?: string;
  is_active?: boolean; // 송출 중 여부 (프론트엔드에서 추가)
}

interface UseTemplatesOptions {
  category?: string;
  autoFetch?: boolean;
}

export function useTemplates(options: UseTemplatesOptions = {}) {
  const { category = 'all', autoFetch = true } = options;
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTemplates = async (filterCategory?: string) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    if (!isMountedRef.current) return [];
    
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const categoryParam = filterCategory !== undefined ? filterCategory : category;
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/templates?category=${categoryParam}`;

      logger.info('Templates', `Fetching templates (category: ${categoryParam})`, { url, filterCategory, category });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch templates');
      }

      const data = await response.json();
      
      // 서버 응답 상세 로깅
      logger.info('Templates', `서버 응답 수신`, {
        templateCount: data.templates?.length || 0,
        firstTemplate: data.templates?.[0] || null,
        hasBody: !!data.templates?.[0]?.body,
        hasHighlight: !!data.templates?.[0]?.highlight,
        hasStyleConfig: !!data.templates?.[0]?.style_config,
        rawResponse: data,
      });
      
      if (isMountedRef.current) {
        setTemplates(data.templates || []);
        logger.success('Templates', `Fetched ${data.templates?.length || 0} templates`);
      }
      
      return data.templates || [];
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError') {
        return [];
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      if (isMountedRef.current) {
        setError(errorMessage);
        logger.error('Templates', 'Failed to fetch templates', { error: errorMessage });
        toast.error(`템플릿 조회 실패: ${errorMessage}`);
      }
      
      return [];
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  };

  const getTemplate = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/templates/${id}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch template');
      }

      const data = await response.json();
      return data.template;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`템플릿 조회 실패: ${errorMessage}`);
      throw err;
    }
  };

  const createTemplate = async (templateData: {
    name: string;
    title: string;
    body: string;
    highlight?: string;
    style_config?: any;
    category?: string;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/templates`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create template');
      }

      const data = await response.json();
      toast.success('템플릿이 성공적으로 생성되었습니다.');
      
      return data.template;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`템플릿 생성 실패: ${errorMessage}`);
      throw err;
    }
  };

  const updateTemplate = async (
    id: string,
    templateData: {
      name: string;
      title: string;
      body: string;
      highlight?: string;
      style_config?: any;
      category?: string;
    }
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/templates/${id}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update template');
      }

      const data = await response.json();
      toast.success('템플릿이 성공적으로 수정되었습니다.');
      
      return data.template;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`템플릿 수정 실패: ${errorMessage}`);
      throw err;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/templates/${id}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }

      toast.success('템플릿이 성공적으로 삭제되었습니다.');
      
      // Refresh after delete since we stay on the same page
      if (isMountedRef.current) {
        await fetchTemplates();
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`템플릿 삭제 실패: ${errorMessage}`);
      throw err;
    }
  };

  // Auto-fetch on mount and when category changes
  useEffect(() => {
    isMountedRef.current = true;
    
    if (autoFetch) {
      fetchTemplates(category);
    }
    
    return () => {
      isMountedRef.current = false;
      // Cancel any pending requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [category, autoFetch]); // Only depend on category and autoFetch, not fetchTemplates

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}