// ================================================================
// Protected Route Component
// ================================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { usePermissions } from '../lib/hooks/usePermissions';
import type { UserRole } from '../lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requireEmergency?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requireEmergency = false,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const permissions = usePermissions();

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 역할 확인
  if (requiredRole && !permissions.hasMinRole(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-6xl">🔒</div>
          <h1 className="text-2xl font-bold">접근 권한 없음</h1>
          <p className="text-gray-600">
            이 페이지에 접근하려면 <strong>{requiredRole}</strong> 권한이
            필요합니다.
          </p>
          <p className="text-sm text-gray-500">
            현재 권한: <strong>{user.role}</strong>
          </p>
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:underline"
          >
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 긴급 권한 확인
  if (requireEmergency && !permissions.canEmergency) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-6xl">🚨</div>
          <h1 className="text-2xl font-bold">긴급 권한 필요</h1>
          <p className="text-gray-600">
            이 기능을 사용하려면 <strong>긴급 송출 권한</strong>이 필요합니다.
          </p>
          <p className="text-sm text-gray-500">
            관리자에게 권한을 요청하세요.
          </p>
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:underline"
          >
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 권한이 있으면 렌더링
  return <>{children}</>;
}
