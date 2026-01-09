// ================================================================
// Rotation Card - 순차 반복 카드 컴포넌트
// ================================================================

import { Repeat, Trash2, Calendar, Clock, ListOrdered } from 'lucide-react';
import { Badge } from '@softj/smartledpro-design-system';
import { Button } from '@softj/smartledpro-design-system';
import { Switch } from '@softj/smartledpro-design-system';
import { Checkbox } from '@softj/smartledpro-design-system';
import type { Rotation } from '../../lib/types/rotation';

interface RotationCardProps {
  rotation: Rotation;
  onToggle: (rotation: Rotation) => void;
  onDelete: (rotation: Rotation) => void;
  canEdit: boolean;
  isSelected?: boolean;
  onSelect?: (rotation: Rotation, selected: boolean) => void;
}

export function RotationCard({ rotation, onToggle, onDelete, canEdit, isSelected, onSelect }: RotationCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // ✅ duration_per_template는 초 단위로 저장되어 있음
  const getDurationText = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}초`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}분`;
    }
    return `${minutes}분 ${remainingSeconds}초`;
  };

  const getTotalDuration = () => {
    const totalSeconds = rotation.template_ids.length * rotation.duration_per_template;
    return getDurationText(totalSeconds);
  };

  return (
    <div className={`border rounded-lg p-6 transition-all ${
      rotation.is_active ? 'bg-green-50 border-green-200' : 'bg-white'
    }`}>
      <div className="flex items-start justify-between">
        {/* 왼쪽: 정보 */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Repeat className={`w-5 h-5 ${rotation.is_active ? 'text-green-600' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-lg">{rotation.name}</h3>
            <Badge variant={rotation.is_active ? 'default' : 'secondary'}>
              {rotation.is_active ? '활성' : '비활성'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* 템플릿 정보 */}
            <div className="flex items-center gap-2 text-gray-600">
              <ListOrdered className="w-4 h-4" />
              <span>템플릿 {rotation.template_ids.length}개</span>
            </div>

            {/* 표시 시간 */}
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>각 {getDurationText(rotation.duration_per_template)} 표시</span>
            </div>

            {/* 전체 순환 시간 */}
            <div className="flex items-center gap-2 text-gray-600">
              <Repeat className="w-4 h-4" />
              <span>전체 순환: {getTotalDuration()}</span>
            </div>

            {/* 우선순위 */}
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                우선순위: {rotation.priority}
              </span>
            </div>
          </div>

          {/* 기간 */}
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(rotation.start_date)} ~ {formatDate(rotation.end_date)}
            </span>
          </div>
        </div>

        {/* 오른쪽: 액션 */}
        <div className="flex items-center gap-3 ml-4">
          {canEdit && (
            <>
              <div className="flex flex-col items-center gap-1">
                <Switch
                  checked={rotation.is_active}
                  onCheckedChange={() => onToggle(rotation)}
                />
                <span className="text-xs text-gray-500">
                  {rotation.is_active ? '활성' : '비활성'}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(rotation)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          {onSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(rotation, checked)}
            />
          )}
        </div>
      </div>
    </div>
  );
}