// ================================================================
// Air Quality Settings - 공기질 표출 설정 (통합)
// ================================================================

import { useState } from 'react';
import { AirQualityStationSettings } from './AirQualityStationSettings';
import { AirQualityTemplateCreator } from './AirQualityTemplateCreator';

export function AirQualitySettings() {
  const [activeSection, setActiveSection] = useState<'station' | 'template'>('station');

  return (
    <div className="space-y-4">
      {/* Section Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection('station')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            activeSection === 'station'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📍 측정소 설정
        </button>
        <button
          onClick={() => setActiveSection('template')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            activeSection === 'template'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🎨 템플릿 생성
        </button>
      </div>

      {/* Section Content */}
      {activeSection === 'station' && <AirQualityStationSettings />}
      {activeSection === 'template' && <AirQualityTemplateCreator />}
    </div>
  );
}