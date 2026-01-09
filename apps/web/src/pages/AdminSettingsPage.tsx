// ================================================================
// Admin Settings Page - 시스템 관리 및 마이그레이션
// ================================================================

import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { JoongsanCrawlerPanel } from '../components/admin/JoongsanCrawlerPanel';
import { DatabaseMigrationPanel } from '../components/admin/DatabaseMigrationPanel';
import { CrawlerTimeSettings } from '../components/admin/CrawlerTimeSettings';
import { AirQualitySettings } from '../components/admin/AirQualitySettings';

type TabType = 'crawler' | 'auto-crawl' | 'air-quality' | 'database';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('crawler');

  const tabs = [
    { id: 'crawler' as TabType, label: '크롤링 설정', icon: '🏟️' },
    { id: 'auto-crawl' as TabType, label: '자동 크롤링', icon: '⏰' },
    { id: 'air-quality' as TabType, label: '공기질 표출', icon: '🌤️' },
    { id: 'database' as TabType, label: '데이터베이스', icon: '🗄️' },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <AdminPageHeader
        title="시스템 설정"
        description="크롤링, 데이터베이스, 자동화 등 시스템 전반의 설정을 관리합니다"
        breadcrumbs={[
          { label: '시스템 설정' }
        ]}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-3 md:px-4 py-2 md:py-3 text-sm whitespace-nowrap
                border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              `}
            >
              <span className="inline-block mr-1.5">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl">
        {activeTab === 'crawler' && (
          <div className="space-y-6">
            <JoongsanCrawlerPanel />
          </div>
        )}
        
        {activeTab === 'auto-crawl' && (
          <div className="space-y-6">
            <CrawlerTimeSettings />
          </div>
        )}
        
        {activeTab === 'air-quality' && (
          <div className="space-y-6">
            <AirQualitySettings />
          </div>
        )}
        
        {activeTab === 'database' && (
          <div className="space-y-6">
            <DatabaseMigrationPanel />
          </div>
        )}
      </div>
    </div>
  );
}