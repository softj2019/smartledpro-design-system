// ================================================================
// Sidebar Component
// ================================================================

import { NavLink } from 'react-router-dom';
import { usePermissions } from '../../lib/hooks/usePermissions';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  FileBarChart,
  Radio,
  Settings,
  X,
  Database,
  Bug,
} from 'lucide-react';
import { Button } from '@softj/smartledpro-design-system';
import { ScrollArea } from '@softj/smartledpro-design-system';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  minRole?: 'ADMIN' | 'OPERATOR' | 'VIEWER';
}

const navItems: NavItem[] = [
  {
    to: '/',
    icon: <LayoutDashboard className="h-5 w-5" />,
    label: '대시보드',
    minRole: 'VIEWER',
  },
  {
    to: '/templates',
    icon: <FileText className="h-5 w-5" />,
    label: '템플릿 관리',
    minRole: 'VIEWER',
  },
  {
    to: '/studio',
    icon: <Radio className="h-5 w-5" />,
    label: '스튜디오',
    minRole: 'OPERATOR',
  },
  {
    to: '/schedules',
    icon: <Calendar className="h-5 w-5" />,
    label: '스케줄 관리',
    minRole: 'OPERATOR',
  },
  {
    to: '/audit-logs',
    icon: <FileBarChart className="h-5 w-5" />,
    label: '로그관리',
    minRole: 'VIEWER',
  },
  {
    to: '/joongsan-matches',
    icon: <Database className="h-5 w-5" />,
    label: '대관정보',
    minRole: 'OPERATOR',
  },
  {
    to: '/admin-settings',
    icon: <Settings className="h-5 w-5" />,
    label: '시스템 설정',
    minRole: 'ADMIN',
  },
  {
    to: '/debug-panel',
    icon: <Bug className="h-5 w-5" />,
    label: '디버그 패널',
    minRole: 'ADMIN',
  },
];

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const permissions = usePermissions();

  const filteredItems = navItems.filter((item) => {
    if (!item.minRole) return true;
    return permissions.hasMinRole(item.minRole);
  });

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-64 border-r bg-white transition-transform md:translate-x-0 flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo Section - 헤더와 동일한 높이 */}
        <div className="h-16 px-4 flex items-center border-b shrink-0">
          <div className="flex items-center gap-3 w-full">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
              고
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight truncate">전광판 관리 시스템</h1>
              <p className="text-xs text-gray-600 leading-tight">고양 스마트시티 리빙랩</p>
            </div>
          </div>
        </div>

        {/* Navigation Section - 스크롤 가능 영역 */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-2 p-4">
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between mb-2 md:hidden">
              <h2 className="text-lg font-semibold">메뉴</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation Items */}
            <nav className="space-y-1">
              {filteredItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    )
                  }
                  onClick={() => onClose?.()}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </ScrollArea>

        {/* Info Section - 하단 고정 */}
        <div className="border-t bg-gray-50 px-4 py-3 shrink-0">
          <div className="px-3 py-2 text-xs text-gray-500">
            <p className="font-semibold mb-1">시스템 정보</p>
            <p>버전: v2.0.0</p>
            <p>빌드: 2024-12-24</p>
          </div>
        </div>
      </aside>
    </>
  );
}