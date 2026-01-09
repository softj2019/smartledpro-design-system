// ================================================================
// Header Component
// ================================================================

import { useAuth } from '../AuthProvider';
import { Button } from '@softj/smartledpro-design-system';
import { Badge } from '@softj/smartledpro-design-system';
import { LogOut, User, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white md:pl-64">
      <div className="flex h-16 items-center px-3 sm:px-4 gap-2 sm:gap-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile Logo */}
        <div className="flex items-center gap-2 md:hidden min-w-0">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
            고
          </div>
          <div className="min-w-0 hidden min-[400px]:block">
            <h1 className="text-sm font-bold leading-none truncate">전광판 관리</h1>
            <p className="text-xs text-gray-600 truncate">고양 스마트시티</p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* User Info */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Desktop User Info */}
            <div className="hidden md:flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <div className="text-sm">
                <p className="font-medium leading-none truncate max-w-[200px]">{user.email}</p>
                <div className="mt-1 flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs h-5">
                    {user.role}
                  </Badge>
                  {user.canEmergency && (
                    <Badge variant="destructive" className="text-xs h-5">
                      긴급권한
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile User Badge */}
            <div className="md:hidden">
              <Badge variant="secondary" className="text-xs px-2 py-1">
                {user.role}
              </Badge>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="gap-2 shrink-0"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}