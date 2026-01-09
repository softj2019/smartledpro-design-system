// ================================================================
// Debug Panel - 시스템 상태 확인 및 강제 초기화
// ================================================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@softj/smartledpro-design-system";
import { Button } from "@softj/smartledpro-design-system";
import { Badge } from "@softj/smartledpro-design-system";
import { 
  RefreshCw, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Layers
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
import { logger } from '../lib/debug-logger';

interface DebugState {
  display_current_state: any;
  active_rotations: any[];
  active_schedules: any[];
  timestamp: string;
}

export default function DebugPanel() {
  const [state, setState] = useState<DebugState | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchDebugState = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/debug/display-state`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();
      setState(result);
      
      logger.info('DebugPanel', 'State fetched', {
        has_display: !!result.display_current_state,
        rotations_count: result.active_rotations?.length || 0,
        schedules_count: result.active_schedules?.length || 0,
      });
    } catch (error) {
      logger.error('DebugPanel', 'Failed to fetch state', { error });
      toast.error('상태 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  const resetDisplay = async () => {
    if (!confirm('⚠️ Display Current State를 완전히 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setResetting(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/debug/reset-display`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken || ''}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast.success('Display 초기화 완료');
        fetchDebugState();
      } else {
        throw new Error(result.error || 'Reset failed');
      }
    } catch (error) {
      toast.error('초기화 실패');
      logger.error('DebugPanel', 'Reset failed', { error });
    } finally {
      setResetting(false);
    }
  };

  const deleteMatchSchedule = async () => {
    if (!confirm('⚠️ "[자동] 오늘의 경기 일정" 스케줄을 삭제하시겠습니까?\n\n크롤러 재실행 시 다시 생성되지 않습니다.')) {
      return;
    }

    try {
      const accessToken = localStorage.getItem('access_token');
      
      // 먼저 스케줄 목록 조회
      const listResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/schedules`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken || ''}`,
          },
        }
      );

      const schedules = await listResponse.json();
      const matchSchedule = schedules.schedules?.find((s: any) => 
        s.name === '[자동] 오늘의 경기 일정'
      );

      if (!matchSchedule) {
        toast.info('삭제할 경기 일정 스케줄이 없습니다');
        return;
      }

      // 삭제
      const deleteResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/schedules/${matchSchedule.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken || ''}`,
          },
        }
      );

      if (!deleteResponse.ok) {
        throw new Error('Delete failed');
      }

      toast.success('경기 일정 스케줄 삭제 완료');
      fetchDebugState();
    } catch (error) {
      toast.error('삭제 실패');
      logger.error('DebugPanel', 'Delete match schedule failed', { error });
    }
  };

  const deleteSchedule = async (scheduleId: string, scheduleName: string) => {
    if (!confirm(`스케줄 "${scheduleName}"을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/schedules/${scheduleId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      toast.success('스케줄 삭제됨');
      fetchDebugState();
    } catch (error) {
      toast.error('삭제 실패');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">🔧 시스템 디버그 패널</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Display State, Rotation, Schedule 상태 확인 및 초기화
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchDebugState}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? '조회 중...' : '상태 조회'}
              </Button>
              <Button
                onClick={deleteMatchSchedule}
                variant="outline"
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                경기일정 삭제
              </Button>
              <Button
                onClick={resetDisplay}
                disabled={resetting}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {resetting ? '초기화 중...' : 'Display 초기화'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!state && (
            <div className="text-center py-12 text-gray-500">
              "상태 조회" 버튼을 클릭하여 시스템 상태를 확인하세요
            </div>
          )}

          {state && (
            <>
              {/* Display Current State */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Display Current State
                </h3>
                
                {state.display_current_state ? (
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-green-900">송출 중</span>
                            <Badge className="bg-blue-500">
                              {state.display_current_state.source}
                            </Badge>
                            {state.display_current_state.priority && (
                              <Badge variant="outline">
                                Priority: {state.display_current_state.priority}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-gray-600">Template ID:</span>{' '}
                              <code className="bg-white px-2 py-0.5 rounded text-xs">
                                {state.display_current_state.template_id}
                              </code>
                            </div>
                            <div>
                              <span className="text-gray-600">Activated:</span>{' '}
                              {new Date(state.display_current_state.activated_at).toLocaleString('ko-KR')}
                            </div>
                            {state.display_current_state.expires_at && (
                              <div>
                                <span className="text-gray-600">Expires:</span>{' '}
                                {new Date(state.display_current_state.expires_at).toLocaleString('ko-KR')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-2 border-gray-200 bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <XCircle className="w-5 h-5" />
                        <span>송출 중인 콘텐츠가 없습니다</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Active Rotations */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Active Rotations ({state.active_rotations.length})
                </h3>
                
                {state.active_rotations.length > 0 ? (
                  <div className="space-y-2">
                    {state.active_rotations.map((rotation: any) => (
                      <Card key={rotation.id} className="border-2 border-blue-200 bg-blue-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{rotation.name}</div>
                              <div className="text-sm text-gray-600">
                                {rotation.template_ids?.length || 0}개 템플릿 • 
                                Priority: {rotation.priority} • 
                                Current Index: {rotation.current_index}
                              </div>
                            </div>
                            <Badge className="bg-green-500">Active</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-2 border-gray-200 bg-gray-50">
                    <CardContent className="p-4">
                      <div className="text-gray-600">활성 Rotation이 없습니다</div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Active Schedules */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Active Schedules ({state.active_schedules.length})
                </h3>
                
                {state.active_schedules.length > 0 ? (
                  <div className="space-y-2">
                    {state.active_schedules.map((schedule: any) => (
                      <Card key={schedule.id} className="border-2 border-purple-200 bg-purple-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="font-medium">{schedule.name}</div>
                              <div className="text-sm text-gray-600 space-y-0.5">
                                <div>Priority: {schedule.priority}</div>
                                <div>Duration: {schedule.display_duration_type}</div>
                                <div>
                                  기간: {new Date(schedule.start_date).toLocaleDateString('ko-KR')} ~ {new Date(schedule.end_date).toLocaleDateString('ko-KR')}
                                </div>
                                {schedule.template_id && (
                                  <div>
                                    Template ID: <code className="bg-white px-1 text-xs">{schedule.template_id}</code>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Badge className="bg-green-500">Active</Badge>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteSchedule(schedule.id, schedule.name)}
                                className="gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                삭제
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-2 border-gray-200 bg-gray-50">
                    <CardContent className="p-4">
                      <div className="text-gray-600">활성 Schedule이 없습니다</div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Timestamp */}
              <div className="text-xs text-gray-500 text-right">
                조회 시간: {new Date(state.timestamp).toLocaleString('ko-KR')}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 경고 메시지 */}
      <Card className="mt-6 border-2 border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-900">
              <div className="font-semibold mb-1">⚠️ 주의사항</div>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>"Display 초기화"</strong>는 현재 송출 중인 모든 콘텐츠를 중지합니다</li>
                <li>Rotation이나 Schedule은 삭제하지 않으며, display_current_state만 초기화합니다</li>
                <li>초기화 후에는 Schedule이나 Rotation이 다시 자동으로 실행될 수 있습니다</li>
                <li>완전히 깨끗한 상태로 테스트하려면 활성 Schedule과 Rotation을 모두 삭제하세요</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}