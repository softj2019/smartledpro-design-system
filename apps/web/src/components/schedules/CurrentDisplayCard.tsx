// ================================================================
// Current Display Card - 현재 송출 중인 콘텐츠 표시
// ================================================================

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@softj/smartledpro-design-system';
import { Badge } from '@softj/smartledpro-design-system';
import { Monitor, Clock, Zap } from 'lucide-react';

interface CurrentDisplayCardProps {
  currentDisplay: {
    template: {
      id: string;
      name: string;
      title: string;
      body: string;
      highlight?: string;
      category?: string;
      style_config?: any;
    };
    content_type: string;
    priority: number;
    expires_at: string | null;
  } | null;
  loading?: boolean;
}

export function CurrentDisplayCard({ currentDisplay, loading }: CurrentDisplayCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!currentDisplay?.expires_at) {
      setTimeRemaining('무제한');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(currentDisplay.expires_at!);
      const diffMs = expires.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining('만료됨');
        return;
      }

      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        setTimeRemaining(`${diffDays}일 ${diffHours % 24}시간 ${diffMinutes % 60}분`);
      } else if (diffHours > 0) {
        setTimeRemaining(`${diffHours}시간 ${diffMinutes % 60}분`);
      } else {
        setTimeRemaining(`${diffMinutes}분`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [currentDisplay?.expires_at]);

  const getContentTypeBadge = (type: string) => {
    switch (type) {
      case 'EMERGENCY':
        return <Badge variant="destructive" className="text-base px-3 py-1">긴급</Badge>;
      case 'NOTICE':
        return <Badge className="bg-blue-500 text-base px-3 py-1">공지</Badge>;
      case 'WEATHER':
        return <Badge className="bg-green-500 text-base px-3 py-1">날씨</Badge>;
      default:
        return <Badge variant="secondary" className="text-base px-3 py-1">{type}</Badge>;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 900) return 'text-red-600';
    if (priority >= 500) return 'text-orange-600';
    return 'text-blue-600';
  };

  if (loading) {
    return (
      <Card className="border-2 border-blue-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="w-6 h-6" />
            <CardTitle>현재 송출 중</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-gray-200 rounded-lg"></div>
            <div className="h-6 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentDisplay) {
    return (
      <Card className="border-2 border-gray-300">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="w-6 h-6 text-gray-400" />
            <CardTitle>현재 송출 중</CardTitle>
          </div>
          <CardDescription>현재 전광판에 표시되고 있는 콘텐츠가 없습니다</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { template, content_type, priority } = currentDisplay;
  const bgColor = template.style_config?.backgroundColor || '#1e3a8a';
  const textColor = template.style_config?.textColor || '#ffffff';

  return (
    <Card className="border-2 border-red-500 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Monitor className="w-6 h-6 text-red-600" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            </div>
            <CardTitle className="text-red-600">현재 송출 중</CardTitle>
          </div>
          {getContentTypeBadge(content_type)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 썸네일 프리뷰 - 크게 */}
        <div
          className="rounded-lg p-6 flex flex-col justify-center items-center text-center min-h-[200px] shadow-inner overflow-hidden"
          style={{ backgroundColor: bgColor }}
        >
          {template.highlight && (
            <p
              className="text-base mb-3 font-medium opacity-90"
              style={{ color: textColor }}
            >
              {template.highlight}
            </p>
          )}

          {/* Body (HTML 지원) */}
          <div
            className="text-lg opacity-90 w-full"
            style={{ color: textColor }}
            dangerouslySetInnerHTML={{ __html: template.body }}
          />
        </div>

        {/* 메타데이터 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-lg">{template.name}</span>
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${getPriorityColor(priority)}`} />
              <span className={`text-sm ${getPriorityColor(priority)}`}>
                우선순위: {priority}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-gray-600">
            <Clock className="w-5 h-5" />
            <div>
              <span className="text-sm">남은 시간: </span>
              <span className="font-semibold text-base">{timeRemaining}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}