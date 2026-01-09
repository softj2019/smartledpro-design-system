// ================================================================
// Crawler Time Settings - 자동 크롤링 시간 설정
// ================================================================

import { useState, useEffect } from 'react';
import { Clock, Save, RotateCcw } from 'lucide-react';
import { Button } from '@softj/smartledpro-design-system';
import { Input } from '@softj/smartledpro-design-system';
import { Label } from '@softj/smartledpro-design-system';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { addLog } from '../../lib/debug-logger';
import { toast } from 'sonner';

interface CrawlerSettings {
  hour: number;
  minute: number;
}

const DEFAULT_SETTINGS: CrawlerSettings = {
  hour: 6,
  minute: 0,
};

export function CrawlerTimeSettings() {
  const [settings, setSettings] = useState<CrawlerSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 설정 불러오기
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/kv/crawler_time_settings`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          setSettings(data.value);
          addLog('info', 'CrawlerTimeSettings', 'Settings loaded', data.value);
        }
      }
    } catch (error) {
      addLog('error', 'CrawlerTimeSettings', 'Failed to load settings', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // 입력 검증
    if (settings.hour < 0 || settings.hour > 23) {
      toast.error('시간은 0~23 사이 값이어야 합니다');
      return;
    }
    if (settings.minute < 0 || settings.minute > 59) {
      toast.error('분은 0~59 사이 값이어야 합니다');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/kv/crawler_time_settings`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            value: settings,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '설정 저장 실패');
      }

      addLog('info', 'CrawlerTimeSettings', 'Settings saved', settings);
      toast.success('크롤링 시간이 저장되었습니다');

      // 브라우저 새로고침 권장 메시지
      toast.info('변경사항을 적용하려면 페이지를 새로고침하세요', {
        duration: 5000,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog('error', 'CrawlerTimeSettings', 'Failed to save settings', {
        error: errorMessage,
      });
      toast.error(`저장 실패: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    toast.info('기본값으로 재설정되었습니다 (저장 필요)');
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">자동 크롤링 시간 설정</h2>
            <p className="text-sm text-gray-600 mt-1">
              매일 자동으로 크롤링이 실행될 시간을 설정합니다
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 시간 입력 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hour">시 (Hour)</Label>
            <Input
              id="hour"
              type="number"
              min="0"
              max="23"
              value={settings.hour}
              onChange={(e) =>
                setSettings({ ...settings, hour: parseInt(e.target.value) || 0 })
              }
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">0 ~ 23</p>
          </div>

          <div>
            <Label htmlFor="minute">분 (Minute)</Label>
            <Input
              id="minute"
              type="number"
              min="0"
              max="59"
              value={settings.minute}
              onChange={(e) =>
                setSettings({ ...settings, minute: parseInt(e.target.value) || 0 })
              }
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">0 ~ 59</p>
          </div>
        </div>

        {/* 현재 설정 미리보기 */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">설정된 실행 시간</div>
          <div className="text-2xl font-bold text-gray-900">
            매일 {String(settings.hour).padStart(2, '0')}:
            {String(settings.minute).padStart(2, '0')}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                저장
              </>
            )}
          </Button>

          <Button
            onClick={handleReset}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            기본값으로 재설정
          </Button>
        </div>

        {/* 안내 */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">ℹ️ 사용 안내</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>기본값:</strong> 매일 06:00 (오전 6시)</li>
            <li>• <strong>테스트:</strong> 현재 시간보다 1~2분 후로 설정하여 즉시 테스트 가능</li>
            <li>• <strong>적용:</strong> 저장 후 페이지 새로고침 필요</li>
            <li>• <strong>실행 확인:</strong> Audit Logs 또는 디버그 로그에서 확인</li>
            <li>• <strong>하루 1회:</strong> 같은 날짜에는 중복 실행되지 않습니다</li>
          </ul>
        </div>

        {/* 공기질 자동 수집 안내 */}
        <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
          <h4 className="font-semibold text-cyan-900 mb-2">🌤️ 공기질 자동 수집</h4>
          <ul className="text-sm text-cyan-800 space-y-1">
            <li>• <strong>수집 주기:</strong> 매시간 정각 (XX:00) - 별도 설정 불필요</li>
            <li>• <strong>측정소 설정:</strong> "공기질 표출" 탭에서 Primary/Secondary 설정</li>
            <li>• <strong>폴백 시스템:</strong> Primary 실패 시 자동으로 Secondary 측정소에서 수집</li>
            <li>• <strong>수집 로그:</strong> "공기질 표출" 탭에서 최근 수집 결과 확인</li>
          </ul>
        </div>
      </div>
    </div>
  );
}