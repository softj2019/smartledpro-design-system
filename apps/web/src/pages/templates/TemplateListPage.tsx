// ================================================================
// TemplateListPage - Template Management Page
// ================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplates, MessageTemplate } from '../../lib/hooks/useTemplates';
import { usePermissions } from '../../lib/hooks/usePermissions';
import { useConfirm } from '../../lib/hooks/useConfirm';
import { AdminPageHeader } from '../../components/layout/AdminPageHeader';
import { Button } from "@softj/smartledpro-design-system";
import { TemplateCard } from '../../components/templates/TemplateCard';
import { TemplateFilter } from '../../components/templates/TemplateFilter';
import { TemplatePreview } from '../../components/templates/TemplatePreview';
import { TemplateSkeletonGrid } from '../../components/templates/TemplateSkeleton';
import { Plus, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { logger } from '../../lib/debug-logger';

export function TemplateListPage() {
  const navigate = useNavigate();
  const { canEdit } = usePermissions();
  const confirm = useConfirm();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // ✅ activeTemplateId 변경 감지
  useEffect(() => {
    logger.info('TemplateListPage', 'Active template ID changed', { 
      activeTemplateId,
      hasValue: !!activeTemplateId 
    });
  }, [activeTemplateId]);

  // Use autoFetch with category dependency
  const {
    templates,
    loading,
    fetchTemplates,
    deleteTemplate,
  } = useTemplates({ category: selectedCategory, autoFetch: true });

  // 현재 송출 중인 템플릿 ID 가져오기
  const fetchActiveTemplate = async () => {
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/display/current`;
      logger.info('Display', 'Fetching active template', { url });
      
      // ✅ Authorization 헤더 추가 (public anon key 사용)
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        logger.error('Display', 'Failed to fetch active template - HTTP error', { 
          status: response.status,
          statusText: response.statusText 
        });
        setActiveTemplateId(null);
        return;
      }
      
      const data = await response.json();
      
      logger.info('Display', 'Active template response', { 
        success: data.success, 
        hasTemplate: !!data.template,
        templateId: data.template?.id,
        templateName: data.template?.name,
        source: data.source,
        fullResponse: data
      });
      
      if (data.success && data.template && data.template.id) {
        setActiveTemplateId(data.template.id);
        logger.success('Display', `✅ Active template set: ${data.template.name} (${data.template.id})`);
      } else {
        setActiveTemplateId(null);
        logger.info('Display', 'No active template - setting null', { 
          dataSuccess: data.success,
          hasTemplate: !!data.template,
          templateId: data.template?.id 
        });
      }
    } catch (error) {
      logger.error('Display', 'Failed to fetch active template', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      setActiveTemplateId(null);
    }
  };

  // 초기 로드 시 현재 송출 중인 템플릿 확인
  useEffect(() => {
    fetchActiveTemplate();
    
    // 10초마다 자동 갱신
    const interval = setInterval(() => {
      fetchActiveTemplate();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // 카테고리 변경 시에도 현재 송출 중인 템플릿 확인
  useEffect(() => {
    fetchActiveTemplate();
  }, [selectedCategory]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // autoFetch will handle the refetch automatically
  };

  const handleCreateNew = () => {
    navigate('/templates/new');
  };

  const handleEdit = (template: MessageTemplate) => {
    navigate(`/templates/${template.id}`);
  };

  const handleDelete = async (template: MessageTemplate) => {
    const confirmed = await confirm({
      title: '템플릿 삭제',
      description: `"${template.name}" 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'destructive',
    });

    if (confirmed) {
      await deleteTemplate(template.id);
    }
  };

  const handlePreview = (template: MessageTemplate) => {
    setPreviewTemplate(template);
  };

  const handleRefresh = () => {
    fetchTemplates(selectedCategory);
    fetchActiveTemplate(); // ✅ 활성 템플릿도 함께 갱신
  };

  // 검색 필터링된 템플릿
  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const name = (template.name || '').toLowerCase();
    const title = (template.title || '').toLowerCase();
    const body = (template.body || '').toLowerCase();
    
    return name.includes(query) || title.includes(query) || body.includes(query);
  });

  const handleSendToDisplay = async (template: MessageTemplate) => {
    try {
      logger.info('Display', `Sending template to display: ${template.name}`, { template_id: template.id });

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/display/send`;
      const token = localStorage.getItem('access_token');

      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      logger.info('Display', 'Sending request', { url, template_id: template.id });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ template_id: template.id }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        logger.error('Display', 'Failed to parse response', { 
          status: response.status, 
          statusText: response.statusText,
          parseError 
        });
        throw new Error(`서버 응답을 파싱할 수 없습니다 (${response.status})`);
      }

      logger.info('Display', 'Response received', { status: response.status, data });

      if (!response.ok) {
        const errorMessage = data.error || data.details || `HTTP ${response.status}`;
        logger.error('Display', 'API error', { status: response.status, data });
        throw new Error(errorMessage);
      }

      logger.info('Display', 'Template sent successfully', data);
      toast.success('전광판 전송 완료', {
        description: `"${template.name}" 템플릿이 전광판으로 전송되었습니다.`,
      });
      
      // 전송 후 활성 템플릿 다시 가져오기
      fetchActiveTemplate();
    } catch (error) {
      logger.error('Display', 'Failed to send template to display', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        template_id: template.id,
        template_name: template.name,
      });
      toast.error('전광판 전송 실패', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title="템플릿 관리"
        description="메시지 템플릿을 관리하고 전광판에 표시할 콘텐츠를 생성합니다."
        icon={<FileText className="w-8 h-8" />}
        breadcrumbs={[
          { label: '템플릿 관리' }
        ]}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            {canEdit && (
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                새 템플릿
              </Button>
            )}
          </>
        }
      />

      {/* Filter */}
      <TemplateFilter
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Templates Grid */}
      {loading && templates.length === 0 ? (
        <TemplateSkeletonGrid count={6} />
      ) : filteredTemplates.length === 0 && searchQuery ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
            <p className="text-sm text-gray-600 mb-6">
              &quot;{searchQuery}&quot;에 해당하는 템플릿이 없습니다.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setSearchQuery('')}
          >
            검색 초기화
          </Button>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Plus className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">등록된 템플릿이 없습니다</h3>
            <p className="text-sm text-gray-600 mb-6">첫 번째 템플릿을 만들어 전광판 콘텐츠를 관리하세요.</p>
          </div>
          <Button onClick={handleCreateNew} size="lg" className="px-8">
            <Plus className="h-5 w-5 mr-2" />
            템플릿 만들기
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canEdit ? handleDelete : undefined}
              onPreview={handlePreview}
              canEdit={canEdit}
              onSendToDisplay={handleSendToDisplay}
              isActive={activeTemplateId === template.id}
            />
          ))}
        </div>
      )}

      {/* Template Count */}
      {templates.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          {searchQuery ? (
            <>
              검색 결과: {filteredTemplates.length}개 / 전체: {templates.length}개
            </>
          ) : (
            <>
              총 {templates.length}개의 템플릿
            </>
          )}
        </div>
      )}

      {/* Preview Dialog */}
      <TemplatePreview
        template={previewTemplate}
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />
    </div>
  );
}