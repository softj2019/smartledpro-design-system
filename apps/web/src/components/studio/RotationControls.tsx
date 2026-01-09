// ================================================================
// Rotation Controls - 순차 반복 송출 컨트롤
// ================================================================

import { useState, useEffect } from 'react';
import { Repeat, Plus, X, Calendar, Clock, AlertCircle, MoveUp, MoveDown, PlayCircle } from 'lucide-react';
import { Button } from '@softj/smartledpro-design-system';
import { Badge } from '@softj/smartledpro-design-system';
import { Label } from '@softj/smartledpro-design-system';
import { Input } from '@softj/smartledpro-design-system';
import { Alert, AlertDescription } from '@softj/smartledpro-design-system';
import { toast } from 'sonner';
import { projectId } from '../../utils/supabase/info';
import { logger } from '../../lib/debug-logger';

interface Template {
  id: string;
  name: string;
  category: string;
}

interface RotationControlsProps {
  selectedTemplate: Template | null;
  allTemplates: Template[];
  onBroadcastSuccess: () => void;
}

export function RotationControls({ selectedTemplate, allTemplates, onBroadcastSuccess }: RotationControlsProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([]);
  const [rotationName, setRotationName] = useState('');
  const [isCreating, setIsCreating] = useState(false); // ✅ 중복 요청 방지
  const [durationPerTemplate, setDurationPerTemplate] = useState(5); // 단위: 분
  
  // ✅ 방어적 코딩: allTemplates가 배열인지 확인
  const safeAllTemplates = Array.isArray(allTemplates) ? allTemplates : [];
  
  // ✅ 기본값 설정: 시작 날짜는 오늘, 종료 날짜는 1년 후
  const getToday = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const getDateAfter = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };
  
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getDateAfter(365)); // 1년 후

  const addTemplate = (template: Template) => {
    if (selectedTemplates.find(t => t.id === template.id)) {
      toast.error('이미 추가된 템플릿입니다');
      return;
    }

    if (selectedTemplates.length >= 10) {
      toast.error('최대 10개까지 추가할 수 있습니다');
      return;
    }

    setSelectedTemplates([...selectedTemplates, template]);
  };

  const removeTemplate = (templateId: string) => {
    setSelectedTemplates(selectedTemplates.filter(t => t.id !== templateId));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newTemplates = [...selectedTemplates];
    [newTemplates[index - 1], newTemplates[index]] = [newTemplates[index], newTemplates[index - 1]];
    setSelectedTemplates(newTemplates);
  };

  const moveDown = (index: number) => {
    if (index === selectedTemplates.length - 1) return;
    const newTemplates = [...selectedTemplates];
    [newTemplates[index], newTemplates[index + 1]] = [newTemplates[index + 1], newTemplates[index]];
    setSelectedTemplates(newTemplates);
  };

  // ✅ 빠른 날짜 설정 함수
  const setQuickDateRange = (days: number) => {
    const today = getToday();
    const endDay = getDateAfter(days);
    setStartDate(today);
    setEndDate(endDay);
    
    const label = days === 7 ? '1주일' : days === 30 ? '1개월' : '1년';
    toast.success(`기간 설정: ${label} (${today} ~ ${endDay})`);
  };

  const handleCreateRotation = async () => {
    logger.info('Rotation', '순차 반복 송출 생성 시작', {
      name: rotationName,
      template_count: selectedTemplates.length,
      duration: durationPerTemplate,
      start_date: startDate,
      end_date: endDate,
    });

    if (!rotationName.trim()) {
      logger.warn('Rotation', '이름이 입력되지 않음');
      toast.error('순차 반복 이름을 입력해주세요');
      return;
    }

    if (selectedTemplates.length < 2) {
      logger.warn('Rotation', '템플릿 수 부족', { count: selectedTemplates.length });
      toast.error('최소 2개의 템플릿을 선택해주세요');
      return;
    }

    if (!startDate) {
      logger.warn('Rotation', '시작 날짜가 입력되지 않음');
      toast.error('시작 날짜를 입력해주세요');
      return;
    }

    if (!endDate) {
      logger.warn('Rotation', '종료 날짜가 입력되지 않음');
      toast.error('종료 날짜를 입력해주세요');
      return;
    }

    setIsCreating(true);
    try {
      // Get access token from localStorage
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        logger.error('Rotation', '인증 토큰이 없음');
        toast.error('인증 토큰이 없습니다. 다시 로그인해주세요.');
        setIsCreating(false);
        return;
      }

      const payload = {
        name: rotationName,
        template_ids: selectedTemplates.map(t => t.id),
        duration_per_template: durationPerTemplate,
        start_date: startDate,
        end_date: endDate,
        priority: 50, // 기본 우선순위
      };

      logger.info('Rotation', 'API 요청 전송 중', { payload });

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/broadcast/rotation`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      logger.info('Rotation', 'API 응답 수신', { 
        ok: response.ok,
        status: response.status,
        data 
      });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create rotation');
      }

      logger.success('Rotation', '순차 반복 송출 생성 성공', { 
        rotation_id: data.rotation?.id,
        rotation_name: data.rotation?.name
      });

      toast.success('순차 반복 송출이 생성되었습니다!');
      
      // 폼 초기화
      logger.info('Rotation', '폼 초기화 중');
      setRotationName('');
      setSelectedTemplates([]);
      setStartDate(getToday());
      setEndDate(getDateAfter(365));
      
      onBroadcastSuccess();
    } catch (error) {
      logger.error('Rotation', '순차 반복 생성 실패', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error(error instanceof Error ? error.message : '순차 반복 생성 실패');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center gap-2">
        <Repeat className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold">순차 반복 송출</h3>
      </div>
      <p className="text-sm text-gray-600">
        여러 템플릿을 순차적으로 반복 표시합니다 (우선순위: 50 - 가장 낮음)
      </p>

      {/* 이름 */}
      <div className="space-y-2">
        <Label htmlFor="rotation-name">순차 반복 이름 *</Label>
        <Input
          id="rotation-name"
          placeholder="예: 24시간 순환 공지"
          value={rotationName}
          onChange={(e) => setRotationName(e.target.value)}
          disabled={isCreating}
        />
      </div>

      {/* 템플릿 선택 목록 */}
      <div className="space-y-2">
        <Label>선택 가능한 템플릿</Label>
        <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
          {safeAllTemplates.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">템플릿이 없습니다</div>
          ) : (
            safeAllTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => addTemplate(template)}
                disabled={isCreating}
                className="w-full text-left px-3 py-2 text-sm border rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span>{template.name}</span>
                  <Plus className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 선택된 템플릿 순서 */}
      <div className="space-y-2">
        <Label>
          송출 순서 ({selectedTemplates.length}개)
          {selectedTemplates.length > 0 && <span className="text-red-500"> *최소 2개</span>}
        </Label>
        <div className="border rounded p-2 space-y-2 min-h-[100px]">
          {selectedTemplates.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              위 목록에서 템플릿을 선택하세요
            </div>
          ) : (
            selectedTemplates.map((template, index) => (
              <div
                key={template.id}
                className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded"
              >
                <Badge variant="outline" className="text-xs">
                  {index + 1}
                </Badge>
                <span className="flex-1 text-sm font-medium">{template.name}</span>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0 || isCreating}
                    className="p-1 rounded hover:bg-green-100 disabled:opacity-30"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === selectedTemplates.length - 1 || isCreating}
                    className="p-1 rounded hover:bg-green-100 disabled:opacity-30"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeTemplate(template.id)}
                    disabled={isCreating}
                    className="p-1 rounded hover:bg-red-100 disabled:opacity-30"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {selectedTemplates.length > 0 && (
          <p className="text-xs text-gray-500">
            순서: {selectedTemplates.map((t, i) => `${i + 1}.${t.name}`).join(' → ')} → 반복
          </p>
        )}
      </div>

      {/* 각 템플릿 표시 시간 */}
      <div className="space-y-2">
        <Label htmlFor="duration-per-template">각 템플릿 표시 시간</Label>
        <select
          id="duration-per-template"
          value={durationPerTemplate}
          onChange={(e) => setDurationPerTemplate(parseFloat(e.target.value))}
          disabled={isCreating}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={0.0833}>5초</option>
          <option value={0.1667}>10초</option>
          <option value={0.5}>30초</option>
          <option value={1}>1분</option>
          <option value={3}>3분</option>
          <option value={5}>5분</option>
          <option value={10}>10분</option>
          <option value={30}>30분</option>
          <option value={60}>60분</option>
        </select>
        <p className="text-xs text-gray-500">
          {durationPerTemplate < 1 
            ? `${Math.round(durationPerTemplate * 60)}초씩 표시`
            : `${durationPerTemplate}분씩 표시`
          } (전체 순환: {
            selectedTemplates.length * durationPerTemplate < 1
              ? `${Math.round(selectedTemplates.length * durationPerTemplate * 60)}초`
              : `${selectedTemplates.length * durationPerTemplate}분`
          })
        </p>
      </div>

      {/* 시작/종료 날짜 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="rotation-start-date">시작 날짜 *</Label>
          <Input
            id="rotation-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isCreating}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rotation-end-date">종료 날짜 *</Label>
          <Input
            id="rotation-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isCreating}
          />
        </div>
      </div>

      {/* 빠른 날짜 설정 버튼 */}
      <div className="space-y-2">
        <Label>빠른 날짜 설정</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => setQuickDateRange(7)}
            disabled={isCreating}
            variant="outline"
            size="sm"
            className="flex-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
          >
            📅 1주일
          </Button>
          <Button
            type="button"
            onClick={() => setQuickDateRange(30)}
            disabled={isCreating}
            variant="outline"
            size="sm"
            className="flex-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300"
          >
            📅 1개월
          </Button>
          <Button
            type="button"
            onClick={() => setQuickDateRange(365)}
            disabled={isCreating}
            variant="outline"
            size="sm"
            className="flex-1 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300"
          >
            📅 1년
          </Button>
        </div>
      </div>

      {/* 안내 */}
      {selectedTemplates.length >= 2 && (
        <Alert className="bg-green-50 border-green-200">
          <PlayCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-xs text-green-800">
            {selectedTemplates.map((t, i) => t.name.substring(0, 10)).join(' → ')} → 반복<br />
            각 {durationPerTemplate < 1 ? `${Math.round(durationPerTemplate * 60)}초` : `${durationPerTemplate}분`}씩 표시 | 
            전체 순환: {selectedTemplates.length * durationPerTemplate < 1 ? `${Math.round(selectedTemplates.length * durationPerTemplate * 60)}초` : `${selectedTemplates.length * durationPerTemplate}분`}
          </AlertDescription>
        </Alert>
      )}

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 space-y-1">
        <p><strong>⚠️ 순차 반복 송출 특징:</strong></p>
        <ul className="ml-4 space-y-1">
          <li>• <strong>우선순위 50</strong>: 가장 낮음 (다른 스케줄보다 우선순위 낮음)</li>
          <li>• <strong>자동 중단/재개</strong>: 예약 스케줄 시작 시 자동 중단, 종료 시 자동 재개</li>
          <li>• <strong>24시간 운영</strong>: 백그라운드에서 계속 실행</li>
          <li>• <strong>순차 반복</strong>: 선택한 순서대로 계속 반복</li>
        </ul>
      </div>

      <Button
        onClick={handleCreateRotation}
        disabled={selectedTemplates.length < 2 || isCreating}
        className="w-full"
        size="lg"
      >
        {isCreating ? '생성 중...' : '순차 반복 시작'}
      </Button>
    </div>
  );
}