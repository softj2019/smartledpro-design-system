import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@softj/smartledpro-design-system';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';

interface AdminPageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  backUrl?: string;
  stickyOnMobile?: boolean;
}

export function AdminPageHeader({
  icon,
  title,
  description,
  breadcrumbs,
  actions,
  backUrl,
  stickyOnMobile = false,
}: AdminPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={`mb-4 md:mb-8 ${stickyOnMobile ? 'md:static sticky top-16 bg-gray-50 z-30 -mx-4 px-4 pt-4 md:pt-0 md:mx-0 md:px-0' : ''}`}>
      {/* Breadcrumb */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} />
      )}

      {/* Back Button */}
      {backUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(backUrl)}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로 가기
        </Button>
      )}

      {/* Header - 모바일 & 데스크탑 모두 표시 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 md:gap-3">
          {icon && (
            <div className="text-blue-500 shrink-0">
              {icon}
            </div>
          )}
          <h1 className="text-xl md:text-3xl font-bold truncate">{title}</h1>
        </div>

        {/* Actions - 데스크탑에서만 표시 */}
        {actions && (
          <div className="hidden md:flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Mobile Actions - 모바일에서만 표시 */}
      {actions && (
        <div className="flex md:hidden items-center gap-2 mt-2 pb-3 border-b md:border-b-0">
          {actions}
        </div>
      )}

      {/* Description - 모바일에서는 작게, 데스크탑에서는 일반 크기 */}
      {description && (
        <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-0">
          {description}
        </p>
      )}
    </div>
  );
}