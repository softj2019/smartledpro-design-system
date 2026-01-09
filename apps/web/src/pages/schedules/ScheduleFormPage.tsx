import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { AdminPageHeader } from '../../components/layout/AdminPageHeader';
import { Button } from "@softj/smartledpro-design-system";
import { Alert, AlertDescription } from "@softj/smartledpro-design-system";
import { ScheduleForm } from '../../components/schedules/ScheduleForm';
import { useSchedules } from '../../lib/hooks/useSchedules';
import type { Schedule, ScheduleFormData } from '../../lib/types/schedule';
import type { MessageTemplate } from '../../lib/hooks/useTemplates';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from 'sonner';
import { logger } from '../../lib/debug-logger';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f`;

export default function ScheduleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const { createSchedule, updateSchedule } = useSchedules('all');
  
  const [schedule, setSchedule] = useState<Schedule | undefined>();
  const [templates, setTemplates] = useState<Array<MessageTemplate>>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
    if (isEditMode && id) {
      fetchSchedule(id);
    }
  }, [id, isEditMode]);

  const getAccessToken = () => {
    return localStorage.getItem('access_token');
  };

  const fetchTemplates = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token found');
      }

      logger.info('ScheduleFormPage', '템플릿 조회 시작', { url: `${API_URL}/templates` });

      const response = await fetch(`${API_URL}/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      
      logger.info('ScheduleFormPage', `서버 응답 수신 - 템플릿 ${data.templates?.length || 0}개`, {
        templateCount: data.templates?.length || 0,
        firstTemplate: data.templates?.[0] || null,
        rawResponse: data,
      });

      // ✅ 서버에서 반환된 모든 필드를 그대로 사용
      setTemplates(data.templates || []);
      
      logger.success('ScheduleFormPage', `템플릿 로드 완료 - ${data.templates?.length || 0}개`);
    } catch (err) {
      logger.error('ScheduleFormPage', '템플릿 조회 실패', { error: err });
      setError('템플릿 목록을 불러오는 데 실패했습니다.');
    }
  };

  const fetchSchedule = async (scheduleId: string) => {
    setFetchingData(true);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token found');
      }

      logger.info('ScheduleFormPage', '스케줄 조회 시작', { scheduleId });

      const response = await fetch(`${API_URL}/schedules/${scheduleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }

      const data = await response.json();
      
      logger.info('ScheduleFormPage', '스케줄 데이터 수신', { 
        schedule: data.schedule,
        start_datetime: data.schedule?.start_datetime,
        end_datetime: data.schedule?.end_datetime,
      });
      
      setSchedule(data.schedule);
    } catch (err) {
      logger.error('ScheduleFormPage', '스케줄 조회 실패', { error: err });
      setError('스케줄을 불러오는 데 실패했습니다.');
      toast.error('스케줄을 불러올 수 없습니다.');
    } finally {
      setFetchingData(false);
    }
  };

  const handleSubmit = async (data: ScheduleFormData) => {
    setLoading(true);
    try {
      if (isEditMode && id) {
        const result = await updateSchedule(id, data);
        if (result) {
          toast.success('스케줄이 수정되었습니다.');
          navigate('/schedules');
        } else {
          toast.error('스케줄 수정에 실패했습니다.');
        }
      } else {
        const result = await createSchedule(data);
        if (result) {
          toast.success('스케줄이 생성되었습니다.');
          navigate('/schedules');
        } else {
          toast.error('스케줄 생성에 실패했습니다.');
        }
      }
    } catch (err) {
      console.error('Error submitting schedule:', err);
      toast.error(isEditMode ? '스케줄 수정 중 오류가 발생했습니다.' : '스케줄 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/schedules');
  };

  if (fetchingData) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">스케줄을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/schedules')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          스케줄 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title={isEditMode ? '스케줄 수정' : '새 스케줄 만들기'}
        description={isEditMode 
          ? '스케줄 정보를 수정합니다.' 
          : '자동으로 템플릿을 전광판에 송출할 스케줄을 생성합니다.'}
        icon={<Calendar className="w-8 h-8" />}
        breadcrumbs={[
          { label: '스케줄 관리', href: '/schedules' },
          { label: isEditMode ? '스케줄 수정' : '새 스케줄' }
        ]}
        backUrl="/schedules"
      />

      {/* Form */}
      <ScheduleForm
        schedule={schedule}
        templates={templates}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  );
}