// ================================================================
// Permissions Hook
// ================================================================

import { useAuth } from '../../components/AuthProvider';
import type { UserRole } from '../types';

export function usePermissions() {
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'ADMIN';
  const isOperator = user?.role === 'OPERATOR' || user?.role === 'ADMIN';
  const isViewer = user?.role === 'VIEWER';
  
  return {
    // 역할 확인
    isAdmin,
    isOperator,
    isViewer,
    
    // 권한 확인
    canEmergency: user?.canEmergency === true,
    canCreate: user?.role !== 'VIEWER',
    canUpdate: user?.role !== 'VIEWER',
    canDelete: user?.role === 'ADMIN',
    canEdit: user?.role !== 'VIEWER', // Templates에서 사용하는 canEdit 추가
    canView: true, // 모든 사용자가 조회 가능
    
    // 특정 역할 필요 여부 확인
    hasRole: (role: UserRole) => {
      if (!user) return false;
      
      // ADMIN은 모든 권한 보유
      if (user.role === 'ADMIN') return true;
      
      // OPERATOR는 VIEWER 권한도 보유
      if (user.role === 'OPERATOR' && role === 'VIEWER') return true;
      
      return user.role === role;
    },
    
    // 최소 역할 필요 여부 확인
    hasMinRole: (minRole: UserRole) => {
      if (!user) return false;
      
      const roleHierarchy: Record<UserRole, number> = {
        'ADMIN': 3,
        'OPERATOR': 2,
        'VIEWER': 1,
      };
      
      return roleHierarchy[user.role] >= roleHierarchy[minRole];
    },
  };
}