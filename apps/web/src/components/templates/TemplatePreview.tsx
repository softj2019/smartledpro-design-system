// ================================================================
// TemplatePreview Component - Preview template in display format
// ================================================================

import { MessageTemplate } from '../../lib/hooks/useTemplates';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@softj/smartledpro-design-system';
import { Button } from '@softj/smartledpro-design-system';
import { X, ExternalLink } from 'lucide-react';

interface TemplatePreviewProps {
  template: MessageTemplate | null;
  open: boolean;
  onClose: () => void;
}

export function TemplatePreview({ template, open, onClose }: TemplatePreviewProps) {
  if (!template) return null;

  const styleConfig = template.style_config || {};
  const backgroundColor = styleConfig.backgroundColor || '#000000';
  const textColor = styleConfig.textColor || '#FFD400';
  const fontSize = styleConfig.fontSize || '21px';
  const fontWeight = styleConfig.fontWeight || '700';
  const textAlign = styleConfig.textAlign || 'center';
  const fontFamily = styleConfig.fontFamily || 'Arial, Helvetica, sans-serif';
  
  // 데이터 유무 확인
  const hasContent = template.body || template.highlight;

  // 실제 전광판 보기 함수
  const handleViewDisplay = () => {
    window.open('/display/view', '_blank', 'width=640,height=360');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>전광판 미리보기: {template.name}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDisplay}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                실제 전광판 보기
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* 전광판 미리보기 - 축소된 크기 (430x260 비율 유지, 0.7배 축소) */}
          <div className="flex items-center justify-center bg-gray-900 p-6 rounded-lg">
            <div className="relative">
              {/* 430x260 활성 영역 (0.7배 축소: 301x182) */}
              <div
                style={{
                  width: '430px',
                  height: '260px',
                  transform: 'scale(0.7)',
                  transformOrigin: 'center center',
                  background: backgroundColor,
                  color: textColor,
                  fontFamily: fontFamily,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '20px',
                  textAlign: textAlign as any,
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                }}
              >
                {/* 데이터 없을 때 안내 메시지 */}
                {!hasContent ? (
                  <div style={{
                    textAlign: 'center',
                    color: '#888',
                    fontSize: '16px',
                  }}>
                    <div style={{ marginBottom: '12px', fontSize: '48px' }}>📝</div>
                    <div style={{ fontSize: '18px', marginBottom: '8px' }}>미리보기 데이터 없음</div>
                    <div style={{ fontSize: '14px', opacity: 0.7 }}>
                      템플릿 관리에서 내용을 추가하세요
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Highlight (강조 메시지) */}
                    {template.highlight && (
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          marginBottom: '10px',
                          color: textColor,
                          opacity: 0.9,
                        }}
                      >
                        {template.highlight}
                      </div>
                    )}

                    {/* Body (HTML 지원) */}
                    <div
                      style={{
                        fontSize: fontSize,
                        fontWeight: fontWeight,
                        lineHeight: '1.3',
                        width: '100%',
                      }}
                      dangerouslySetInnerHTML={{ __html: template.body || '' }}
                    />
                  </>
                )}
              </div>

              {/* 크기 안내 */}
              <div className="absolute -bottom-8 left-0 right-0 text-center text-xs text-gray-400">
                실제 전광판 크기: 430×260px (70% 축소 표시)
              </div>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-8">
            <p className="text-sm text-blue-800">
              💡 위 화면은 실제 전광판 크기의 70%로 축소되어 표시됩니다. 
              <strong> 실제 전광판 보기</strong> 버튼을 클릭하면 새 창에서 실제 크기(430×260px)로 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function
function getCategoryLabel(category: string | null): string {
  const categoryMap: Record<string, string> = {
    general: '일반',
    notice: '공지',
    event: '이벤트',
    emergency: '긴급',
    weather: '날씨',
  };
  return categoryMap[category || 'general'] || '일반';
}