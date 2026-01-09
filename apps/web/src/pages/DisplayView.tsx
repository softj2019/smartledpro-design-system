// ================================================================
// DisplayView Page - 실제 전광판에 표시되는 뷰 페이지
// 키오스크 모드로 동작, 640x360 해상도, 430x260 활성 영역
// ================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { logger } from '../lib/debug-logger';
import { DebugLogDrawer } from '../components/DebugLogDrawer';
import { Bug, X } from 'lucide-react';
import { AirQualityTemplate } from '../components/templates/AirQualityTemplate';

interface DisplayTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  highlight: string | null;
  style_config: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: string;
    fontWeight?: string;
    textAlign?: string;
    fontFamily?: string;
  };
  category: string;
}

interface RotationInfo {
  id: string;
  name: string;
  template_ids: string[];
  current_index: number;
  duration_per_template: number;
  next_switch_at: string;
  time_until_next_ms: number;
}

interface DisplayResponse {
  success: boolean;
  template: DisplayTemplate | null;
  source: 'schedule' | 'manual' | 'none';
  last_updated: string;
  settings: {
    position: { x: number; y: number };
    scaleX: number;
    scaleY: number;
    showBorder: boolean;
  };
  active_schedules_count: number;
  rotation?: RotationInfo | null;
}

export default function DisplayView() {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<DisplayTemplate | null>(null);
  const [source, setSource] = useState<'schedule' | 'manual' | 'none'>('none');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeSchedulesCount, setActiveSchedulesCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({ position: { x: 0, y: 0 }, scaleX: 1, scaleY: 1, showBorder: true });
  const [debugLogOpen, setDebugLogOpen] = useState(false);
  const [airQualityData, setAirQualityData] = useState<any>(null);
  const [rotationInfo, setRotationInfo] = useState<RotationInfo | null>(null);

  // 뒤로 가기 핸들러
  const handleClose = () => {
    logger.info('DisplayView', '전광판 뷰 닫기 버튼 클릭', {});
    // 이전 페이지로 이동 (스튜디오로 돌아가기)
    if (window.history.length > 1) {
      navigate(-1); // 브라우저 히스토리 뒤로
    } else {
      navigate('/studio'); // 히스토리가 없으면 스튜디오로
    }
  };

  // 🔍 디버그: display_current_state 상태 조회
  const fetchDebugState = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/debug/display-state`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();
      
      logger.info('DisplayView', '🔍 Debug State', {
        display_current_state: result.display_current_state,
        active_rotations_count: result.active_rotations?.length || 0,
        active_schedules_count: result.active_schedules?.length || 0,
      });
      
    } catch (err) {
      logger.error('DisplayView', 'Failed to fetch debug state', { error: err });
    }
  };

  // 공기질 데이터 조회
  const fetchAirQualityData = async () => {
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

      if (result.ok && result.data) {
        setAirQualityData(result.data);
      }
    } catch (err) {
      logger.error('DisplayView', 'Failed to fetch air quality data', { error: err });
    }
  };

  // 현재 표시할 템플릿 조회
  const fetchCurrentTemplate = async () => {
    try {
      logger.debug('DisplayView', 'Fetching current template...', { timestamp: new Date().toISOString() });
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/display/current`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DisplayResponse = await response.json();
      
      logger.info('DisplayView', 'Template fetched', { 
        template: data.template?.name || 'none',
        source: data.source,
        active_schedules: data.active_schedules_count,
      });
      
      // ✅ API 전체 응답 로깅 (디버깅용)
      logger.debug('DisplayView', 'Full API Response', {
        success: data.success,
        template_id: data.template?.id || null,
        template_name: data.template?.name || null,
        source: data.source,
        source_id: (data as any).source_id || null,
        content_type: (data as any).content_type || null,
        priority: (data as any).priority || null,
        rotation_info: data.rotation ? {
          id: data.rotation.id,
          name: data.rotation.name,
          current_index: data.rotation.current_index,
          total_templates: data.rotation.template_ids.length,
        } : null,
      });
      
      // settings는 항상 업데이트 (템플릿 유무와 무관)
      if (data.settings) {
        setSettings(data.settings);
      }
      
      if (data.success && data.template) {
        setTemplate(data.template);
        setLastUpdated(data.last_updated);
        setSource(data.source);
        setActiveSchedulesCount(data.active_schedules_count);
        setError(null);
        
        logger.success('DisplayView', 'Template displayed', { 
          template_id: data.template.id,
          template_name: data.template.name,
        });
        
        // 회전 정보 업데이트
        if (data.rotation) {
          setRotationInfo(data.rotation);
        }
      } else {
        // 표시할 템플릿이 없는 경우 기본 메시지
        setTemplate(null);
        setError(null);
        
        logger.warn('DisplayView', 'No template to display', {});
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      
      logger.error('DisplayView', 'Failed to fetch template', { error: errorMsg });
    }
  };

  // 컴포넌트 마운트 시 및 3초마다 폴링
  useEffect(() => {
    logger.info('DisplayView', 'Component mounted', { polling_interval: '3s' });
    
    fetchCurrentTemplate();
    fetchAirQualityData(); // 공기질 데이터도 초기 로드
    fetchDebugState(); // 🔍 디버그 상태 조회
    
    const interval = setInterval(() => {
      fetchCurrentTemplate();
      fetchAirQualityData(); // 공기질 데이터도 주기적 갱신
    }, 3000);
    
    return () => {
      logger.debug('DisplayView', 'Component unmounted', {});
      clearInterval(interval);
    };
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        logger.info('DisplayView', 'ESC 키 눌림 - 전광판 닫기', {});
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 스타일 설정
  const styleConfig = template?.style_config || {};
  const backgroundColor = styleConfig.backgroundColor || '#000000';
  const textColor = styleConfig.textColor || '#ffcc00';
  const fontSize = styleConfig.fontSize || '38px';
  const fontWeight = styleConfig.fontWeight || '800';
  const textAlign = styleConfig.textAlign || 'left';
  const fontFamily = styleConfig.fontFamily || 'Arial, Helvetica, sans-serif';

  return (
    <>
      <div
        style={{
          width: '640px',
          height: '360px',
          background: 'black',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          left: 0,
        }}
      >
      {/* 실제 표시 영역 (430x260) */}
      <div
        id="active-area"
        style={{
          position: 'absolute',
          width: '430px',
          height: '260px',
          boxSizing: 'border-box',
          border: settings.showBorder ? '2px solid red' : 'none',
          background: backgroundColor,
          color: textColor,
          fontFamily: fontFamily,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '15px',
          textAlign: textAlign as any,
          transform: `translate(${settings.position.x}px, ${settings.position.y}px) scale(${settings.scaleX}, ${settings.scaleY})`,
          transformOrigin: 'top left',
          transition: 'transform 0.3s ease',
        }}
      >
        {error && (
          <div
            style={{
              color: '#ff0000',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            ERROR: {error}
          </div>
        )}

        {!template && !error && (
          <div>
            <div
              style={{
                fontSize: '38px',
                fontWeight: '800',
                lineHeight: '1.1',
              }}
            >
              STANDBY
            </div>
            <div
              style={{
                fontSize: '21px',
                marginTop: '6px',
              }}
            >
              송출 대기 중
            </div>
            <div
              style={{
                fontSize: '14px',
                marginTop: '12px',
                opacity: 0.7,
              }}
            >
              순차 반복 스케줄을 등록하여 콘텐츠를 송출하세요
            </div>
          </div>
        )}

        {template && (
          <div style={{ width: '100%', height: '100%' }}>
            {/* AIR_QUALITY 카테고리: 특별한 템플릿 렌더링 */}
            {template.category === 'AIR_QUALITY' && airQualityData ? (
              <div style={{ width: '100%', height: '100%', margin: '-15px', padding: '0' }}>
                <AirQualityTemplate
                  data={{
                    pm25Value: airQualityData.pm25_value || '-',
                    pm25Grade: airQualityData.pm25_grade || '0',
                    pm10Value: airQualityData.pm10_value || '-',
                    pm10Grade: airQualityData.pm10_grade || '0',
                    khaiValue: airQualityData.khai_value || '-',
                    khaiGrade: airQualityData.khai_grade || '0',
                  }}
                />
              </div>
            ) : (
              <>
                {/* Highlight (강조 메시지) */}
                {template.highlight && (
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '10px',
                      color: textColor,
                      opacity: 0.9,
                    }}
                    dangerouslySetInnerHTML={{ __html: template.highlight }}
                  />
                )}

                {/* Body (HTML 지원) - 본문만 표시 */}
                <div
                  style={{
                    fontSize: '21px',
                    lineHeight: '1.3',
                    width: '100%',
                  }}
                  dangerouslySetInnerHTML={{ __html: template.body }}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* 디버그 정보 (우측 하단, 작게 표시) */}
      {lastUpdated && (
        <div
          style={{
            position: 'absolute',
            bottom: '5px',
            right: '5px',
            fontSize: '8px',
            color: '#666',
            fontFamily: 'monospace',
          }}
        >
          Updated: {new Date(lastUpdated).toLocaleTimeString('ko-KR')}
          {rotationInfo && (
            <>
              <br />
              🔄 Rotation: {rotationInfo.current_index + 1}/{rotationInfo.template_ids.length}
              <br />
              Next: {Math.max(0, Math.round(rotationInfo.time_until_next_ms / 1000))}s
            </>
          )}
        </div>
      )}
    </div>

    {/* Close Button (우측 상단에 플로팅) */}
    <button
      onClick={handleClose}
      style={{
        position: 'fixed',
        right: '20px',
        top: '20px',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: '#ef4444',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        color: 'white',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#dc2626';
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#ef4444';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      title="닫기 (ESC)"
    >
      <X size={28} strokeWidth={3} />
    </button>

    {/* Debug Log Button (우측 중앙에 플로팅) */}
    <button
      onClick={() => setDebugLogOpen(!debugLogOpen)}
      style={{
        position: 'fixed',
        right: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: debugLogOpen ? '#3b82f6' : '#6b7280',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        color: 'white',
      }}
    >
      <Bug size={24} />
    </button>

    {/* Debug Log Drawer */}
    <DebugLogDrawer 
      isOpen={debugLogOpen} 
      onClose={() => setDebugLogOpen(false)} 
    />
  </>
  );
}