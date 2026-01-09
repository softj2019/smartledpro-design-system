// ================================================================
// Template Preview Card - 템플릿 썸네일 미리보기
// ================================================================

import { Badge } from '@softj/smartledpro-design-system';
import { Card } from '@softj/smartledpro-design-system';
import { Clock, AlertCircle } from 'lucide-react';

interface TemplatePreviewCardProps {
  template: {
    id: string;
    name: string;
    title: string;
    body: string;
    highlight?: string;
    category?: string;
    style_config?: any;
  };
  contentType?: 'EMERGENCY' | 'NOTICE' | 'WEATHER';
  startTime?: string;
  endTime?: string;
  status?: 'active' | 'scheduled' | 'completed';
  compact?: boolean;
}

export function TemplatePreviewCard({
  template,
  contentType,
  startTime,
  endTime,
  status = 'scheduled',
  compact = false,
}: TemplatePreviewCardProps) {
  const getContentTypeBadge = (type: string) => {
    switch (type) {
      case 'EMERGENCY':
        return <Badge variant="destructive">긴급</Badge>;
      case 'NOTICE':
        return <Badge className="bg-blue-500">공지</Badge>;
      case 'WEATHER':
        return <Badge className="bg-green-500">날씨</Badge>;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'border-red-500 bg-red-50';
      case 'scheduled':
        return 'border-blue-300 bg-white';
      case 'completed':
        return 'border-gray-300 bg-gray-50 opacity-60';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getBgColor = () => {
    const styleConfig = template.style_config || {};
    return styleConfig.backgroundColor || '#1e3a8a';
  };

  const getTextColor = () => {
    const styleConfig = template.style_config || {};
    return styleConfig.textColor || '#ffffff';
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const date = new Date(time);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  if (compact) {
    return (
      <div className={`border rounded-lg p-2 ${getStatusColor()} transition-all hover:shadow-md`}>
        <div className="flex items-center gap-2 mb-1">
          {contentType && getContentTypeBadge(contentType)}
          {status === 'active' && (
            <div className="flex items-center gap-1 text-red-600">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span className="text-xs">송출 중</span>
            </div>
          )}
        </div>
        <p className="text-sm font-medium line-clamp-1">{template.name}</p>
        {(startTime || endTime) && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <Clock className="w-3 h-3" />
            <span>{formatTime(startTime)}</span>
            {endTime && <span> - {formatTime(endTime)}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={`overflow-hidden ${getStatusColor()} transition-all hover:shadow-lg`}>
      {/* 썸네일 미리보기 */}
      <div
        className="h-32 p-4 flex flex-col justify-center items-center text-center relative overflow-hidden"
        style={{ backgroundColor: getBgColor() }}
      >
        {status === 'active' && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded-full text-xs">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>LIVE</span>
          </div>
        )}
        
        {template.highlight && (
          <p
            className="text-sm mb-2 font-medium opacity-90"
            style={{ color: getTextColor() }}
          >
            {template.highlight}
          </p>
        )}
        
        {/* Body (HTML 지원) */}
        <div
          className="text-sm opacity-80 line-clamp-3 w-full"
          style={{ color: getTextColor() }}
          dangerouslySetInnerHTML={{ __html: template.body }}
        />
      </div>

      {/* 메타데이터 */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium line-clamp-1">{template.name}</span>
          {contentType && getContentTypeBadge(contentType)}
        </div>

        {(startTime || endTime) && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-3 h-3" />
            <span>
              {formatTime(startTime)}
              {endTime && ` - ${formatTime(endTime)}`}
            </span>
          </div>
        )}

        {status === 'completed' && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <AlertCircle className="w-3 h-3" />
            <span>송출 완료</span>
          </div>
        )}
      </div>
    </Card>
  );
}