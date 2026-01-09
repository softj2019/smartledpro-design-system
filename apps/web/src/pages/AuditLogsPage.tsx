// ================================================================
// Audit Logs Page - 시스템 감사 로그 조회
// ================================================================

import { useState, useEffect } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card } from "@softj/smartledpro-design-system";
import { Button } from "@softj/smartledpro-design-system";
import { Input } from "@softj/smartledpro-design-system";
import { useAuth } from '../components/AuthProvider';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { FileText, Search, Filter, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { TableSkeleton, CardSkeleton } from "@softj/smartledpro-design-system";
import { logger } from '../lib/debug-logger';

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  action_detail: any;
  created_at: string;
}

interface AuditLogStats {
  total_24h: number;
  by_action: Record<string, number>;
  by_resource_type: Record<string, number>;
}

export function AuditLogsPage() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterResourceType, setFilterResourceType] = useState('all');
  const [limit, setLimit] = useState(100);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    if (!session) {
      logger.error('AuditLogs', 'No session found');
      return;
    }

    try {
      setLoading(true);
      logger.info('AuditLogs', 'Fetching audit logs...', { page, limit, filterAction, filterResourceType });

      // Build query params
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', ((page - 1) * limit).toString());
      
      if (filterAction !== 'all') {
        params.append('action', filterAction);
      }
      if (filterResourceType !== 'all') {
        params.append('resource_type', filterResourceType);
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/audit-logs?${params.toString()}`;
      logger.info('AuditLogs', 'API URL', { url });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      logger.info('AuditLogs', 'API Response', { status: response.status, data });

      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${JSON.stringify(data)}`);
      }

      logger.success('AuditLogs', 'Loaded logs', { count: data.logs?.length || 0, firstLog: data.logs?.[0] });
      setLogs(data.logs || []);
      setTotalCount(data.total_count || 0);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('AuditLogs', 'Failed to fetch logs', { error: err.message });
      alert(`Audit Logs 로딩 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    if (!session) return;

    try {
      logger.info('AuditLogs', 'Fetching statistics...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/audit-logs/stats`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      logger.success('AuditLogs', 'Statistics loaded', { stats: data.stats });
      setStats(data.stats);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('AuditLogs', 'Failed to fetch statistics', { error: err.message });
    }
  };

  useEffect(() => {
    logger.info('AuditLogs', 'useEffect triggered', { 
      hasSession: !!session, 
      sessionId: session?.user?.id,
      filterAction, 
      filterResourceType, 
      limit,
      page
    });
    
    if (!session) {
      logger.info('AuditLogs', 'Waiting for session...');
      return;
    }
    
    logger.info('AuditLogs', 'Session found, fetching data...');
    fetchAuditLogs();
    fetchStats();
  }, [session, filterAction, filterResourceType, limit, page]);

  // 필터 변경 시 페이지를 1로 리셋
  useEffect(() => {
    setPage(1);
  }, [filterAction, filterResourceType, limit]);

  // Debug: Log state changes
  useEffect(() => {
    logger.info('AuditLogs', 'State updated', {
      logsCount: logs.length,
      filteredLogsCount: filteredLogs.length,
      loading,
      searchQuery,
      filterAction,
      filterResourceType,
    });
  }, [logs, loading]);

  // Filter logs by search query
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      (log.user_email || '').toLowerCase().includes(searchLower) ||
      (log.action || '').toLowerCase().includes(searchLower) ||
      (log.resource_type || '').toLowerCase().includes(searchLower) ||
      (log.resource_id || '').toLowerCase().includes(searchLower) ||
      (typeof log.action_detail === 'string' ? log.action_detail : JSON.stringify(log.action_detail)).toLowerCase().includes(searchLower)
    );
  });

  // Action 한글 이름
  const getActionName = (action: string) => {
    const map: Record<string, string> = {
      'CREATE': '생성',
      'UPDATE': '수정',
      'DELETE': '삭제',
      'EXECUTE': '실행',
      'SCHEDULE_ACTIVATE': '활성화',
      'SCHEDULE_DEACTIVATE': '비활성화',
      'DISPLAY_SEND': '전광판 전송',
      'ROTATION_CREATED': '순차반복 생성',
      'ROTATION_SWITCHED': '순차반복 전환',
      'ROTATION_STOPPED': '순차반복 중지',
      'ROTATION_DELETED': '순차반복 삭제',
    };
    return map[action] || action;
  };

  // Resource Type 한글 이름
  const getResourceTypeName = (type: string) => {
    const map: Record<string, string> = {
      'TEMPLATE': '템플릿',
      'SCHEDULE': '스케줄',
      'DISPLAY': '전광판',
      'DISPLAY_SETTINGS': '전광판 설정',
      'ROTATION': '순차반복',
    };
    return map[type] || type;
  };

  // Action 색상
  const getActionColor = (action: string) => {
    const map: Record<string, string> = {
      'CREATE': 'text-green-600 bg-green-50',
      'UPDATE': 'text-blue-600 bg-blue-50',
      'DELETE': 'text-red-600 bg-red-50',
      'EXECUTE': 'text-purple-600 bg-purple-50',
      'SCHEDULE_ACTIVATE': 'text-emerald-600 bg-emerald-50',
      'SCHEDULE_DEACTIVATE': 'text-gray-600 bg-gray-50',
      'DISPLAY_SEND': 'text-orange-600 bg-orange-50',
      'ROTATION_CREATED': 'text-indigo-600 bg-indigo-50',
      'ROTATION_SWITCHED': 'text-violet-600 bg-violet-50',
      'ROTATION_STOPPED': 'text-pink-600 bg-pink-50',
      'ROTATION_DELETED': 'text-red-600 bg-red-50',
    };
    return map[action] || 'text-gray-600 bg-gray-50';
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['시간', '사용자', '역할', '작업', '리소스 타입', '리소스 ID', '상세'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString('ko-KR'),
      log.user_email,
      log.user_role,
      getActionName(log.action),
      getResourceTypeName(log.resource_type),
      log.resource_id || '-',
      JSON.stringify(log.action_detail),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Create test data
  const createTestData = async () => {
    if (!session) return;

    if (!confirm('테스트 로그 6개를 생성하시겠습니까?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/audit-logs/test-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create test data');
      }

      alert(data.message);
      fetchAuditLogs();
      fetchStats();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      alert(`테스트 데이터 생성 실패: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="로그관리"
        description="시스템 작업 이력을 확인하세요"
        icon={<FileText className="w-8 h-8" />}
        breadcrumbs={[
          { label: '로그관리' }
        ]}
        actions={
          <>
            <Button onClick={createTestData} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              테스트 데이터 생성
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              CSV 내보내기
            </Button>
          </>
        }
      />

      {/* Statistics Cards - 데스크탑에서만 표시 */}
      {stats && (
        <div className="hidden md:grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-600">최근 24시간</div>
            <div className="text-2xl font-bold mt-1">{stats.total_24h}</div>
            <div className="text-xs text-gray-500 mt-1">총 작업 수</div>
          </Card>

          {Object.entries(stats.by_action).slice(0, 3).map(([action, count]) => (
            <Card key={action} className="p-4">
              <div className="text-sm text-gray-600 truncate">{getActionName(action)}</div>
              <div className="text-2xl font-bold mt-1">{count}</div>
              <div className="text-xs text-gray-500 mt-1">24시간</div>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 작업</option>
              <option value="CREATE">생성</option>
              <option value="UPDATE">수정</option>
              <option value="DELETE">삭제</option>
              <option value="EXECUTE">실행</option>
              <option value="DISPLAY_SEND">전광판 전송</option>
            </select>
          </div>

          {/* Resource Type Filter */}
          <div>
            <select
              value={filterResourceType}
              onChange={(e) => setFilterResourceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 리소스</option>
              <option value="TEMPLATE">템플릿</option>
              <option value="SCHEDULE">스케줄</option>
              <option value="DISPLAY">전광판</option>
              <option value="DISPLAY_SETTINGS">전광판 설정</option>
              <option value="ROTATION">순차반복</option>
            </select>
          </div>

          {/* Limit */}
          <div>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={50}>최근 50개</option>
              <option value={100}>최근 100개</option>
              <option value={200}>최근 200개</option>
              <option value={500}>최근 500개</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={10} columns={5} />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mb-4 text-gray-400" />
              <p>로그가 없습니다.</p>
              <Button 
                onClick={fetchAuditLogs} 
                variant="outline" 
                size="sm" 
                className="mt-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                새로고침
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    시간
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    작업
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    리소스
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    상세
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div>{new Date(log.created_at).toLocaleDateString('ko-KR')}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleTimeString('ko-KR')}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.user_email}</div>
                      <div className="text-xs text-gray-500">{log.user_role}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {getActionName(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getResourceTypeName(log.resource_type)}</div>
                      <div className="text-xs text-gray-500 font-mono">{log.resource_id || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800">
                          상세 보기
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-w-md">
                          {JSON.stringify(log.action_detail, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Results Summary */}
      <div className="text-sm text-gray-600 text-center">
        총 {filteredLogs.length}개의 로그 표시 중
        {searchQuery && ` (검색어: "${searchQuery}")`}
      </div>

      {/* Pagination */}
      {!searchQuery && totalCount > limit && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              전체 {totalCount}개 중 {(page - 1) * limit + 1}-{Math.min(page * limit, totalCount)}번째 표시
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
                size="sm"
              >
                이전
              </Button>
              <div className="flex items-center gap-2 px-4 text-sm">
                {page} / {Math.ceil(totalCount / limit)}
              </div>
              <Button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(totalCount / limit)}
                variant="outline"
                size="sm"
              >
                다음
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}