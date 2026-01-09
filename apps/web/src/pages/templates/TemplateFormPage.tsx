// ================================================================
// TemplateFormPage - Create/Edit Template
// ================================================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTemplates, MessageTemplate } from '../../lib/hooks/useTemplates';
import { AdminPageHeader } from '../../components/layout/AdminPageHeader';
import { Button } from "@softj/smartledpro-design-system";
import { Input } from "@softj/smartledpro-design-system";
import { Label } from "@softj/smartledpro-design-system";
import { Card } from "@softj/smartledpro-design-system";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@softj/smartledpro-design-system";
import { ArrowLeft, Save, ChevronLeft, ChevronRight, Home, Plus, Send, MonitorPlay, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '../../lib/debug-logger';
import { SmartEditor } from '../../components/templates/SmartEditor';
import { projectId } from '../../utils/supabase/info';
import { DisplayControl } from '../../components/templates/DisplayControl';
import { Badge } from "@softj/smartledpro-design-system";

const CATEGORIES = [
  { value: 'general', label: '일반' },
  { value: 'notice', label: '공지' },
  { value: 'event', label: '이벤트' },
  { value: 'weather', label: '날씨' },
  { value: 'emergency', label: '긴급' },
];

export function TemplateFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id && id !== 'new';

  const { templates, loading: templatesLoading, getTemplate, createTemplate, updateTemplate, fetchTemplates } = useTemplates({ autoFetch: true });

  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    body: '',
    highlight: '',
    category: 'general',
    backgroundColor: '#000000',
  });

  // 캐러셀 상태
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const [showDisplayControl, setShowDisplayControl] = useState(false);

  useEffect(() => {
    if (isEditMode && id) {
      loadTemplate();
    }
    fetchActiveTemplate();
  }, [id, isEditMode]);

  // 현재 송출 중인 템플릿 ID 가져오기
  const fetchActiveTemplate = async () => {
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/display/current`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.template) {
        setActiveTemplateId(data.template.id);
      } else {
        setActiveTemplateId(null);
      }
    } catch (error) {
      logger.error('Display', 'Failed to fetch active template', error);
    }
  };

  const loadTemplate = async () => {
    if (!id || id === 'new') return;

    setLoadingTemplate(true);
    try {
      const template = await getTemplate(id);
      const styleConfig = template.style_config || {};
      
      const loadedData = {
        name: template.name,
        body: template.body || '',
        highlight: template.highlight || '',
        category: template.category || 'general',
        backgroundColor: styleConfig.backgroundColor || '#000000',
      };
      
      setFormData(loadedData);
      
      logger.success('Template', 'Template loaded successfully', { id, name: template.name });
    } catch (error) {
      logger.error('Template', 'Failed to load template', { id, error });
      toast.error('템플릿을 불러오는데 실패했습니다.');
      navigate('/templates');
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // body에서 텍스트 추출하여 검증
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formData.body;
    const bodyText = tempDiv.textContent || '';

    if (!formData.name.trim()) {
      toast.error('템플릿 이름을 입력해주세요.');
      return;
    }

    if (!bodyText.trim()) {
      toast.error('본문 내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const templateData = {
        name: formData.name.trim(),
        title: formData.name.trim(), // title을 name으로 설정
        body: formData.body,
        highlight: formData.highlight.trim() || undefined,
        category: formData.category,
        style_config: {
          backgroundColor: formData.backgroundColor,
        },
      };

      logger.info('Template', 'Submitting template data', templateData);

      if (isEditMode && id) {
        await updateTemplate(id, templateData);
        logger.success('Template', 'Template updated successfully', { id, name: templateData.name });
      } else {
        const result = await createTemplate(templateData);
        logger.success('Template', 'Template created successfully', { name: templateData.name, result });
      }

      // 저장 후 템플릿 목록 다시 불러오기
      toast.success('템플릿이 성공적으로 저장되었습니다.');
      
      try {
        await fetchTemplates();
        logger.info('Template', 'Template list refreshed after save');
      } catch (refreshError) {
        logger.error('Template', 'Failed to refresh template list (save was successful)', { refreshError });
        // 목록 새로고침 실패는 무시 (저장 자체는 성공했으므로)
      }
    } catch (error) {
      logger.error('Template', 'Failed to save template', { 
        error, 
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        isEditMode, 
        id, 
        formData 
      });
      toast.error('템플릿 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // 변경사항이 있는지 확인
    const hasChanges = formData.name || formData.body || formData.highlight;
    
    if (hasChanges) {
      const confirmed = window.confirm('작성 중인 내용이 있습니다. 취소하시겠습니까?');
      if (!confirmed) return;
    }
    
    navigate('/templates');
  };

  // 신규 생성 (폼 초기화)
  const handleNewTemplate = () => {
    if (isEditMode) {
      // 편집 모드에서는 /templates/new로 이동
      navigate('/templates/new');
    } else {
      // 이미 새 템플릿 페이지라면 폼 초기화
      const hasContent = formData.name || formData.body || formData.highlight;
      
      if (hasContent) {
        const confirmed = window.confirm('작성 중인 내용을 지우고 새로 시작하시겠습니까?');
        if (!confirmed) return;
      }
      
      setFormData({
        name: '',
        body: '',
        highlight: '',
        category: 'general',
        backgroundColor: '#000000',
      });
      
      toast.success('새 템플릿 작성을 시작합니다.');
      logger.info('Template', 'Form reset for new template');
    }
  };

  // 템플릿 선택 핸들러
  const handleTemplateSelect = async (template: MessageTemplate) => {
    // 템플릿 편집 페이지로 이동
    navigate(`/templates/${template.id}`);
    logger.info('Template', 'Navigating to template edit page', { id: template.id, name: template.name });
  };

  // HTML 렌더링
  const renderBodyWithColors = (html: string) => {
    if (!html || html.trim().length === 0) {
      return <div style={{ color: '#FFD400' }}>본문을 입력하세요</div>;
    }
    return (
      <div 
        style={{ 
          width: '100%',
          color: '#FFD400',
          fontSize: '16px',
          fontFamily: 'NanumGothic',
          fontWeight: 700,
        }} 
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    );
  };

  // 썸네일 생성 (미리보기용)
  const generateThumbnail = (template: MessageTemplate) => {
    const styleConfig = template.style_config || {};
    const backgroundColor = styleConfig.backgroundColor || '#000000';
    
    return (
      <div
        className="w-full relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        style={{
          aspectRatio: '430 / 260',
          backgroundColor: backgroundColor,
        }}
        onClick={() => handleTemplateSelect(template)}
      >
        {/* 430px 콘텐츠를 썸네일 크기에 맞게 축소 */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '430px',
            height: '260px',
            transform: 'translate(-50%, -50%) scale(0.26)',
            transformOrigin: 'center',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div 
            style={{
              width: '430px',
              height: '260px',
              padding: '24px',
              color: '#FFD400',
              fontSize: '16px',
              fontFamily: 'NanumGothic',
              fontWeight: 700,
            }}
            dangerouslySetInnerHTML={{ __html: template.body || template.title }} 
          />
        </div>
      </div>
    );
  };

  // 캐러셀 이동
  const handleCarouselPrev = () => {
    setCarouselIndex(Math.max(0, carouselIndex - 3));
  };

  const handleCarouselNext = () => {
    setCarouselIndex(Math.min(templates.length - 3, carouselIndex + 3));
  };

  // 페이징 처리
  const paginatedTemplates = templates.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  const totalPages = Math.ceil(templates.length / itemsPerPage);

  // 전광판 전송 핸들러
  const handleSendToDisplay = async () => {
    if (!isEditMode || !id) {
      toast.error('저장된 템플릿만 전광판으로 전송할 수 있습니다.');
      return;
    }

    try {
      logger.info('Display', `Sending template to display: ${formData.name}`, { template_id: id });

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/display/send`;
      const token = localStorage.getItem('access_token');

      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }

      logger.info('Display', 'Sending request', { url, template_id: id });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ template_id: id }),
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
        description: `"${formData.name}" 템플릿이 전광판으로 전송되었습니다.`,
      });
      
      // 전송 후 활성 템플릿 다시 가져오기
      fetchActiveTemplate();
    } catch (error) {
      logger.error('Display', 'Failed to send template to display', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        template_id: id,
        template_name: formData.name,
      });
      toast.error('전광판 전송 실패', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-1/3"></div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="h-64 bg-gray-100 rounded"></div>
            </div>
            <div className="bg-white rounded-lg border p-6">
              <div className="h-64 bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        stickyOnMobile={true}
        title={
          <div className="flex items-center gap-2">
            <span>{isEditMode ? '템플릿 수정' : '새 템플릿'}</span>
            {isEditMode && id && activeTemplateId === id && (
              <Badge className="bg-green-500 text-white border-green-600">
                송출 중
              </Badge>
            )}
          </div>
        }
        description={
          isEditMode
            ? '기존 템플릿의 내용을 수정하고 전광판에 표시할 콘텐츠를 업데이트합니다.'
            : '새로운 메시지 템플릿을 생성하여 전광판에 표시할 콘텐츠를 만듭니다.'
        }
        icon={<FileText className="w-8 h-8" />}
        breadcrumbs={[
          { label: '템플릿 관리', href: '/templates' },
          { label: isEditMode ? '템플릿 수정' : '새 템플릿' }
        ]}
        actions={
          <>
            <Button 
              type="submit"
              form="template-form"
              disabled={loading}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? '저장 중...' : '저장'}
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={handleSendToDisplay} 
              disabled={loading || !isEditMode}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300 disabled:opacity-50"
              title={!isEditMode ? '템플릿을 먼저 저장해주세요' : '전광판으로 전송'}
            >
              <Send className="w-4 h-4 mr-2" />
              전광판 전송
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={handleCancel} 
              disabled={loading}
            >
              취소
            </Button>
          </>
        }
      />

      {/* Form */}
      <form id="template-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          {/* Left: Live Preview & Template List */}
          <div className="space-y-6">
            {/* Info message */}
            <div className="p-3 bg-blue-50 border border-blue-200 text-xs text-blue-800 rounded-lg">
              💡 빨간 프레임은 측정용이며 실제 전광판에는 표시되지 않습니다.
            </div>

            {/* Preview Display */}
            <div className="w-full relative group">
              <div
                className="relative overflow-hidden"
                style={{
                  width: '100%',
                  aspectRatio: '430 / 260',
                  border: '10px solid #ff0000',
                  background: formData.backgroundColor,
                }}
              >
                {/* 실제 전광판 크기로 렌더링 후 축소 */}
                <div 
                  className="absolute inset-0"
                  style={{
                    transform: 'scale(0.93)',
                    transformOrigin: 'center center',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '430px',
                      height: '260px',
                      padding: '24px',
                    }}
                  >
                    {renderBodyWithColors(formData.body)}
                  </div>
                </div>

                {/* 전광판 컨트롤 버튼 - 우측 하단 */}
                {isEditMode && id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisplayControl(true)}
                    className="absolute bottom-3 right-3 bg-white/95 hover:bg-white shadow-lg border-2 border-blue-500 text-blue-700 hover:text-blue-800 z-10"
                    title="전광판 위치 및 크기 조정"
                  >
                    <MonitorPlay className="h-4 w-4 mr-1" />
                    컨트롤
                  </Button>
                )}
              </div>
            </div>

            {/* 3칸 썸네일 캐러셀 */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">저장된 템플릿</h3>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCarouselPrev}
                    disabled={carouselIndex === 0}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCarouselNext}
                    disabled={carouselIndex >= templates.length - 3}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {templatesLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 animate-pulse rounded"></div>
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  저장된 템플릿이 없습니다
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {templates.slice(carouselIndex, carouselIndex + 3).map((template) => (
                    <div key={template.id}>
                      {generateThumbnail(template)}
                    </div>
                  ))}
                  {/* 빈 슬롯 채우기 */}
                  {templates.slice(carouselIndex, carouselIndex + 3).length < 3 &&
                    Array.from({ length: 3 - templates.slice(carouselIndex, carouselIndex + 3).length }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-full h-20 border border-dashed border-gray-300 rounded"></div>
                    ))}
                </div>
              )}
            </Card>

            {/* 페이징 목록 - 모바일에서 숨김 */}
            <Card className="p-4 hidden lg:block">
              <h3 className="text-sm font-semibold mb-3">전체 목록</h3>
              
              {templatesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 animate-pulse rounded"></div>
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  저장된 템플릿이 없습니다
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {paginatedTemplates.map((template) => {
                      const styleConfig = template.style_config || {};
                      const backgroundColor = styleConfig.backgroundColor || '#000000';
                      
                      return (
                        <div
                          key={template.id}
                          className="flex items-center gap-3 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleTemplateSelect(template)}
                        >
                          {/* 썸네일 - 캐러셀과 동일한 축소 렌더링 방식 */}
                          <div
                            className="w-16 h-12 flex-shrink-0 border border-gray-300 rounded overflow-hidden relative"
                            style={{
                              backgroundColor: backgroundColor,
                            }}
                          >
                            {/* 430px 콘텐츠를 썸네일 크기에 맞게 축소 */}
                            <div 
                              style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                width: '430px',
                                height: '260px',
                                transform: 'translate(-50%, -50%) scale(0.149)',
                                transformOrigin: 'center',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <div 
                                style={{
                                  width: '430px',
                                  height: '260px',
                                  padding: '24px',
                                  color: '#FFD400',
                                  fontSize: '16px',
                                  fontFamily: 'NanumGothic',
                                  fontWeight: 700,
                                }}
                                dangerouslySetInnerHTML={{ __html: template.body || template.title }} 
                              />
                            </div>
                          </div>
                          
                          {/* 제목 */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{template.name}</div>
                            <div className="text-xs text-gray-500">
                              {CATEGORIES.find(c => c.value === template.category)?.label || '일반'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="h-8"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <span className="text-xs text-gray-600">
                        {currentPage + 1} / {totalPages}
                      </span>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage === totalPages - 1}
                        className="h-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>

          {/* Right: Form */}
          <div className="space-y-6">
            {loadingTemplate ? (
              /* 스켈레톤 애니메이션 */
              <Card className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-10 bg-gray-100 rounded"></div>
                    </div>
                    
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                      <div className="h-10 bg-gray-100 rounded"></div>
                    </div>
                    
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                      <div className="flex gap-2">
                        <div className="w-16 h-10 bg-gray-100 rounded"></div>
                        <div className="flex-1 h-10 bg-gray-100 rounded"></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-32 bg-gray-100 rounded"></div>
                    </div>
                    
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                      <div className="h-10 bg-gray-100 rounded"></div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              /* 실제 폼 */
              <>
                {/* Basic Info */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">기본 정보</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">템플릿 이름 *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="예: 공원 운영시간 안내"
                        required
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">카테고리 *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger id="category" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="backgroundColor">배경색</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="backgroundColor"
                          type="color"
                          value={formData.backgroundColor}
                          onChange={(e) =>
                            setFormData({ ...formData, backgroundColor: e.target.value })
                          }
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.backgroundColor}
                          onChange={(e) =>
                            setFormData({ ...formData, backgroundColor: e.target.value })
                          }
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>본문 * (전광판 전용 에디터)</Label>
                      <div className="mt-2">
                        <SmartEditor
                          value={formData.body}
                          onChange={(html) => setFormData({ ...formData, body: html })}
                          backgroundColor={formData.backgroundColor}
                          placeholder="전광판에 표시될 내용을 입력하세요..."
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="highlight">강조 메시지 (선택)</Label>
                      <Input
                        id="highlight"
                        value={formData.highlight}
                        onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
                        placeholder="예: 중요 안내사항"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </form>

      {/* Display Control Dialog */}
      {showDisplayControl && (
        <DisplayControl onClose={() => setShowDisplayControl(false)} />
      )}
    </div>
  );
}