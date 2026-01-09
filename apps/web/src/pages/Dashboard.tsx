// ================================================================
// Dashboard Page - 전광판 관리 시스템 현황
// ================================================================

import { useState, useEffect } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@softj/smartledpro-design-system";
import { Badge } from "@softj/smartledpro-design-system";
import { useAuth } from '../components/AuthProvider';
import { Activity, Monitor, FileText, Calendar, LayoutDashboard, TrendingUp, Clock, AlertCircle, Settings, Database } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalTemplates: number;
  activeTemplates: number;
  totalSchedules: number;
  activeSchedules: number;
  todayExecutions: number;
  currentDisplay: {
    template_name: string;
    content_type: string;
    expires_at: string | null;
  } | null;
  recentAuditLogs: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/dashboard/stats`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContentTypeBadge = (contentType: string) => {
    switch (contentType) {
      case 'EMERGENCY':
        return <Badge variant="destructive">긴급</Badge>;
      case 'NOTICE':
        return <Badge className="bg-blue-500">공지</Badge>;
      case 'WEATHER':
        return <Badge className="bg-green-500">날씨</Badge>;
      default:
        return <Badge variant="secondary">{contentType}</Badge>;
    }
  };

  const formatTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return '무제한';
    
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return '만료됨';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}일 ${diffHours % 24}시간`;
    if (diffHours > 0) return `${diffHours}시간 ${diffMinutes % 60}분`;
    return `${diffMinutes}분`;
  };

  const statCards = [
    {
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      label: '전체 템플릿',
      value: loading ? '-' : stats?.totalTemplates.toString() || '0',
      description: `등록된 템플릿`,
      color: 'text-blue-600',
    },
    {
      icon: <Calendar className="h-5 w-5 text-purple-600" />,
      label: '스케줄',
      value: loading ? '-' : stats?.totalSchedules.toString() || '0',
      description: `활성: ${stats?.activeSchedules || 0}개`,
      color: 'text-purple-600',
    },
    {
      icon: <Activity className="h-5 w-5 text-orange-600" />,
      label: '금일 실행',
      value: loading ? '-' : stats?.todayExecutions.toString() || '0',
      description: '오늘 실행된 스케줄',
      color: 'text-orange-600',
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-green-600" />,
      label: '최근 활동',
      value: loading ? '-' : stats?.recentAuditLogs.toString() || '0',
      description: '최근 24시간',
      color: 'text-green-600',
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="대시보드"
        description="전광판 관리 시스템 현황을 한눈에 확인하세요"
        icon={<LayoutDashboard className="w-8 h-8" />}
        breadcrumbs={[
          { label: '대시보드' }
        ]}
      />

      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle>환영합니다, {user?.email}님!</CardTitle>
          <CardDescription>
            고양 스마트시티 리빙랩 전광판 관리 시스템
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{user?.role}</Badge>
            {user?.canEmergency && (
              <Badge variant="destructive">긴급 권한</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.label}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                현재 송출 중
              </CardTitle>
              <CardDescription>
                전광판에 현재 표시되고 있는 콘텐츠
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : stats?.currentDisplay ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-medium text-lg">
                  {stats.currentDisplay.template_name}
                </span>
                {getContentTypeBadge(stats.currentDisplay.content_type)}
              </div>
              {stats.currentDisplay.expires_at && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    남은 시간: {formatTimeRemaining(stats.currentDisplay.expires_at)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <AlertCircle className="w-5 h-5" />
              <span>현재 송출 중인 콘텐츠가 없습니다</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADMIN 전용: 중산 크롤러 및 시스템 설정 바로가기 */}
      {user?.role === 'ADMIN' && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              ADMIN 전용 메뉴
            </CardTitle>
            <CardDescription>
              관리자만 접근 가능한 시스템 설정 및 크롤링 기능
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              to="/admin-settings"
              className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">중산 경기 크롤링</div>
                  <div className="text-sm text-blue-700">고양시 인조잔디구장 경기 데이터 수집</div>
                </div>
              </div>
              <div className="text-blue-600">→</div>
            </Link>

            <Link
              to="/joongsan-matches"
              className="flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-900">수집된 경기 데이터 조회</div>
                  <div className="text-sm text-green-700">크롤링된 중산 경기 목록 보기</div>
                </div>
              </div>
              <div className="text-green-600">→</div>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Phase Progress */}
      <Card>
        <CardHeader>
          <CardTitle>개발 진행 상황</CardTitle>
          <CardDescription>
            전체 7개 Phase 중 Phase 5 완료
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <PhaseItem phase={1} title="기반 구축 & 인증" status="done" />
            <PhaseItem phase={2} title="Templates 관리" status="done" />
            <PhaseItem phase={3} title="송출 시스템" status="done" />
            <PhaseItem phase={4} title="Audit Logs" status="done" />
            <PhaseItem phase={5} title="Schedules 관리" status="done" />
            <PhaseItem phase={6} title="디버그 로그 시스템" status="pending" />
            <PhaseItem phase={7} title="최종 완성 & 문서화" status="pending" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface PhaseItemProps {
  phase: number;
  title: string;
  status: 'done' | 'progress' | 'pending';
}

function PhaseItem({ phase, title, status }: PhaseItemProps) {
  const getBadge = () => {
    switch (status) {
      case 'done':
        return <Badge className="bg-green-500">완료</Badge>;
      case 'progress':
        return <Badge className="bg-blue-500">진행 중</Badge>;
      case 'pending':
        return <Badge variant="secondary">대기</Badge>;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold">
          {phase}
        </div>
        <span className="font-medium">{title}</span>
      </div>
      {getBadge()}
    </div>
  );
}