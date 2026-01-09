import { useState, useEffect } from 'react';
import { Calendar, Clock, Repeat, Timer } from 'lucide-react';
import { Button } from '@softj/smartledpro-design-system';
import { Input } from '@softj/smartledpro-design-system';
import { Label } from '@softj/smartledpro-design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@softj/smartledpro-design-system';
import { Alert, AlertDescription } from '@softj/smartledpro-design-system';
import { TemplateSelectDrawer } from './TemplateSelectDrawer';
import { DateTimePicker } from './DateTimePicker';
import { TemplatePreview } from '../templates/TemplatePreview';
import type { Schedule, ScheduleFormData, RepeatType, DisplayDurationType } from '../../lib/types/schedule';
import { DAY_NAMES, DISPLAY_DURATION_LABELS } from '../../lib/types/schedule';
import type { MessageTemplate } from '../../lib/hooks/useTemplates';
import { logger } from '../../lib/debug-logger';

interface ScheduleFormProps {
  schedule?: Schedule;
  templates: MessageTemplate[];
  onSubmit: (data: ScheduleFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ScheduleForm({
  schedule,
  templates,
  onSubmit,
  onCancel,
  loading = false,
}: ScheduleFormProps) {
  const [formData, setFormData] = useState<ScheduleFormData>({
    name: schedule?.name || '',
    template_id: schedule?.template_id || '',
    start_datetime: schedule?.start_datetime || '',
    end_datetime: schedule?.end_datetime || '',
    display_duration_type: schedule?.display_duration_type || '5min',
    display_duration_minutes: schedule?.display_duration_minutes,
    repeat_type: schedule?.repeat_type || 'none',
    repeat_config: schedule?.repeat_config || {},
    is_active: schedule?.is_active !== undefined ? schedule.is_active : true,
  });

  const [hasEndTime, setHasEndTime] = useState(!!schedule?.end_datetime);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState(false);

  // Get selected template name
  const getSelectedTemplateName = () => {
    const template = templates.find(t => t.id === formData.template_id);
    return template ? template.name : '템플릿을 선택하세요';
  };

  // Convert ISO datetime to input format (YYYY-MM-DDTHH:mm)
  const toLocalDateTimeString = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Convert input format to ISO datetime
  const toISOString = (localString: string) => {
    if (!localString) return '';
    const date = new Date(localString);
    return date.toISOString();
  };

  useEffect(() => {
    if (schedule) {
      setFormData({
        name: schedule.name,
        template_id: schedule.template_id,
        start_datetime: schedule.start_datetime,
        end_datetime: schedule.end_datetime || '',
        display_duration_type: schedule.display_duration_type || '5min',
        display_duration_minutes: schedule.display_duration_minutes,
        repeat_type: schedule.repeat_type,
        repeat_config: schedule.repeat_config || {},
        is_active: schedule.is_active,
      });
      setHasEndTime(!!schedule.end_datetime);
    }
  }, [schedule]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '스케줄 이름을 입력해주세요.';
    }

    if (!formData.template_id) {
      newErrors.template_id = '템플릿을 선택해주세요.';
    }

    if (!formData.start_datetime) {
      newErrors.start_datetime = '시작 날짜 및 시간을 입력해주세요.';
    }

    if (hasEndTime && formData.end_datetime) {
      const startDate = new Date(formData.start_datetime);
      const endDate = new Date(formData.end_datetime);
      if (endDate <= startDate) {
        newErrors.end_datetime = '종료 시간은 시작 시간 이후여야 합니다.';
      }
    }

    if (formData.repeat_type === 'weekly') {
      const daysSelected = formData.repeat_config?.days_of_week?.length || 0;
      if (daysSelected === 0) {
        newErrors.repeat_config = '최소 1개의 요일을 선택해주세요.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const submitData: ScheduleFormData = {
      ...formData,
      end_datetime: hasEndTime ? formData.end_datetime : undefined,
    };

    await onSubmit(submitData);
  };

  const handleRepeatTypeChange = (type: RepeatType) => {
    setFormData({
      ...formData,
      repeat_type: type,
      repeat_config: type === 'weekly' ? { days_of_week: [] } : {},
    });
  };

  const handleDayToggle = (dayIndex: number) => {
    const currentDays = formData.repeat_config?.days_of_week || [];
    const newDays = currentDays.includes(dayIndex)
      ? currentDays.filter(d => d !== dayIndex)
      : [...currentDays, dayIndex].sort((a, b) => a - b);

    setFormData({
      ...formData,
      repeat_config: { ...formData.repeat_config, days_of_week: newDays },
    });
  };

  // ✅ 시작 날짜 변경 핸들러 - 종료일 자동 설정 (30일 후)
  const handleStartDateTimeChange = (isoString: string) => {
    const startDate = new Date(isoString);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30); // 30일 후
    
    setFormData({ 
      ...formData, 
      start_datetime: isoString,
      end_datetime: hasEndTime ? endDate.toISOString() : formData.end_datetime
    });
    
    logger.info('ScheduleForm', '시작 날짜/시간 변경', {
      startDate: isoString,
      autoEndDate: endDate.toISOString(),
      hasEndTime,
      note: '종료일 체크 시 자동으로 30일 후로 설정'
    });
  };

  // ✅ 종료일 체크박스 변경 핸들러
  const handleEndTimeCheckChange = (checked: boolean) => {
    setHasEndTime(checked);
    
    if (checked && formData.start_datetime) {
      // 체크하면 시작일 + 30일로 자동 설정
      const startDate = new Date(formData.start_datetime);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);
      
      setFormData({ ...formData, end_datetime: endDate.toISOString() });
      
      logger.info('ScheduleForm', '종료일 체크 활성화', {
        autoEndDate: endDate.toISOString(),
        note: '시작일 + 30일로 자동 설정'
      });
    } else {
      // 체크 해제하면 종료일 제거
      setFormData({ ...formData, end_datetime: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 스케줄 이름 */}
          <div>
            <Label htmlFor="name">
              스케줄 이름 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 매일 아침 공원 운영시간"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* 템플릿 선택 */}
          <div>
            <Label htmlFor="template">
              템플릿 선택 <span className="text-red-500">*</span>
            </Label>
            <button
              type="button"
              onClick={() => setIsTemplateDrawerOpen(true)}
              className={`
                w-full flex items-center justify-between px-3 py-2 border rounded-md
                hover:border-blue-500 transition-colors text-left
                ${errors.template_id ? 'border-red-500' : 'border-gray-300'}
              `}
            >
              <span className={formData.template_id ? 'text-gray-900' : 'text-gray-400'}>
                {getSelectedTemplateName()}
              </span>
              <Calendar className="w-5 h-5 text-gray-400" />
            </button>
            {errors.template_id && (
              <p className="text-sm text-red-500 mt-1">{errors.template_id}</p>
            )}

            {/* Selected Template Preview */}
            {formData.template_id && (() => {
              const selectedTemplate = templates.find(t => t.id === formData.template_id);
              if (!selectedTemplate) return null;
              
              const styleConfig = selectedTemplate.style_config || {};
              const backgroundColor = styleConfig.backgroundColor || '#000000';
              
              return (
                <div className="mt-3">
                  <Label className="mb-2 block">선택된 템플릿 미리보기</Label>
                  {/* 430x260 전광판을 축소하여 표시 (scale 0.4 = 172x104) */}
                  <div 
                    className="w-full flex items-center justify-center bg-gray-900 rounded-lg p-4"
                    style={{ height: '140px' }}
                  >
                    <div
                      style={{
                        width: '430px',
                        height: '260px',
                        transform: 'scale(0.4)',
                        transformOrigin: 'center center',
                        backgroundColor: backgroundColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          color: '#FFD400',
                          fontSize: '16px',
                          fontFamily: 'NanumGothic',
                          fontWeight: 700,
                          textAlign: 'center',
                        }}
                        dangerouslySetInnerHTML={{ __html: selectedTemplate.body || selectedTemplate.title }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Template Select Drawer */}
      <TemplateSelectDrawer
        isOpen={isTemplateDrawerOpen}
        onClose={() => setIsTemplateDrawerOpen(false)}
        templates={templates}
        selectedTemplateId={formData.template_id}
        onSelect={(templateId) => setFormData({ ...formData, template_id: templateId })}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            시간 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 시작 날짜/시간 */}
          <DateTimePicker
            value={formData.start_datetime}
            onChange={handleStartDateTimeChange}
            label="시작 날짜 및 시간"
            required
            error={errors.start_datetime}
          />

          {/* 종료 시간 설정 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="has_end_time"
                checked={hasEndTime}
                onChange={(e) => handleEndTimeCheckChange(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="has_end_time">스케줄 종료일 설정</Label>
            </div>
            
            {/* ✅ 수정된 안내 문구 */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-2">
              <p className="text-sm text-blue-800">
                {formData.repeat_type === 'none' 
                  ? '💡 일회성 스케줄은 종료일이 필요하지 않습니다.' 
                  : hasEndTime
                    ? '💡 체크 시 시작일로부터 30일 후로 자동 설정됩니다. 필요시 직접 수정 가능합니다.'
                    : '⚠️ 스케줄 종료일을 설정하지 않으면 무기한 반복됩니다.'}
              </p>
            </div>
            
            {hasEndTime && (
              <>
                <DateTimePicker
                  value={formData.end_datetime || ''}
                  onChange={(isoString) => setFormData({ ...formData, end_datetime: isoString })}
                  label="스케줄 종료 날짜 및 시간"
                  error={errors.end_datetime}
                />
                {formData.repeat_type !== 'none' && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    ⚠️ 이 날짜 이후에는 스케줄이 더 이상 실행되지 않습니다.
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            표시 시간
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>템플릿 표시 시간 <span className="text-red-500">*</span></Label>
            <p className="text-sm text-gray-500 mb-3">전광판에 템플릿이 표시되는 시간을 설정합니다.</p>
            
            {/* 표시 시간 옵션 버튼 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['10sec', '1min', '5min', '10min', 'all-day', 'custom'] as DisplayDurationType[]).map((type) => {
                const isSelected = formData.display_duration_type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ 
                      ...formData, 
                      display_duration_type: type,
                      display_duration_minutes: type === 'custom' ? (formData.display_duration_minutes || 30) : undefined
                    })}
                    className={`
                      px-4 py-3 rounded-md border transition-colors
                      ${isSelected 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    {DISPLAY_DURATION_LABELS[type]}
                  </button>
                );
              })}
            </div>

            {/* 직접입력 필드 */}
            {formData.display_duration_type === 'custom' && (
              <div className="mt-3">
                <Label htmlFor="custom_duration">분 단위 입력</Label>
                <Input
                  id="custom_duration"
                  type="number"
                  min="1"
                  max="1440"
                  value={formData.display_duration_minutes || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    display_duration_minutes: parseInt(e.target.value) || undefined 
                  })}
                  placeholder="예: 30"
                />
                <p className="text-sm text-gray-500 mt-1">1~1440분 (최대 24시간)</p>
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                {formData.display_duration_type === '10sec' && '💡 10초간 표시 후 기본 화면으로 돌아갑니다.'}
                {formData.display_duration_type === '1min' && '💡 1분간 표시 후 기본 화면으로 돌아갑니다.'}
                {formData.display_duration_type === '5min' && '💡 5분간 표시 후 기본 화면으로 돌아갑니다.'}
                {formData.display_duration_type === '10min' && '💡 10분간 표시 후 기본 화면으로 돌아갑니다.'}
                {formData.display_duration_type === 'all-day' && '💡 하루 종일 계속 표시됩니다. (다른 우선순위 높은 콘텐츠로 변경 가능)'}
                {formData.display_duration_type === 'custom' && `💡 ${formData.display_duration_minutes || 30}분간 표시 후 기본 화면으로 돌아갑니다.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            반복 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 반복 타입 */}
          <div className="space-y-2">
            {(['none', 'daily', 'weekly'] as RepeatType[]).map((type) => (
              <div key={type} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`repeat_${type}`}
                  name="repeat_type"
                  value={type}
                  checked={formData.repeat_type === type}
                  onChange={(e) => handleRepeatTypeChange(e.target.value as RepeatType)}
                  className="w-4 h-4"
                />
                <Label htmlFor={`repeat_${type}`}>
                  {type === 'none' && '반복 없음'}
                  {type === 'daily' && '매일'}
                  {type === 'weekly' && '매주'}
                </Label>
              </div>
            ))}
          </div>

          {/* 요일 선택 (매주인 경우) */}
          {formData.repeat_type === 'weekly' && (
            <div>
              <Label>요일 선택 <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DAY_NAMES.map((day, index) => {
                  const isSelected = formData.repeat_config?.days_of_week?.includes(index);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDayToggle(index)}
                      className={`
                        px-4 py-2 rounded-md border transition-colors
                        ${isSelected 
                          ? 'bg-blue-500 text-white border-blue-500' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              {errors.repeat_config && (
                <p className="text-sm text-red-500 mt-1">{errors.repeat_config}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {/* 활성화 상태 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="is_active">생성 후 즉시 활성화</Label>
          </div>
        </CardContent>
      </Card>

      {/* 안내 메시지 */}
      <Alert>
        <AlertDescription>
          💡 팁: 스케줄은 1분 이내에 자동으로 실행됩니다. 활성화된 스케줄은 지정된 시간에 자동으로 템플릿을 전광판으로 송출합니다.
        </AlertDescription>
      </Alert>

      {/* 버튼 */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          취소
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? '저장 중...' : schedule ? '수정' : '생성'}
        </Button>
      </div>
    </form>
  );
}