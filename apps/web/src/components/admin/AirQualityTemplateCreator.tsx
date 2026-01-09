// ================================================================
// Air Quality Template Creator - 공기질 템플릿 생성
// ================================================================

import { useState } from 'react';
import { Card } from '@softj/smartledpro-design-system';
import { Button } from '@softj/smartledpro-design-system';
import { Input } from '@softj/smartledpro-design-system';
import { Label } from '@softj/smartledpro-design-system';
import { Wind, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { addLog } from '../../lib/debug-logger';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { AirQualityTemplate } from '../templates/AirQualityTemplate';
import { useAuth } from '../AuthProvider';

export function AirQualityTemplateCreator() {
  const { session } = useAuth();
  const [templateName, setTemplateName] = useState('공기질 정보');
  const [isCreating, setIsCreating] = useState(false);
  const [latestData, setLatestData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const loadLatestData = async () => {
    setIsLoadingPreview(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/airkorea/latest?scope=GOYANG`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();

      if (!result.ok || !result.data) {
        throw new Error('No air quality data available');
      }

      setLatestData(result.data);
      addLog('info', 'AirQualityTemplate', 'Preview data loaded', result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog('error', 'AirQualityTemplate', 'Failed to load preview', { error: errorMessage });
      toast.error('미리보기 데이터를 불러올 수 없습니다');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const createTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('템플릿 이름을 입력하세요');
      return;
    }

    if (!session?.access_token) {
      toast.error('로그인이 필요합니다');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/templates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: templateName,
            title: templateName,
            category: 'AIR_QUALITY',
            body: '공기질 데이터 자동 표시',
            highlight: '',
            style_config: {
              backgroundColor: '#000000',
            },
          }),
        }
      );

      const result = await response.json();

      if (!result.template) {
        throw new Error(result.error || 'Failed to create template');
      }

      addLog('info', 'AirQualityTemplate', 'Template created', result.template);
      toast.success('공기질 템플릿이 생성되었습니다');
      setTemplateName('공기질 정보');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog('error', 'AirQualityTemplate', 'Failed to create', { error: errorMessage });
      toast.error(`템플릿 생성 실패: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <Card className="p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Wind className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg md:text-xl">공기질 템플릿 생성</h2>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              실시간 공기질 데이터를 전광판에 표시하는 템플릿을 만듭니다
            </p>
          </div>
        </div>
      </Card>

      {/* Creator Form */}
      <Card className="p-4 md:p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="templateName">템플릿 이름</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="예: 고양시 공기질"
              className="mt-1.5"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={createTemplate} disabled={isCreating} className="flex-1">
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  생성 중...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  템플릿 생성
                </>
              )}
            </Button>
            <Button onClick={loadLatestData} disabled={isLoadingPreview} variant="outline">
              {isLoadingPreview ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '미리보기'
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Preview */}
      {latestData && (
        <Card className="p-4 md:p-6">
          <h3 className="font-medium mb-3">미리보기</h3>
          <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <AirQualityTemplate
              data={{
                pm25Value: latestData.pm25_value || '-',
                pm25Grade: latestData.pm25_grade || '0',
                pm10Value: latestData.pm10_value || '-',
                pm10Grade: latestData.pm10_grade || '0',
                khaiValue: latestData.khai_value || '-',
                khaiGrade: latestData.khai_grade || '0',
              }}
            />
          </div>
          <div className="mt-3 text-xs text-gray-600">
            <div>측정소: {latestData.station_name}</div>
            <div>측정 시각: {new Date(latestData.data_time).toLocaleString('ko-KR')}</div>
          </div>
        </Card>
      )}

      {/* Info */}
      <Card className="p-4 bg-purple-50 border-purple-200">
        <h4 className="text-sm font-semibold text-purple-900 mb-2">ℹ️ 안내</h4>
        <ul className="text-xs md:text-sm text-purple-800 space-y-1">
          <li>• <strong>자동 데이터:</strong> 최신 공기질 데이터가 자동으로 표시됩니다</li>
          <li>• <strong>3줄 레이아웃:</strong> 제목 + PM2.5/PM10 + 통합대기질</li>
          <li>• <strong>등급별 색상:</strong> 좋음(파랑), 보통(녹색), 나쁨(금색), 매우나쁨(붉은색)</li>
          <li>• <strong>우선순위:</strong> AIR_QUALITY 카테고리 (EMERGENCY, NOTICE 다음)</li>
        </ul>
      </Card>
    </div>
  );
}