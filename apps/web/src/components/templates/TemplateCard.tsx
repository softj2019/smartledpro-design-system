// ================================================================
// TemplateCard Component - Display template in card format
// ================================================================

import { MessageTemplate } from '../../lib/hooks/useTemplates';
import { Card } from '@softj/smartledpro-design-system';
import { Button } from '@softj/smartledpro-design-system';
import { Badge } from '@softj/smartledpro-design-system';
import { Edit2, Trash2, Eye, MonitorPlay } from 'lucide-react';
import { logger } from '../../lib/debug-logger';

interface TemplateCardProps {
  template: MessageTemplate;
  onEdit?: (template: MessageTemplate) => void;
  onDelete?: (template: MessageTemplate) => void;
  onPreview?: (template: MessageTemplate) => void;
  onSendToDisplay?: (template: MessageTemplate) => void;
  canEdit?: boolean;
  isActive?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  emergency: 'bg-red-100 text-red-800 border-red-200',
  notice: 'bg-blue-100 text-blue-800 border-blue-200',
  event: 'bg-purple-100 text-purple-800 border-purple-200',
  weather: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  general: 'bg-gray-100 text-gray-800 border-gray-200',
};

const CATEGORY_LABELS: Record<string, string> = {
  emergency: '긴급',
  notice: '공지',
  event: '이벤트',
  weather: '날씨',
  general: '일반',
};

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  onPreview,
  onSendToDisplay,
  canEdit = false,
  isActive = false,
}: TemplateCardProps) {
  const categoryColor = CATEGORY_COLORS[template.category || 'general'] || CATEGORY_COLORS.general;
  const categoryLabel = CATEGORY_LABELS[template.category || 'general'] || '일반';
  const styleConfig = template.style_config || {};
  const backgroundColor = styleConfig.backgroundColor || '#000000';

  return (
    <Card 
      className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${isActive ? 'ring-2 ring-green-500' : ''}`}
      onClick={() => canEdit && onEdit?.(template)}
    >
      {/* Thumbnail Preview - 실제 전광판 비율 (430:260) */}
      <div
        className="w-full relative"
        style={{
          aspectRatio: '430 / 260',
          backgroundColor: backgroundColor,
        }}
      >
        {isActive && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-green-500 text-white border-green-600">
              송출 중
            </Badge>
          </div>
        )}
        {/* 전체 콘텐츠를 축소하여 표시 */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: 'scale(0.28)',
            transformOrigin: 'center center',
            width: '357%',
            height: '357%',
            top: '-128.5%',
            left: '-128.5%',
          }}
        >
          <div 
            className="w-[430px] h-[260px] flex items-center justify-center text-center p-6"
            dangerouslySetInnerHTML={{ __html: template.body || template.title }} 
          />
        </div>
      </div>

      {/* Card Info */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{template.name}</h3>
          </div>
          <Badge className={categoryColor} variant="outline">
            {categoryLabel}
          </Badge>
        </div>

        {/* Highlight */}
        {template.highlight && (
          <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded truncate">
            {template.highlight}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-gray-500">
            <span>v{template.version}</span>
            <span className="mx-1">•</span>
            <span>{new Date(template.created_at).toLocaleDateString('ko-KR')}</span>
          </div>

          <div className="flex items-center gap-1">
            {onSendToDisplay && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSendToDisplay(template);
                }}
                title="전광판 전송"
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <MonitorPlay className="h-4 w-4" />
              </Button>
            )}
            {onPreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(template);
                }}
                title="미리보기"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {canEdit && onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(template);
                }}
                title="수정"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            {canEdit && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(template);
                }}
                title="삭제"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}