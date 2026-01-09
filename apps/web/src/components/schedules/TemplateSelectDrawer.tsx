import { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { Button } from '@softj/smartledpro-design-system';
import { Input } from '@softj/smartledpro-design-system';
import type { MessageTemplate } from '../../lib/hooks/useTemplates';
import { logger } from '../../lib/debug-logger';

interface TemplateSelectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  templates: MessageTemplate[];
  selectedTemplateId: string;
  onSelect: (templateId: string) => void;
}

export function TemplateSelectDrawer({
  isOpen,
  onClose,
  templates,
  selectedTemplateId,
  onSelect,
}: TemplateSelectDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 드로어 열릴 때 디버깅 정보 로깅
  useEffect(() => {
    if (isOpen) {
      logger.info('TemplateDrawer', `드로어 열림 - 템플릿 ${templates.length}개`, {
        templateCount: templates.length,
        selectedTemplateId,
      });

      // 각 템플릿 상세 정보 로깅
      templates.forEach((template, index) => {
        const hasBody = !!template.body;
        const hasHighlight = !!template.highlight;
        const hasStyleConfig = !!template.style_config;
        const bodyLength = template.body?.length || 0;
        
        logger.info('TemplateDrawer', `템플릿 #${index + 1}: ${template.name}`, {
          id: template.id,
          name: template.name,
          category: template.category,
          hasBody,
          bodyLength,
          bodyPreview: template.body?.substring(0, 50) || '(없음)',
          hasHighlight,
          highlight: template.highlight || '(없음)',
          hasStyleConfig,
          styleConfig: template.style_config || '(없음)',
          backgroundColor: template.style_config?.backgroundColor || '(기본값)',
          textColor: template.style_config?.textColor || '(기본값)',
          fontSize: template.style_config?.fontSize || '(기본값)',
        });
      });

      // 검색 결과 로깅
      if (searchQuery) {
        const filteredCount = templates.filter((t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).length;
        logger.info('TemplateDrawer', `검색 결과: ${filteredCount}개`, {
          searchQuery,
          filteredCount,
          totalCount: templates.length,
        });
      }
    }
  }, [isOpen, templates, selectedTemplateId, searchQuery]);

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (templateId: string) => {
    onSelect(templateId);
    onClose();
  };

  const getTemplateThumbnail = (template: MessageTemplate) => {
    // TODO: 실제 썸네일 URL이 있으면 사용
    if (template.thumbnail_url) {
      return template.thumbnail_url;
    }
    
    // 카테고리별 기본 아이콘/색상
    const categoryColors: Record<string, string> = {
      emergency: 'bg-red-500',
      notice: 'bg-blue-500',
      weather: 'bg-green-500',
      event: 'bg-purple-500',
      general: 'bg-gray-500',
    };
    
    return categoryColors[template.category || 'general'] || 'bg-gray-500';
  };

  const getCategoryLabel = (category: string | null) => {
    const labels: Record<string, string> = {
      emergency: '긴급',
      notice: '공지',
      weather: '날씨',
      event: '이벤트',
      general: '일반',
    };
    return labels[category || 'general'] || '일반';
  };

  // 인라인 템플릿 프리뷰 컴포넌트
  const TemplatePreview = ({ template, className }: { template: MessageTemplate; className?: string }) => {
    const styleConfig = template.style_config || {};
    const backgroundColor = styleConfig.backgroundColor || '#000000';
    const textColor = styleConfig.textColor || '#FFD400';
    const fontSize = styleConfig.fontSize || '14px'; // 작은 크기로 조정
    const fontWeight = styleConfig.fontWeight || '700';
    const textAlign = styleConfig.textAlign || 'center';
    const fontFamily = styleConfig.fontFamily || 'Arial, Helvetica, sans-serif';

    // 데이터 없을 때 로깅
    const hasContent = template.body || template.highlight;
    if (!hasContent) {
      logger.warn('TemplatePreview', `템플릿에 표시할 내용 없음: ${template.name}`, {
        templateId: template.id,
        hasBody: !!template.body,
        hasHighlight: !!template.highlight,
        hasStyleConfig: !!template.style_config,
      });
    }

    return (
      <div 
        className={className}
        style={{
          backgroundColor: backgroundColor,
          color: textColor,
          fontFamily: fontFamily,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
          padding: '16px',
          overflow: 'hidden',
        }}
      >
        {/* 데이터 없을 때 안내 메시지 */}
        {!hasContent ? (
          <div style={{
            textAlign: 'center',
            color: '#888',
            fontSize: '12px',
          }}>
            <div style={{ marginBottom: '8px', fontSize: '24px' }}>📝</div>
            <div>미리보기 데이터 없음</div>
            <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
              템플릿을 수정하여 내용을 추가하세요
            </div>
          </div>
        ) : (
          <>
            {/* Highlight */}
            {template.highlight && (
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: textColor,
                  opacity: 0.9,
                }}
              >
                {template.highlight}
              </div>
            )}

            {/* Body */}
            <div
              style={{
                fontSize: fontSize,
                fontWeight: fontWeight,
                lineHeight: '1.3',
                width: '100%',
                textAlign: textAlign as any,
              }}
              dangerouslySetInnerHTML={{ __html: template.body || '' }}
            />
          </>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl">템플릿 선택</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="템플릿 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 템플릿이 없습니다.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template) => {
                const isSelected = template.id === selectedTemplateId;
                const thumbnailClass = getTemplateThumbnail(template);
                const hasThumbnail = template.thumbnail_url;

                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template.id)}
                    className={`
                      w-full flex flex-col gap-3 p-4 rounded-lg border-2 transition-all
                      hover:border-blue-300 hover:bg-blue-50
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-white'
                      }
                    `}
                  >
                    {/* Preview - Display Board Style */}
                    <div className="w-full aspect-[16/9] bg-gray-900 rounded-lg overflow-hidden relative">
                      <TemplatePreview
                        template={template}
                        className="w-full h-full"
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 text-left min-w-0">
                        <h3 className="text-base mb-1 truncate">
                          {template.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`
                            inline-block px-2 py-1 text-xs rounded
                            ${template.category === 'emergency' ? 'bg-red-100 text-red-700' : ''}
                            ${template.category === 'notice' ? 'bg-blue-100 text-blue-700' : ''}
                            ${template.category === 'weather' ? 'bg-green-100 text-green-700' : ''}
                            ${template.category === 'event' ? 'bg-purple-100 text-purple-700' : ''}
                          `}>
                            {getCategoryLabel(template.category)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              총 {filteredTemplates.length}개의 템플릿
            </span>
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}