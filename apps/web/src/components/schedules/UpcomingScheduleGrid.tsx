// ================================================================
// Upcoming Schedule Grid - 향후 스케줄 그리드 뷰
// ================================================================

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@softj/smartledpro-design-system';
import { Badge } from '@softj/smartledpro-design-system';
import { TemplatePreviewCard } from './TemplatePreviewCard';
import { CalendarDays } from 'lucide-react';

interface Schedule {
  id: string;
  name: string;
  template_id: string;
  template?: {
    id: string;
    name: string;
    title: string;
    body: string;
    highlight?: string;
    category?: string;
    style_config?: any;
  };
  start_datetime: string;
  end_datetime: string | null;
  is_active: boolean;
  priority: number;
}

interface UpcomingScheduleGridProps {
  schedules: Schedule[];
  loading?: boolean;
  filter?: 'today' | 'week' | 'month' | 'all';
}

export function UpcomingScheduleGrid({ schedules, loading, filter = 'week' }: UpcomingScheduleGridProps) {
  const upcomingSchedules = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    let endDate = new Date(today);
    
    switch (filter) {
      case 'today':
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'week':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'month':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'all':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    return schedules
      .filter((schedule) => {
        const start = new Date(schedule.start_datetime);
        return start >= now && start < endDate && schedule.is_active;
      })
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
  }, [schedules, filter]);

  const getContentType = (category?: string): 'EMERGENCY' | 'NOTICE' | 'WEATHER' | undefined => {
    if (!category) return undefined;
    const upper = category.toUpperCase();
    if (upper === 'EMERGENCY' || upper === 'NOTICE' || upper === 'WEATHER') {
      return upper as 'EMERGENCY' | 'NOTICE' | 'WEATHER';
    }
    return undefined;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    let dateLabel = '';
    if (scheduleDate.getTime() === today.getTime()) {
      dateLabel = '오늘';
    } else if (scheduleDate.getTime() === tomorrow.getTime()) {
      dateLabel = '내일';
    } else {
      dateLabel = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
    }

    const timeLabel = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    
    return { dateLabel, timeLabel, fullDate: date };
  };

  const groupedSchedules = useMemo(() => {
    const groups: { [key: string]: Schedule[] } = {};
    
    upcomingSchedules.forEach((schedule) => {
      const date = new Date(schedule.start_datetime);
      const dateKey = date.toLocaleDateString('ko-KR');
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(schedule);
    });

    return groups;
  }, [upcomingSchedules]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            <CardTitle>향후 예정 스케줄</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="h-40 bg-gray-200 rounded-lg"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (upcomingSchedules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            <CardTitle>향후 예정 스케줄</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            예정된 스케줄이 없습니다
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            <CardTitle>향후 예정 스케줄</CardTitle>
          </div>
          <Badge variant="secondary">{upcomingSchedules.length}개 예정</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedSchedules).map(([dateKey, schedules]) => {
          const firstSchedule = schedules[0];
          const { dateLabel, fullDate } = formatDateTime(firstSchedule.start_datetime);

          return (
            <div key={dateKey} className="space-y-3">
              {/* 날짜 헤더 */}
              <div className="flex items-center gap-2 pb-2 border-b">
                <h3 className="font-semibold text-lg">{dateLabel}</h3>
                <span className="text-sm text-gray-500">
                  {fullDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <Badge variant="outline" className="ml-auto">{schedules.length}개</Badge>
              </div>

              {/* 스케줄 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {schedules.map((schedule) => {
                  if (!schedule.template) {
                    return null;
                  }

                  return (
                    <TemplatePreviewCard
                      key={schedule.id}
                      template={schedule.template}
                      contentType={getContentType(schedule.template.category)}
                      startTime={schedule.start_datetime}
                      endTime={schedule.end_datetime || undefined}
                      status="scheduled"
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
