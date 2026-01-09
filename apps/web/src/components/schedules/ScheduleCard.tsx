import { Calendar, Clock, Repeat, Circle, CheckCircle2, XCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@softj/smartledpro-design-system';
import { Badge } from '@softj/smartledpro-design-system';
import { Button } from '@softj/smartledpro-design-system';
import type { Schedule } from '../../lib/types/schedule';
import { DAY_NAMES, REPEAT_TYPE_LABELS } from '../../lib/types/schedule';

interface ScheduleCardProps {
  schedule: Schedule;
  templateName?: string;
  onToggle: (schedule: Schedule) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
  canEdit: boolean;
}

export function ScheduleCard({
  schedule,
  templateName,
  onToggle,
  onEdit,
  onDelete,
  canEdit,
}: ScheduleCardProps) {
  // ✅ UTC 시간을 한국 시간(KST)으로 변환하여 표시
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Seoul', // ✅ 한국 시간대
    }).format(date);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Seoul', // ✅ 한국 시간대
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Seoul', // ✅ 한국 시간대
    }).format(date);
  };

  const getRepeatText = () => {
    if (schedule.repeat_type === 'none') {
      return '반복 없음';
    }
    
    if (schedule.repeat_type === 'daily') {
      return '매일';
    }
    
    if (schedule.repeat_type === 'weekly' && schedule.repeat_config?.days_of_week) {
      const days = schedule.repeat_config.days_of_week
        .sort((a, b) => a - b)
        .map(d => DAY_NAMES[d])
        .join(', ');
      return `매주 (${days})`;
    }
    
    return REPEAT_TYPE_LABELS[schedule.repeat_type] || schedule.repeat_type;
  };

  const getStatusBadge = () => {
    if (schedule.is_active) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          활성
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary">
        <Circle className="w-3 h-3 mr-1" />
        비활성
      </Badge>
    );
  };

  const getLastExecutionStatus = () => {
    if (!schedule.last_executed_at) {
      return (
        <span className="text-sm text-gray-500">
          실행 이력 없음
        </span>
      );
    }
    
    return (
      <span className="text-sm text-gray-600">
        마지막 실행: {formatDateTime(schedule.last_executed_at)}
      </span>
    );
  };

  return (
    <Card className={`${schedule.is_active ? 'border-green-500 border-2' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg">{schedule.name}</h3>
                {/* 실행 시간 뱃지 */}
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(schedule.start_datetime)}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                템플릿: {templateName || schedule.template_id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggle(schedule)}
                className="h-8 px-3"
              >
                {schedule.is_active ? '비활성화' : '활성화'}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              시작일: {formatDate(schedule.start_datetime)}
            </span>
          </div>
          
          {schedule.end_datetime && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                종료일: {formatDate(schedule.end_datetime)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Repeat className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              {getRepeatText()}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {getLastExecutionStatus()}
          </div>
          
          {canEdit && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(schedule)}
                className="h-8"
              >
                <Edit className="w-4 h-4 mr-1" />
                수정
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(schedule)}
                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                삭제
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}