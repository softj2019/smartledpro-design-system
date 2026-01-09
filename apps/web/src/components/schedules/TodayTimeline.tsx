// ================================================================
// Today Timeline - 금일 스케줄 타임라인 뷰
// ================================================================

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@softj/smartledpro-design-system';
import { Badge } from '@softj/smartledpro-design-system';
import { Calendar, Clock } from 'lucide-react';

interface Schedule {
  id: string;
  name: string;
  template_id: string;
  template?: {
    name: string;
    title: string;
    category?: string;
  };
  start_datetime: string;
  end_datetime: string | null;
  is_active: boolean;
  priority: number;
}

interface TodayTimelineProps {
  schedules: Schedule[];
  loading?: boolean;
}

export function TodayTimeline({ schedules, loading }: TodayTimelineProps) {
  const todaySchedules = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return schedules
      .filter((schedule) => {
        const start = new Date(schedule.start_datetime);
        return start >= today && start < tomorrow && schedule.is_active;
      })
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
  }, [schedules]);

  const getContentTypeBadge = (category?: string) => {
    if (!category) return null;
    
    switch (category.toUpperCase()) {
      case 'EMERGENCY':
        return <Badge variant="destructive" className="text-xs">긴급</Badge>;
      case 'NOTICE':
        return <Badge className="bg-blue-500 text-xs">공지</Badge>;
      case 'WEATHER':
        return <Badge className="bg-green-500 text-xs">날씨</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{category}</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const isCurrentlyActive = (schedule: Schedule) => {
    const now = new Date();
    const start = new Date(schedule.start_datetime);
    const end = schedule.end_datetime ? new Date(schedule.end_datetime) : null;
    
    return start <= now && (!end || end > now);
  };

  const getTimelinePosition = (time: string) => {
    const date = new Date(time);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const percentage = (totalMinutes / (24 * 60)) * 100;
    return percentage;
  };

  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    return (totalMinutes / (24 * 60)) * 100;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <CardTitle>금일 스케줄 타임라인</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (todaySchedules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <CardTitle>금일 스케줄 타임라인</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            오늘 예정된 스케줄이 없습니다
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
            <Calendar className="w-5 h-5" />
            <CardTitle>금일 스케줄 타임라인</CardTitle>
          </div>
          <Badge variant="secondary">{todaySchedules.length}개 예정</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 시간축 */}
        <div className="relative h-24 bg-gray-50 rounded-lg p-4">
          {/* 시간 눈금 */}
          <div className="absolute top-0 left-0 right-0 flex justify-between px-4 pt-2 text-xs text-gray-500">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>

          {/* 타임라인 바 */}
          <div className="absolute top-8 left-4 right-4 h-2 bg-gray-200 rounded-full">
            {/* 현재 시간 마커 */}
            <div
              className="absolute top-0 h-2 w-1 bg-red-500 rounded-full"
              style={{ left: `${getCurrentTimePosition()}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            </div>

            {/* 스케줄 마커 */}
            {todaySchedules.map((schedule) => {
              const position = getTimelinePosition(schedule.start_datetime);
              const isActive = isCurrentlyActive(schedule);

              return (
                <div
                  key={schedule.id}
                  className="absolute top-0 h-2 group"
                  style={{ left: `${position}%` }}
                >
                  <div
                    className={`w-3 h-3 -mt-0.5 rounded-full border-2 border-white ${
                      isActive ? 'bg-green-500 animate-pulse' : 'bg-blue-500'
                    }`}
                  />
                  
                  {/* 툴팁 */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {formatTime(schedule.start_datetime)} - {schedule.template?.title}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 스케줄 목록 */}
        <div className="space-y-2">
          {todaySchedules.map((schedule) => {
            const isActive = isCurrentlyActive(schedule);

            return (
              <div
                key={schedule.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isActive ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Clock className={`w-4 h-4 ${isActive ? 'text-green-600' : 'text-gray-600'}`} />
                  <span className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-gray-900'}`}>
                    {formatTime(schedule.start_datetime)}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{schedule.name}</span>
                    {isActive && (
                      <Badge className="bg-green-500">송출 중</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{schedule.template?.title}</p>
                </div>

                {getContentTypeBadge(schedule.template?.category)}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
