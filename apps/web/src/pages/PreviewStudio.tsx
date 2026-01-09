// ================================================================
// Preview Studio - 순차 반복 송출 관리 센터
// 즉시 송출 기능 제거 (스케줄로 대체)
// ================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CurrentBroadcastStatus } from '../components/studio/CurrentBroadcastStatus';
import { RotationControls } from '../components/studio/RotationControls';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Radio, Monitor } from 'lucide-react';
import { Button } from "@softj/smartledpro-design-system";
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { logger } from '../lib/debug-logger';

interface Template {
  id: string;
  name: string;
  category: string;
  title: string;
  body: string;
  highlight?: string;
  style_config?: any;
}

export default function PreviewStudio() {
  const navigate = useNavigate();
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  // 현재 송출 중인 템플릿 ID (순차 반복 송출용)
  const [currentBroadcastingTemplateId, setCurrentBroadcastingTemplateId] = useState<string | null>(null);

  // 템플릿 로드
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const accessToken = localStorage.getItem('access_token');
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/templates`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken || ''}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // ✅ API는 { templates: [...] } 형태로 반환
          const templates = Array.isArray(data) ? data : (data.templates || []);
          setAllTemplates(templates);
          logger.info('Templates', '템플릿 로드 성공', { count: templates.length });
        } else {
          logger.error('Templates', '템플릿 로드 실패', { status: response.status });
          toast.error('템플릿을 불러오는데 실패했습니다');
        }
      } catch (error) {
        logger.error('Templates', '템플릿 로드 중 에러', { 
          error: error instanceof Error ? error.message : String(error)
        });
        toast.error('템플릿 로드 중 오류가 발생했습니다');
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="스튜디오"
        description="순차 반복 송출 관리"
        icon={<Radio className="w-6 h-6" />}
        breadcrumbs={[
          { label: '스튜디오' }
        ]}
        actions={
          <Button
            onClick={() => navigate('/display/view')}
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <Monitor className="w-4 h-4 mr-2" />
            전광판 보기
          </Button>
        }
      />

      <div className="max-w-full mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* ════════════════════════════════════════════════════════ */}
        {/* 1. 현재 송출 상태 (통합 카드)                              */}
        {/* ════════════════════════════════════════════════════════ */}
        <section className="w-full">
          <CurrentBroadcastStatus 
            onRotationStopped={() => {
              toast.success('순차 반복 송출이 중지되었습니다');
              setCurrentBroadcastingTemplateId(null);
            }}
            onCurrentTemplateChange={(templateId) => {
              setCurrentBroadcastingTemplateId(templateId);
            }}
          />
        </section>

        {/* ════════════════════════════════════════════════════════ */}
        {/* 2. 순차 반복 송출 관리                                     */}
        {/* ════════════════════════════════════════════════════════ */}
        <section className="w-full">
          {loadingTemplates ? (
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <p className="text-gray-600">템플릿 불러오는 중...</p>
              </div>
            </div>
          ) : (
            <RotationControls
              selectedTemplate={null}
              allTemplates={allTemplates}
              onBroadcastSuccess={() => {
                toast.success('순차 반복 송출이 시작되었습니다!');
              }}
            />
          )}
        </section>

        {/* ════════════════════════════════════════════════════════ */}
        {/* 3. 안내 메시지                                             */}
        {/* ════════════════════════════════════════════════════════ */}
        <section className="w-full">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
            <h3 className="text-base md:text-lg font-bold mb-3 text-blue-900">
              💡 즉시 송출이 필요하신가요?
            </h3>
            <div className="space-y-2 text-sm md:text-base text-blue-800">
              <p>
                <strong>긴급 공지:</strong> 일정 관리에서 우선순위 1로 스케줄 등록 (즉시 송출됨)
              </p>
              <p>
                <strong>일반 공지:</strong> 순차 반복 송출 또는 스케줄 등록
              </p>
              <p className="text-xs md:text-sm text-blue-700 mt-3">
                ✅ 모든 송출은 스케줄로 관리되어 정확한 기록과 추적이 가능합니다
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}