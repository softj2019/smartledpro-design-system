// ================================================================
// TemplateFilter Component - Filter templates by category
// ================================================================

import { Button } from '@softj/smartledpro-design-system';
import { Input } from '@softj/smartledpro-design-system';
import { Filter, Search } from 'lucide-react';

interface TemplateFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const CATEGORIES = [
  { value: 'all', label: '전체', color: 'bg-gray-100 text-gray-800' },
  { value: 'emergency', label: '긴급', color: 'bg-red-100 text-red-800' },
  { value: 'notice', label: '공지', color: 'bg-blue-100 text-blue-800' },
  { value: 'event', label: '이벤트', color: 'bg-purple-100 text-purple-800' },
  { value: 'weather', label: '날씨', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'general', label: '일반', color: 'bg-gray-100 text-gray-800' },
];

export function TemplateFilter({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: TemplateFilterProps) {
  return (
    <div className="space-y-3">
      {/* 모바일: 수평 스크롤 */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
          <Filter className="h-4 w-4" />
          <span>카테고리:</span>
        </div>
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="flex gap-2 pb-2" style={{ minWidth: 'min-content' }}>
            {CATEGORIES.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCategoryChange(category.value)}
                className={
                  selectedCategory === category.value
                    ? 'shrink-0'
                    : `${category.color} hover:opacity-80 border shrink-0`
                }
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 데스크톱: flex-wrap */}
      <div className="hidden md:flex items-center gap-2 flex-wrap">
        {CATEGORIES.map((category) => (
          <Button
            key={category.value}
            variant={selectedCategory === category.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category.value)}
            className={
              selectedCategory === category.value
                ? ''
                : `${category.color} hover:opacity-80 border`
            }
          >
            {category.label}
          </Button>
        ))}
      </div>

      {/* 검색 입력 필드 */}
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="템플릿 이름, 제목, 본문 검색..."
            value={searchQuery || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      )}
    </div>
  );
}