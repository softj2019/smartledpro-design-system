// ================================================================
// DisplayControl Component - 전광판 위치 및 크기 조정 컨트롤
// ================================================================

import { useState, useEffect } from 'react';
import { Button } from '@softj/smartledpro-design-system';
import { Card } from '@softj/smartledpro-design-system';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Loader2,
  Check,
  History,
  ChevronDown,
  ChevronUp,
  Monitor
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';
import { logger } from '../../lib/debug-logger';

interface DisplayControlProps {
  onClose: () => void;
}

interface SettingsHistory {
  id: string;
  timestamp: string;
  user_email: string;
  user_role: string;
  settings: {
    position: { x: number; y: number };
    scaleX: number;
    scaleY: number;
    showBorder: boolean;
  };
}

export function DisplayControl({ onClose }: DisplayControlProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [showBorder, setShowBorder] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // 저장 상태 추적
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // 초기 로딩 상태
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadedFromDB, setLoadedFromDB] = useState(false);

  // 히스토리 관련 상태
  const [history, setHistory] = useState<SettingsHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 현재 설정 불러오기
  useEffect(() => {
    fetchCurrentSettings();
  }, []);

  const fetchCurrentSettings = async () => {
    try {
      setInitialLoading(true);
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/display/current`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.settings) {
        const settings = data.settings;
        setPosition(settings.position || { x: 0, y: 0 });
        setScaleX(settings.scaleX || 1);
        setScaleY(settings.scaleY || 1);
        setShowBorder(settings.showBorder !== undefined ? settings.showBorder : true);
        
        // DB에서 불러왔는지 확인
        const hasCustomSettings = 
          settings.position?.x !== 0 ||
          settings.position?.y !== 0 ||
          settings.scaleX !== 1 ||
          settings.scaleY !== 1 ||
          settings.showBorder !== true;
        
        setLoadedFromDB(hasCustomSettings);
        
        logger.info('DisplayControl', 'Settings loaded from database', {
          settings,
          isCustom: hasCustomSettings,
        });
      }
    } catch (error) {
      logger.error('DisplayControl', 'Failed to fetch current settings', error);
    } finally {
      setInitialLoading(false);
    }
  };

  // 설정 업데이트
  const updateSettings = async (newPosition?: { x: number; y: number }, newScaleX?: number, newScaleY?: number, newShowBorder?: boolean) => {
    try {
      setLoading(true);
      setSaveStatus('saving');
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/display/settings`;
      const token = localStorage.getItem('access_token');

      const body: any = {};
      if (newPosition !== undefined) body.position = newPosition;
      if (newScaleX !== undefined) body.scaleX = newScaleX;
      if (newScaleY !== undefined) body.scaleY = newScaleY;
      if (newShowBorder !== undefined) body.showBorder = newShowBorder;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      logger.info('DisplayControl', 'Settings updated', data.settings);
      setSaveStatus('saved');
      setLastSaved(new Date());
      
      // 2초 후 saved 상태 초기화
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      logger.error('DisplayControl', 'Failed to update settings', error);
      setSaveStatus('idle');
      toast.error('설정 업데이트 실패', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  // 위치 이동 (즉시 저장)
  const movePosition = async (dx: number, dy: number) => {
    const newPosition = {
      x: position.x + dx,
      y: position.y + dy,
    };
    setPosition(newPosition);
    await updateSettings(newPosition, undefined, undefined);
  };

  // 비율 유지 크기 조정 (즉시 저장) - 0.01 단위
  const changeScaleProportional = async (delta: number) => {
    const newScaleX = Math.max(0.5, Math.min(2, scaleX + delta));
    const newScaleY = Math.max(0.5, Math.min(2, scaleY + delta));
    setScaleX(newScaleX);
    setScaleY(newScaleY);
    await updateSettings(undefined, newScaleX, newScaleY);
  };

  // 크기 조정 (즉시 저장) - 0.01 단위
  const changeScaleX = async (delta: number) => {
    const newScaleX = Math.max(0.5, Math.min(2, scaleX + delta));
    setScaleX(newScaleX);
    await updateSettings(undefined, newScaleX, undefined);
  };

  const changeScaleY = async (delta: number) => {
    const newScaleY = Math.max(0.5, Math.min(2, scaleY + delta));
    setScaleY(newScaleY);
    await updateSettings(undefined, undefined, newScaleY);
  };

  // 직접 입력으로 크기 조정
  const handleScaleXInput = async (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0.5 && numValue <= 2) {
      setScaleX(numValue);
      await updateSettings(undefined, numValue, undefined);
    }
  };

  const handleScaleYInput = async (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0.5 && numValue <= 2) {
      setScaleY(numValue);
      await updateSettings(undefined, undefined, numValue);
    }
  };

  // 리셋 (즉시 저장)
  const resetSettings = async () => {
    setPosition({ x: 0, y: 0 });
    setScaleX(1);
    setScaleY(1);
    await updateSettings({ x: 0, y: 0 }, 1, 1);
  };

  // 테두리 표시 토글 (즉시 저장)
  const toggleBorder = async () => {
    const newShowBorder = !showBorder;
    setShowBorder(newShowBorder);
    await updateSettings(undefined, undefined, undefined, newShowBorder);
  };

  // 현재 픽셀 크기 계산
  const currentWidthPx = Math.round(430 * scaleX);
  const currentHeightPx = Math.round(260 * scaleY);

  // 저장 버튼 핸들러
  const handleSave = async () => {
    await updateSettings(position, scaleX, scaleY);
    onClose();
  };

  // 취소 버튼 핸들러
  const handleCancel = () => {
    onClose();
  };

  // 변경 사항 확인
  const hasChanges = 
    position.x !== 0 ||
    position.y !== 0 ||
    scaleX !== 1 ||
    scaleY !== 1;

  // 히스토리 불러오기
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/display/settings/history`;
      const token = localStorage.getItem('access_token');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.success && data.history) {
        setHistory(data.history);
        logger.info('DisplayControl', 'History loaded', {
          count: data.history.length,
        });
      }
    } catch (error) {
      logger.error('DisplayControl', 'Failed to fetch history', error);
      toast.error('히스토리 불러오기 실패');
    } finally {
      setHistoryLoading(false);
    }
  };

  // 히스토리 토글
  const toggleHistory = () => {
    if (!showHistory) {
      fetchHistory();
    }
    setShowHistory(!showHistory);
  };

  // 히스토리 설정 적용
  const applyHistorySettings = async (historyEntry: SettingsHistory) => {
    const settings = historyEntry.settings;
    setPosition(settings.position);
    setScaleX(settings.scaleX);
    setScaleY(settings.scaleY);
    setShowBorder(settings.showBorder);
    
    await updateSettings(
      settings.position,
      settings.scaleX,
      settings.scaleY,
      settings.showBorder
    );
    
    toast.success('설정이 적용되었습니다');
    logger.info('DisplayControl', 'Applied history settings', {
      historyId: historyEntry.id,
      settings,
    });
  };

  // 프리셋 정의
  const VIEW_PRESETS = [
    {
      id: 'large',
      name: '대형 (430×260)',
      description: '원본 크기, 좌측 50px 여백',
      width: 430,
      height: 260,
      position: { x: 50, y: 0 },
      scaleX: 1,
      scaleY: 1,
    },
    {
      id: 'medium',
      name: '중형 (370×210)',
      description: '축소 크기, 좌측 50px 여백',
      width: 370,
      height: 210,
      position: { x: 50, y: 0 },
      scaleX: 370 / 430,
      scaleY: 210 / 260,
    },
    {
      id: 'compact',
      name: '소형 (200×150)',
      description: '컴팩트 크기, 좌측 50px 여백',
      width: 200,
      height: 150,
      position: { x: 50, y: 0 },
      scaleX: 200 / 430,
      scaleY: 150 / 260,
    },
    {
      id: 'small',
      name: '최소 (180×130)',
      description: '최소 크기, 좌측 50px 여백',
      width: 180,
      height: 130,
      position: { x: 50, y: 0 },
      scaleX: 180 / 430,
      scaleY: 130 / 260,
    },
  ];

  // 프리셋 적용
  const applyPreset = async (preset: typeof VIEW_PRESETS[0]) => {
    setPosition(preset.position);
    setScaleX(preset.scaleX);
    setScaleY(preset.scaleY);
    
    await updateSettings(
      preset.position,
      preset.scaleX,
      preset.scaleY
    );
    
    toast.success(`${preset.name} 프리셋이 적용되었습니다`);
    logger.info('DisplayControl', 'Applied preset', {
      presetId: preset.id,
      preset,
    });
  };

  // 현재 프리셋 확인
  const getCurrentPreset = () => {
    for (const preset of VIEW_PRESETS) {
      const posMatch = 
        Math.abs(position.x - preset.position.x) < 1 &&
        Math.abs(position.y - preset.position.y) < 1;
      const scaleMatch =
        Math.abs(scaleX - preset.scaleX) < 0.01 &&
        Math.abs(scaleY - preset.scaleY) < 0.01;
      
      if (posMatch && scaleMatch) {
        return preset.id;
      }
    }
    return null;
  };

  const currentPreset = getCurrentPreset();

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <Card
        className="p-6 space-y-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">전광판 위치 및 크기 조정</h3>
            <p className="text-sm text-gray-600 mt-1">
              전광판의 표시 영역을 조정합니다.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 현재 설정 표시 */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">실시간 동기화</span>
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>저장 중...</span>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  <span>저장 완료</span>
                </div>
              )}
              {saveStatus === 'idle' && lastSaved && (
                <span className="text-xs text-gray-400">
                  {lastSaved.toLocaleTimeString('ko-KR')}
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">위치 (X, Y):</span>
            <span className="font-mono font-medium">
              ({position.x}, {position.y})
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">가로 크기:</span>
            <span className="font-mono font-medium">{(scaleX * 100).toFixed(0)}% ({currentWidthPx}px)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">세로 크기:</span>
            <span className="font-mono font-medium">{(scaleY * 100).toFixed(0)}% ({currentHeightPx}px)</span>
          </div>
        </div>

        {/* 위치 조정 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">위치 조정</h4>
          <div className="grid grid-cols-3 gap-2">
            <div></div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => movePosition(0, -10)}
              disabled={loading}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <div></div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => movePosition(-10, 0)}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetSettings}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => movePosition(10, 0)}
              disabled={loading}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            
            <div></div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => movePosition(0, 10)}
              disabled={loading}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <div></div>
          </div>
        </div>

        {/* 크기 조정 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">크기 조정</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => changeScaleProportional(-0.01)}
              disabled={loading || scaleX <= 0.5}
            >
              <ZoomOut className="h-4 w-4 mr-2" />
              축소 (비율 유지)
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => changeScaleProportional(0.01)}
              disabled={loading || scaleX >= 2}
            >
              <ZoomIn className="h-4 w-4 mr-2" />
              확대 (비율 유지)
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => changeScaleX(-0.01)}
              disabled={loading || scaleX <= 0.5}
            >
              <ZoomOut className="h-4 w-4 mr-2" />
              축소 (X)
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => changeScaleX(0.01)}
              disabled={loading || scaleX >= 2}
            >
              <ZoomIn className="h-4 w-4 mr-2" />
              확대 (X)
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => changeScaleY(-0.01)}
              disabled={loading || scaleY <= 0.5}
            >
              <ZoomOut className="h-4 w-4 mr-2" />
              축소 (Y)
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => changeScaleY(0.01)}
              disabled={loading || scaleY >= 2}
            >
              <ZoomIn className="h-4 w-4 mr-2" />
              확대 (Y)
            </Button>
          </div>
          
          {/* 직접 입력 필드 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-16">가로:</label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="2"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                value={scaleX.toFixed(2)}
                onChange={(e) => handleScaleXInput(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-16">세로:</label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="2"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                value={scaleY.toFixed(2)}
                onChange={(e) => handleScaleYInput(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* 테두리 표시 설정 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">테두리 표시</h4>
          <Button
            variant={showBorder ? "default" : "outline"}
            className="w-full"
            onClick={toggleBorder}
            disabled={loading}
          >
            {showBorder ? '테두리 표시 중 (클릭하여 숨김)' : '테두리 숨김 (클릭하여 표시)'}
          </Button>
          <p className="text-xs text-gray-500">
            {showBorder 
              ? '빨간 테두리가 전광판에 표시됩니다 (측정용)' 
              : '테두리가 숨겨져 실제 송출 화면만 표시됩니다'
            }
          </p>
        </div>

        {/* 히스토리 섹션 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">설정 변경 이력</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleHistory}
              disabled={historyLoading}
            >
              {historyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : showHistory ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {showHistory && (
            <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3 bg-white">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  변경 이력이 없습니다.
                </p>
              ) : (
                history.map((entry, index) => {
                  const isCurrentSettings = 
                    entry.settings.position.x === position.x &&
                    entry.settings.position.y === position.y &&
                    entry.settings.scaleX === scaleX &&
                    entry.settings.scaleY === scaleY &&
                    entry.settings.showBorder === showBorder;

                  return (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-md border ${
                        isCurrentSettings 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="space-y-1.5">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">
                            #{history.length - index}
                            {isCurrentSettings && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                현재 설정
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* 사용자 정보 */}
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">{entry.user_email}</span>
                          <span className="mx-1">·</span>
                          <span className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">
                            {entry.user_role}
                          </span>
                        </div>

                        {/* 설정 상세 */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">위치:</span>
                            <span className="ml-1 font-mono">
                              ({entry.settings.position.x}, {entry.settings.position.y})
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">크기:</span>
                            <span className="ml-1 font-mono">
                              {(entry.settings.scaleX * 100).toFixed(0)}% × {(entry.settings.scaleY * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* 적용 버튼 */}
                        {!isCurrentSettings && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => applyHistorySettings(entry)}
                            disabled={loading}
                          >
                            이 설정 적용
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 프리셋 섹션 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">프리셋 설정</h4>
          <p className="text-xs text-gray-500">사전 정의된 크기로 빠르게 변경할 수 있습니다</p>
          <div className="space-y-2">
            {VIEW_PRESETS.map(preset => (
              <button
                key={preset.id}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  currentPreset === preset.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => applyPreset(preset)}
                disabled={loading}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-sm">{preset.name}</span>
                      {currentPreset === preset.id && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                          적용 중
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{preset.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                      <span className="font-mono">{preset.width}×{preset.height}</span>
                      <span>·</span>
                      <span>위치: ({preset.position.x}, {preset.position.y})</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}