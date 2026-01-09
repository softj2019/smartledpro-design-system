import { Button } from '@softj/smartledpro-design-system';

interface ScheduleFilterProps {
  activeFilter: 'all' | 'true' | 'false';
  onFilterChange: (filter: 'all' | 'true' | 'false') => void;
}

export function ScheduleFilter({ activeFilter, onFilterChange }: ScheduleFilterProps) {
  const filters: { value: 'all' | 'true' | 'false'; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'true', label: '활성' },
    { value: 'false', label: '비활성' },
  ];

  return (
    <div className="space-y-3">
      {/* 모바일: 수평 스크롤 */}
      <div className="md:hidden overflow-x-auto -mx-6 px-6">
        <div className="flex gap-2 pb-2" style={{ minWidth: 'min-content' }}>
          {filters.map((filter) => (
            <Button
              key={filter.value}
              variant={activeFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange(filter.value)}
              className="shrink-0"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 데스크톱: 일반 flex */}
      <div className="hidden md:flex gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            variant={activeFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}