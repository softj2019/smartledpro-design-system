// ================================================================
// Main App Component with Router
// Version: 2024-12-22-02
// ================================================================

import { Dashboard } from './pages/Dashboard';
import { NotFound } from './pages/NotFound';
import { TemplateListPage } from './pages/templates/TemplateListPage';
import { TemplateFormPage } from './pages/templates/TemplateFormPage';
import DisplayView from './pages/DisplayView';
import ScheduleListPage from './pages/schedules/ScheduleListPage';
import ScheduleFormPage from './pages/schedules/ScheduleFormPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import PreviewStudio from './pages/PreviewStudio';
import AdminSettingsPage from './pages/AdminSettingsPage';
import { JoongsanMatchesPage } from './pages/JoongsanMatchesPage';
import DebugPanel from './pages/DebugPanel';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@softj/smartledpro-design-system";
import { AuthProvider, useAuth } from './components/AuthProvider';
import { ConfirmDialog } from './lib/hooks/useConfirm';
import { Login } from './components/Login';
import { SupabaseTest } from './components/SupabaseTest';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useScheduleExecutor } from './lib/hooks/useScheduleExecutor';
import { useMatchScheduleSync } from './lib/hooks/useMatchScheduleSync';
import { useAutoCrawler } from './lib/hooks/useAutoCrawler';
import { useServerScheduleMonitor } from './lib/hooks/useServerScheduleMonitor';
import { HelpManual } from './components/HelpManual';

// Placeholder pages (will be implemented in later phases)
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-gray-600">이 페이지는 다음 Phase에서 구현됩니다.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  
  // ❌ 제거: 서버가 이미 3초마다 체크하므로 중복
  // useScheduleExecutor();

  // 매치 스케줄 동기화 시스템 (로그인 시에만 작동)
  useMatchScheduleSync();

  // 자동 크롤러 시스템 (로그인 시에만 작동)
  useAutoCrawler();

  // 서버 스케줄 모니터링 시스템 (로그인 시에만 작동)
  useServerScheduleMonitor();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">시스템을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />

        {/* Test Route */}
        <Route
          path="/test"
          element={
            <ProtectedRoute>
              <SupabaseTest />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes with Layout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Dashboard />} />

          {/* Templates - Phase 2 */}
          <Route path="/templates" element={<TemplateListPage />} />
          <Route
            path="/templates/new"
            element={
              <ProtectedRoute requiredRole="OPERATOR">
                <TemplateFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates/:id"
            element={
              <ProtectedRoute requiredRole="OPERATOR">
                <TemplateFormPage />
              </ProtectedRoute>
            }
          />

          {/* Preview Studio - Phase 4 */}
          <Route
            path="/studio"
            element={
              <ProtectedRoute requiredRole="OPERATOR">
                <PreviewStudio />
              </ProtectedRoute>
            }
          />

          {/* Schedules - Phase 5 */}
          <Route
            path="/schedules"
            element={
              <ProtectedRoute requiredRole="OPERATOR">
                <ScheduleListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedules/new"
            element={
              <ProtectedRoute requiredRole="OPERATOR">
                <ScheduleFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedules/edit/:id"
            element={
              <ProtectedRoute requiredRole="OPERATOR">
                <ScheduleFormPage />
              </ProtectedRoute>
            }
          />

          {/* Audit Logs - Phase 7 */}
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute requiredRole="OPERATOR">
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Settings - Phase 8 */}
          <Route
            path="/admin-settings"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Joongsan Matches - Phase 9 */}
          <Route
            path="/joongsan-matches"
            element={
              <ProtectedRoute requiredRole="OPERATOR">
                <JoongsanMatchesPage />
              </ProtectedRoute>
            }
          />

          {/* Debug Panel - Phase 10 */}
          <Route
            path="/debug-panel"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <DebugPanel />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Display View Page - 전광판 표시 화면 (Public, 인증 불필요) */}
        <Route path="/display/view" element={<DisplayView />} />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Global Components */}
      <Toaster richColors position="top-right" />
      <ConfirmDialog />
      <HelpManual />
    </>
  );
}