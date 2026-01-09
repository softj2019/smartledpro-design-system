// ================================================================
// Current Broadcast Status - 현재 송출 상태 표시 (개선 버전)
// ================================================================

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@softj/smartledpro-design-system';
import { Badge } from '@softj/smartledpro-design-system';
import { Button } from '@softj/smartledpro-design-system';
import { 
  Monitor, 
  Zap, 
  XCircle, 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Repeat,
  RotateCw,
  StopCircle,
  FileText,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';
import { logger } from '../../lib/debug-logger';

interface DisplayState {
  id?: string; // display_state의 고유 ID
  template_id: string;
  template_name?: string;
  source: string;
  source_id?: string;
  content_type: string;
  priority: number;
  activated_at: string;
  expires_at?: string;
  is_fallback?: boolean; // ✅ fallback 여부
}

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

interface CurrentBroadcastStatusProps {
  onRotationStopped?: () => void;
  onCurrentTemplateChange?: (templateId: string | null) => void;
}

export function CurrentBroadcastStatus({ onRotationStopped, onCurrentTemplateChange }: CurrentBroadcastStatusProps = {}) {
  const [displayState, setDisplayState] = useState<DisplayState | null>(null);
  const [activeRotation, setActiveRotation] = useState<ActiveRotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false); // ✅ fallback 상태 추적
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // 이전 값을 추적하기 위한 ref
  const prevTemplateIdRef = useRef<string | null>(null);
  const prevRotationIdRef = useRef<string | null>(null);
  const prevRotationIndexRef = useRef<number | null>(null);

  useEffect(() => {
    fetchCurrentDisplay();
    const interval = setInterval(fetchCurrentDisplay, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!displayState?.expires_at) return;

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(displayState.expires_at!);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('만료됨');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}분 ${seconds}초 남음`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [displayState]);

  const fetchCurrentDisplay = async () => {
    try {
      const accessToken = localStorage.getItem('access_token');
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/display/current`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch display');

      const data = await response.json();
      
      if (data.success && data.template) {
        const newTemplateId = data.template.id;
        const previousTemplateId = prevTemplateIdRef.current;
        const hasChanged = newTemplateId !== previousTemplateId;
        
        // 변경 시에만 로깅
        if (hasChanged) {
          logger.info('CurrentBroadcast', 'Template changed', { 
            from: previousTemplateId,
            to: newTemplateId,
            template_name: data.template.name,
            source: data.source
          });
        }
        
        // rotation 정보가 있으면 source를 'rotation'으로 변경
        const actualSource = data.rotation ? 'rotation' : data.source;
        
        setDisplayState({
          id: data.display_state_id,
          template_id: data.template.id,
          template_name: data.template.name,
          source: actualSource,
          source_id: data.source_id,
          content_type: data.content_type || data.template.category?.toUpperCase(),
          priority: data.priority,
          activated_at: data.activated_at,
          expires_at: data.expires_at,
          is_fallback: data.is_fallback // ✅ fallback 여부 설정
        });
        
        // template_id가 변경되었을 때만 콜백 호출
        if (hasChanged && onCurrentTemplateChange) {
          logger.info('CurrentBroadcast', 'Calling onCurrentTemplateChange', { template_id: newTemplateId });
          onCurrentTemplateChange(newTemplateId);
        }
        
        // 이전 템플릿 ID 업데이트
        prevTemplateIdRef.current = newTemplateId;
      } else {
        const wasActive = displayState !== null;
        
        // 상태 변경 시에만 로깅
        if (wasActive) {
          logger.info('CurrentBroadcast', 'Broadcast stopped');
        }
        
        setDisplayState(null);
        
        if (wasActive && onCurrentTemplateChange) {
          onCurrentTemplateChange(null);
        }
      }

      if (data.success && data.rotation) {
        const newRotationId = data.rotation.id;
        const newRotationIndex = data.rotation.current_index;
        const previousRotationId = prevRotationIdRef.current;
        const previousRotationIndex = prevRotationIndexRef.current;
        const rotationChanged = newRotationId !== previousRotationId || newRotationIndex !== previousRotationIndex;
        
        // rotation 변경 시에만 로깅
        if (rotationChanged) {
          logger.info('CurrentBroadcast', 'Rotation changed', { 
            rotation_name: data.rotation.name,
            current_index: newRotationIndex,
            from_index: previousRotationIndex
          });
        }
        
        setActiveRotation({
          id: data.rotation.id,
          name: data.rotation.name,
          template_ids: data.rotation.template_ids,
          current_index: data.rotation.current_index,
          duration_per_template: data.rotation.duration_per_template,
          created_at: data.rotation.created_at,
          start_date: data.rotation.start_date,
          end_date: data.rotation.end_date,
          priority: data.rotation.priority,
          current_template: data.rotation.current_template,
          next_switch_at: data.rotation.next_switch_at,
          time_until_next_ms: data.rotation.time_until_next_ms,
        });
        
        // 이전 rotation ID와 인덱스 업데이트
        prevRotationIdRef.current = newRotationId;
        prevRotationIndexRef.current = newRotationIndex;
      } else {
        const hadRotation = activeRotation !== null;
        
        // rotation 종료 시에만 로깅
        if (hadRotation) {
          logger.info('CurrentBroadcast', 'Rotation stopped');
        }
        
        setActiveRotation(null);
      }
    } catch (error) {
      logger.error('CurrentBroadcast', 'Failed to fetch', { error });
    } finally {
      setLoading(false);
    }
  };

  const stopCurrentBroadcast = async () => {
    if (!displayState) return;
    
    if (!confirm('현재 송출을 중지하시겠습니까?')) return;

    try {
      const accessToken = localStorage.getItem('access_token');
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/broadcast/stop`;
      
      logger.info('CurrentBroadcast', 'Stopping broadcast', { 
        url, 
        hasToken: !!accessToken,
        displayState 
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken || ''}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info('CurrentBroadcast', 'Stop response', { 
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('CurrentBroadcast', 'Stop failed - server response', { 
          status: response.status,
          errorData 
        });
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('CurrentBroadcast', 'Stop successful', { result });

      toast.success('송출이 중지되었습니다');
      fetchCurrentDisplay();
      if (onRotationStopped) onRotationStopped();
    } catch (error) {
      logger.error('CurrentBroadcast', 'Stop failed', { error: error.message, stack: error.stack });
      toast.error(`송출 중지 실패: ${error.message}`);
    }
  };

  const getSourceIcon = (source: string) => {
    if (source === 'instant') return <Zap className="w-4 h-4" />;
    if (source === 'emergency') return <AlertTriangle className="w-4 h-4" />;
    if (source === 'schedule') return <Calendar className="w-4 h-4" />;
    if (source === 'rotation') return <Repeat className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  const getSourceLabel = (source: string) => {
    if (source === 'instant') return '즉시 송출';
    if (source === 'emergency') return '긴급 송출';
    if (source === 'schedule') return '예약 송출';
    if (source === 'rotation') return '순차 반복';
    return '송출 중';
  };

  const getSourceColor = (source: string) => {
    if (source === 'instant') return 'bg-blue-500';
    if (source === 'emergency') return 'bg-red-500';
    if (source === 'schedule') return 'bg-purple-500';
    if (source === 'rotation') return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 1000) return <Badge variant="destructive">긴급 (1000)</Badge>;
    if (priority >= 200) return <Badge className="bg-blue-500">공지 ({priority})</Badge>;
    if (priority >= 100) return <Badge className="bg-green-500">날씨 ({priority})</Badge>;
    return <Badge variant="secondary">Priority {priority}</Badge>;
  };

  if (loading) {
    return (
      <Card className="border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayState) {
    return (
      <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <Monitor className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <div className="font-semibold text-gray-700">송출 중인 콘텐츠가 없습니다</div>
                <div className="text-sm text-gray-500">템플릿을 선택하고 송출 방식을 선택하세요</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCurrentDisplay}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEmergency = displayState.source === 'emergency';
  const borderColor = isEmergency ? 'border-red-400' : 'border-blue-400';
  const bgGradient = isEmergency 
    ? 'from-red-50 to-white' 
    : 'from-blue-50 to-white';

  // ✅ fallback일 때 스타일 변경
  if (displayState.is_fallback) {
    return (
      <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <Monitor className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-gray-600">
                    Fallback
                  </Badge>
                </div>
                <div className="font-semibold text-gray-700">
                  {displayState.template_name || '기본 템플릿'}
                </div>
                <div className="text-sm text-gray-500">
                  실제 송출 콘텐츠가 없어 기본 화면을 표시합니다
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCurrentDisplay}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${borderColor} bg-gradient-to-r ${bgGradient} shadow-lg`}>
      <CardContent className="p-6 space-y-4">
        {/* 송출 정보 헤더 */}
        <div className="flex items-start justify-between gap-6">
          {/* 좌측: 송출 정보 */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* 아이콘 */}
            <div className={`w-14 h-14 ${getSourceColor(displayState.source)} rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
              {getSourceIcon(displayState.source)}
            </div>

            {/* 정보 */}
            <div className="flex-1 space-y-2 min-w-0">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={`${getSourceColor(displayState.source)} text-white whitespace-nowrap`}>
                    {getSourceLabel(displayState.source)}
                  </Badge>
                  {getPriorityBadge(displayState.priority)}
                  {displayState.expires_at && (
                    <div className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {timeRemaining}
                    </div>
                  )}
                </div>
                <div className="font-bold text-xl text-gray-900 break-words">
                  {displayState.template_name || '템플릿 이름 없음'}
                </div>
              </div>

              {/* 상세 정보 */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500">송출 시작</div>
                  <div className="font-medium whitespace-nowrap">
                    {new Date(displayState.activated_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                {displayState.expires_at && (
                  <div>
                    <div className="text-xs text-gray-500">종료 예정</div>
                    <div className="font-medium whitespace-nowrap">
                      {new Date(displayState.expires_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">콘텐츠 유형</div>
                  <div className="font-medium">{displayState.content_type}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 액션 버튼 */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCurrentDisplay}
              className="gap-2 whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </Button>
            {/* ✅ fallback일 때는 중지 버튼 숨김 */}
            {!displayState.is_fallback && (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopCurrentBroadcast}
                className="gap-2 whitespace-nowrap"
              >
                <XCircle className="w-4 h-4" />
                중지
              </Button>
            )}
          </div>
        </div>

        {/* 진행 바 (expires_at이 있을 경우) */}
        {displayState.expires_at && (() => {
          const now = new Date();
          const start = new Date(displayState.activated_at);
          const end = new Date(displayState.expires_at);
          const total = end.getTime() - start.getTime();
          const elapsed = now.getTime() - start.getTime();
          const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));

          return (
            <div className="space-y-1">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getSourceColor(displayState.source)} transition-all duration-1000`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 text-right">
                {progress.toFixed(0)}% 진행
              </div>
            </div>
          );
        })()}

        {/* 순차 반복 정보 (rotation이 있을 경우) */}
        {activeRotation && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500 text-white whitespace-nowrap">
                순차 반복
              </Badge>
              <div className="text-sm text-gray-500">
                {activeRotation.name} ({activeRotation.template_ids.length}개 템플릿)
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500">현재 템플릿</div>
                <div className="font-medium">
                  {activeRotation.current_template?.name || '알 수 없음'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">다음 전환 시간</div>
                <div className="font-medium whitespace-nowrap">
                  {new Date(activeRotation.next_switch_at).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">남은 시간</div>
                <div className="font-medium">
                  {Math.floor(activeRotation.time_until_next_ms / 1000 / 60)}분
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}