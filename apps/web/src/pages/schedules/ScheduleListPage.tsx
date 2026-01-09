import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Calendar, Repeat, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSchedules } from '../../lib/hooks/useSchedules';
import { useRotations } from '../../lib/hooks/useRotations';
import { usePermissions } from '../../lib/hooks/usePermissions';
import { useConfirm } from '../../lib/hooks/useConfirm';
import { AdminPageHeader } from '../../components/layout/AdminPageHeader';
import { ScheduleCard } from '../../components/schedules/ScheduleCard';
import { RotationCard } from '../../components/schedules/RotationCard';
import { ScheduleFilter } from '../../components/schedules/ScheduleFilter';
import { ScheduleSkeleton } from '../../components/schedules/ScheduleSkeleton';
import { Button } from "@softj/smartledpro-design-system";
import { Checkbox } from "@softj/smartledpro-design-system";
import { Alert, AlertDescription } from "@softj/smartledpro-design-system";
import { toast } from 'sonner';
import type { Schedule } from '../../lib/types/schedule';
import type { Rotation } from '../../lib/types/rotation';

export default function ScheduleListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'schedules' | 'rotations'>('schedules');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [selectedRotationIds, setSelectedRotationIds] = useState<Set<string>>(new Set());
  const { schedules, loading: schedulesLoading, error: schedulesError, deleteSchedule, toggleSchedule, refreshSchedules } = useSchedules(activeFilter);
  const { rotations, loading: rotationsLoading, error: rotationsError, deleteRotation, toggleRotation, refreshRotations } = useRotations();
  const { canEdit } = usePermissions();
  const confirm = useConfirm();

  const handleToggle = async (schedule: Schedule) => {
    const result = await toggleSchedule(schedule.id);
    if (result) {
      toast.success(
        result.is_active 
          ? `"${schedule.name}" 스케줄이 활성화되었습니다.`
          : `"${schedule.name}" 스케줄이 비활성화되었습니다.`
      );
    } else {
      toast.error('스케줄 상태 변경에 실패했습니다.');
    }
  };

  const handleEdit = (schedule: Schedule) => {
    navigate(`/schedules/edit/${schedule.id}`);
  };

  const handleDelete = async (schedule: Schedule) => {
    const confirmed = await confirm({
      title: '스케줄 삭제',
      description: `"${schedule.name}" 스케줄을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      variant: 'destructive',
    });

    if (confirmed) {
      const success = await deleteSchedule(schedule.id);
      if (success) {
        toast.success('스케줄이 삭제되었습니다.');
      } else {
        toast.error('스케줄 삭제에 실패했습니다.');
      }
    }
  };

  const handleCreateNew = () => {
    navigate('/schedules/new');
  };

  const handleRefresh = async () => {
    if (activeTab === 'schedules') {
      await refreshSchedules();
      toast.success('스케줄 목록이 새로고침되었습니다.');
    } else {
      await refreshRotations();
      toast.success('순차 반복 목록이 새로고침되었습니다.');
    }
  };

  // Rotation handlers
  const handleRotationToggle = async (rotation: Rotation) => {
    const result = await toggleRotation(rotation.id);
    if (result) {
      toast.success(
        result.is_active 
          ? `"${rotation.name}" 순차 반복이 활성화되었습니다.`
          : `"${rotation.name}" 순차 반복이 비활성화되었습니다.`
      );
    } else {
      toast.error('순차 반복 상태 변경에 실패했습니다.');
    }
  };

  const handleRotationDelete = async (rotation: Rotation) => {
    const confirmed = await confirm({
      title: '순차 반복 삭제',
      description: `"${rotation.name}" 순차 반복을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      variant: 'destructive',
    });

    if (confirmed) {
      const success = await deleteRotation(rotation.id);
      if (success) {
        toast.success('순차 반복이 삭제되었습니다.');
      } else {
        toast.error('순차 반복 삭제에 실패했습니다.');
      }
    }
  };

  const handleGoToStudio = () => {
    navigate('/studio');
  };

  // ✅ 순차 반복 선택 관련 핸들러
  const handleRotationSelect = (rotation: Rotation, selected: boolean) => {
    const newSelected = new Set(selectedRotationIds);
    if (selected) {
      newSelected.add(rotation.id);
    } else {
      newSelected.delete(rotation.id);
    }
    setSelectedRotationIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRotationIds(new Set(rotations.map(r => r.id)));
    } else {
      setSelectedRotationIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedRotationIds.size;
    const confirmed = await confirm({
      title: '순차 반복 일괄 삭제',
      description: `선택한 ${count}개의 순차 반복을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      variant: 'destructive',
    });

    if (confirmed) {
      let successCount = 0;
      for (const id of selectedRotationIds) {
        const success = await deleteRotation(id);
        if (success) successCount++;
      }
      
      setSelectedRotationIds(new Set());
      
      if (successCount === count) {
        toast.success(`${count}개의 순차 반복이 삭제되었습니다.`);
      } else {
        toast.warning(`${successCount}/${count}개의 순차 반복이 삭제되었습니다.`);
      }
    }
  };

  const handleBulkActivate = async () => {
    const count = selectedRotationIds.size;
    let successCount = 0;
    
    for (const id of selectedRotationIds) {
      const rotation = rotations.find(r => r.id === id);
      if (rotation && !rotation.is_active) {
        const result = await toggleRotation(id);
        if (result) successCount++;
      }
    }
    
    setSelectedRotationIds(new Set());
    
    if (successCount > 0) {
      toast.success(`${successCount}개의 순차 반복이 활성화되었습니다.`);
    } else {
      toast.info('활성화할 순차 반복이 없습니다.');
    }
  };

  const handleBulkDeactivate = async () => {
    const count = selectedRotationIds.size;
    let successCount = 0;
    
    for (const id of selectedRotationIds) {
      const rotation = rotations.find(r => r.id === id);
      if (rotation && rotation.is_active) {
        const result = await toggleRotation(id);
        if (result) successCount++;
      }
    }
    
    setSelectedRotationIds(new Set());
    
    if (successCount > 0) {
      toast.success(`${successCount}개의 순차 반복이 비활성화되었습니다.`);
    } else {
      toast.info('비활성화할 순차 반복이 없습니다.');
    }
  };

  // Get template names (simplified - in real app, fetch from API)
  const getTemplateName = (templateId: string) => {
    // TODO: Fetch template names from API
    return templateId;
  };

  const currentLoading = activeTab === 'schedules' ? schedulesLoading : rotationsLoading;
  const currentError = activeTab === 'schedules' ? schedulesError : rotationsError;

  // ✅ 전체선택 상태 계산
  const isAllRotationsSelected = rotations.length > 0 && selectedRotationIds.size === rotations.length;
  const isSomeRotationsSelected = selectedRotationIds.size > 0 && selectedRotationIds.size < rotations.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="스케줄 관리"
        description="템플릿 송출 스케줄을 관리하고 자동 전환을 설정합니다."
        icon={<Calendar className="w-8 h-8" />}
        breadcrumbs={[
          { label: '스케줄 관리' }
        ]}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={currentLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${currentLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            {canEdit && activeTab === 'schedules' && (
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                새 스케줄
              </Button>
            )}
            {canEdit && activeTab === 'rotations' && (
              <Button onClick={handleGoToStudio}>
                <Repeat className="w-4 h-4 mr-2" />
                순차 반복 생성
              </Button>
            )}
          </>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`pb-4 px-1 border-b-2 transition-colors ${
              activeTab === 'schedules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">예약 스케줄</span>
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                {schedules.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('rotations')}
            className={`pb-4 px-1 border-b-2 transition-colors ${
              activeTab === 'rotations'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Repeat className="w-5 h-5" />
              <span className="font-medium">순차 반복</span>
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                {rotations.length}
              </span>
            </div>
          </button>
        </nav>
      </div>

      {/* Filter - Only show for schedules */}
      {activeTab === 'schedules' && (
        <div className="mb-6">
          <ScheduleFilter 
            activeFilter={activeFilter} 
            onFilterChange={setActiveFilter} 
          />
        </div>
      )}

      {/* Error Alert */}
      {currentError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{currentError}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {currentLoading && (
        <div className="space-y-4">
          <ScheduleSkeleton />
          <ScheduleSkeleton />
          <ScheduleSkeleton />
        </div>
      )}

      {/* Schedules Tab Content */}
      {activeTab === 'schedules' && !schedulesLoading && (
        <>
          {/* Empty State */}
          {schedules.length === 0 && (
            <div className="text-center py-16">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl mb-2">등록된 스케줄이 없습니다</h3>
              <p className="text-gray-500 mb-6">
                {activeFilter === 'all'
                  ? '첫 번째 스케줄을 생성해보세요.'
                  : activeFilter === 'true'
                  ? '활성화된 스케줄이 없습니다.'
                  : '비활성화된 스케줄이 없습니다.'}
              </p>
              {canEdit && (
                <Button onClick={handleCreateNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  새 스케줄 만들기
                </Button>
              )}
            </div>
          )}

          {/* Schedule List */}
          {schedules.length > 0 && (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  templateName={getTemplateName(schedule.template_id)}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )}

          {/* Stats */}
          {schedules.length > 0 && (
            <div className="mt-6 text-center text-sm text-gray-500">
              총 {schedules.length}개의 스케줄
            </div>
          )}
        </>
      )}

      {/* Rotations Tab Content */}
      {activeTab === 'rotations' && !rotationsLoading && (
        <>
          {/* Empty State */}
          {rotations.length === 0 && (
            <div className="text-center py-16">
              <Repeat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl mb-2">등록된 순차 반복이 없습니다</h3>
              <p className="text-gray-500 mb-6">
                스튜디오에서 첫 번째 순차 반복을 생성해보세요.
              </p>
              {canEdit && (
                <Button onClick={handleGoToStudio}>
                  <Repeat className="w-4 h-4 mr-2" />
                  순차 반복 생성하기
                </Button>
              )}
            </div>
          )}

          {/* Rotation List */}
          {rotations.length > 0 && (
            <>
              {/* ✅ 전체 선택 및 일괄 작업 툴바 */}
              {canEdit && (
                <div className="bg-white border rounded-lg p-4 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="select-all"
                      checked={isAllRotationsSelected}
                      indeterminate={isSomeRotationsSelected}
                      onCheckedChange={handleSelectAll}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium cursor-pointer"
                    >
                      전체 선택
                    </label>
                    {selectedRotationIds.size > 0 && (
                      <span className="text-sm text-gray-500">
                        ({selectedRotationIds.size}개 선택됨)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkActivate}
                      disabled={selectedRotationIds.size === 0}
                    >
                      <ToggleRight className="w-4 h-4 mr-2" />
                      활성화
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDeactivate}
                      disabled={selectedRotationIds.size === 0}
                    >
                      <ToggleLeft className="w-4 h-4 mr-2" />
                      비활성화
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={selectedRotationIds.size === 0}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {rotations.map((rotation) => (
                  <RotationCard
                    key={rotation.id}
                    rotation={rotation}
                    onToggle={handleRotationToggle}
                    onDelete={handleRotationDelete}
                    canEdit={canEdit}
                    isSelected={selectedRotationIds.has(rotation.id)}
                    onSelect={handleRotationSelect}
                  />
                ))}
              </div>

              {/* Stats */}
              <div className="mt-6 text-center text-sm text-gray-500">
                총 {rotations.length}개의 순차 반복
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}