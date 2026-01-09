// ================================================================
// Active Rotation Banner - 현재 활성 중인 순차 반복 송출 상태 표시
// ================================================================

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@softj/smartledpro-design-system';
import { Button } from '@softj/smartledpro-design-system';
import { Badge } from '@softj/smartledpro-design-system';
import { 
  RotateCw, 
  StopCircle, 
  Clock, 
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { logger } from '../../lib/debug-logger';

interface ActiveRotation {
  id: string;
  name: string;
  template_ids: string[];
  current_index: number;
  duration_per_template: number;
  created_at: string;
  start_date: string;
  end_date: string;
  priority: number;
  current_template?: {
    id: string;
    name: string;
    category: string;
  };
  next_switch_at: string;
  time_until_next_ms: number;
}

interface ActiveRotationBannerProps {
  onRotationStopped?: () => void;
  onCurrentTemplateChange?: (templateId: string | null) => void;
}

export function ActiveRotationBanner({ onRotationStopped, onCurrentTemplateChange }: ActiveRotationBannerProps) {
  const [rotation, setRotation] = useState<ActiveRotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    fetchActiveRotation();
    const interval = setInterval(fetchActiveRotation, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Update time remaining every second
  useEffect(() => {
    if (!rotation) return;

    const updateTimer = () => {
      const now = Date.now();
      const nextSwitch = new Date(rotation.next_switch_at).getTime();
      const diff = nextSwitch - now;

      if (diff <= 0) {
        setTimeRemaining('곧 전환됩니다...');
        fetchActiveRotation(); // Refresh to get new state
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}분 ${seconds}초`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rotation]);

  const fetchActiveRotation = async () => {
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        logger.error('ActiveRotation', 'No access token');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/broadcast/rotation/active`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch active rotation');
      }

      const data = await response.json();
      
      if (data.active && data.rotation) {
        logger.info('ActiveRotation', 'Active rotation found', { rotation: data.rotation });
        setRotation(data.rotation);
        
        if (onCurrentTemplateChange) {
          onCurrentTemplateChange(data.rotation.current_template?.id || null);
        }
      } else {
        logger.info('ActiveRotation', 'No active rotation');
        setRotation(null);
        
        if (onCurrentTemplateChange) {
          onCurrentTemplateChange(null);
        }
      }
    } catch (error) {
      logger.error('ActiveRotation', 'Failed to fetch', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!rotation || !confirm('순차 반복 송출을 중지하시겠습니까?')) return;

    try {
      setStopping(true);
      const accessToken = localStorage.getItem('access_token');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/broadcast/rotation/${rotation.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to stop rotation');
      }

      logger.success('ActiveRotation', 'Rotation stopped successfully');
      setRotation(null);
      
      if (onRotationStopped) {
        onRotationStopped();
      }
    } catch (error) {
      logger.error('ActiveRotation', 'Failed to stop rotation', { error });
      alert('순차 반복 송출 중지 실패');
    } finally {
      setStopping(false);
    }
  };

  if (loading || !rotation) return null;

  return (
    <Alert className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 shadow-md mb-6">
      <div className="flex items-start gap-3">
        <RotateCw className="w-5 h-5 text-indigo-600 animate-spin" style={{ animationDuration: '3s' }} />
        
        <div className="flex-1">
          <AlertDescription>
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-indigo-600 text-white">
                    순차 반복 송출 중
                  </Badge>
                  <span className="font-semibold text-indigo-900">
                    {rotation.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="text-indigo-700 hover:text-indigo-900"
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        접기
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        상세보기
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleStop}
                    disabled={stopping}
                    className="gap-2"
                  >
                    <StopCircle className="w-4 h-4" />
                    {stopping ? '중지 중...' : '중지'}
                  </Button>
                </div>
              </div>

              {/* Current Status */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="text-gray-600 text-xs">현재 템플릿</div>
                    <div className="font-medium text-indigo-900">
                      {rotation.current_template?.name || '로딩 중...'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="text-gray-600 text-xs">다음 전환까지</div>
                    <div className="font-medium text-indigo-900">
                      {timeRemaining}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="text-gray-600 text-xs">진행 상황</div>
                    <div className="font-medium text-indigo-900">
                      {(rotation.current_index || 0) + 1} / {rotation.template_ids.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expanded && (
                <div className="pt-3 border-t border-indigo-200 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">전환 간격:</span>
                      <span className="ml-2 font-medium">{rotation.duration_per_template}분</span>
                    </div>
                    <div>
                      <span className="text-gray-600">우선순위:</span>
                      <span className="ml-2 font-medium">{rotation.priority}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">시작일:</span>
                      <span className="ml-2 font-medium">
                        {new Date(rotation.start_date).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">종료일:</span>
                      <span className="ml-2 font-medium">
                        {new Date(rotation.end_date).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-600 mb-1">템플릿 목록:</div>
                    <div className="flex flex-wrap gap-1">
                      {rotation.template_ids.map((_, idx) => (
                        <Badge 
                          key={idx}
                          variant={idx === rotation.current_index ? 'default' : 'outline'}
                          className={idx === rotation.current_index ? 'bg-indigo-600' : ''}
                        >
                          #{idx + 1}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}