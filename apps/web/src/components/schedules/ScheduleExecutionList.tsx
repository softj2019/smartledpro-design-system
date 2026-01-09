import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@softj/smartledpro-design-system';
import { Badge } from '@softj/smartledpro-design-system';
import type { ScheduleExecution } from '../../lib/types/schedule';

interface ScheduleExecutionListProps {
  executions: ScheduleExecution[];
}

export function ScheduleExecutionList({ executions }: ScheduleExecutionListProps) {
  // ✅ UTC 시간을 한국 시간(KST)으로 변환하여 표시
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Seoul', // ✅ 한국 시간대
    }).format(date);
  };

  if (executions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            실행 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            아직 실행 이력이 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          실행 이력
          <Badge variant="secondary" className="ml-2">
            {executions.length}건
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {executions.map((execution) => (
            <div
              key={execution.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
            >
              {execution.status === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">
                    {formatDateTime(execution.executed_at)}
                  </span>
                  <Badge
                    variant={execution.status === 'success' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {execution.status === 'success' ? '성공' : '실패'}
                  </Badge>
                </div>
                {execution.error_message && (
                  <p className="text-sm text-red-600 mt-1">
                    오류: {execution.error_message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}