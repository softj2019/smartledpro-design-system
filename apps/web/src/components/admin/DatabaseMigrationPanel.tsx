// ================================================================
// Database Migration Panel - KV Store → PostgreSQL
// ================================================================

import { useState } from 'react';
import { Database, AlertTriangle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@softj/smartledpro-design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@softj/smartledpro-design-system';
import { Alert, AlertDescription } from '@softj/smartledpro-design-system';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAuth } from '../AuthProvider';
import { supabase } from '../../lib/supabase';

interface MigrationResult {
  success: boolean;
  message: string;
  migrated?: number;
  skipped?: number;
  deleted?: string[];
  errors?: string[];
}

// Audit log 생성 헬퍼
async function createAuditLog(data: {
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  action_detail: Record<string, any>;
}) {
  try {
    await supabase.from('audit_logs').insert({
      ...data,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Silent fail for audit logs
  }
}

export function DatabaseMigrationPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [cleanupResult, setCleanupResult] = useState<MigrationResult | null>(null);

  const handleMigrateRotations = async () => {
    if (!user) return;

    setLoading(true);
    setMigrationResult(null);

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('Access token not found');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/migration/rotation-to-postgres`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Migration failed');
      }

      const result = await response.json();
      setMigrationResult(result);

      // Audit log 기록
      await createAuditLog({
        user_id: user.id,
        user_email: user.email || '',
        user_role: user.role || 'VIEWER',
        action: 'MIGRATION_EXECUTE',
        resource_type: 'DATABASE',
        resource_id: null,
        action_detail: {
          migration_type: 'rotation_to_postgres',
          result: result,
        },
      });

    } catch (error) {
      setMigrationResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupKV = async () => {
    if (!user) return;

    setLoading(true);
    setCleanupResult(null);

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('Access token not found');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/migration/cleanup-kv-duplicates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Cleanup failed');
      }

      const result = await response.json();
      setCleanupResult(result);

      // Audit log 기록
      await createAuditLog({
        user_id: user.id,
        user_email: user.email || '',
        user_role: user.role || 'VIEWER',
        action: 'MIGRATION_CLEANUP',
        resource_type: 'DATABASE',
        resource_id: null,
        action_detail: {
          cleanup_type: 'kv_duplicates',
          result: result,
        },
      });

    } catch (error) {
      setCleanupResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setLoading(false);
    }
  };

  const userRole = user?.role || 'VIEWER';
  const isAdmin = userRole === 'ADMIN';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-600" />
          <CardTitle>데이터베이스 마이그레이션</CardTitle>
        </div>
        <CardDescription>
          KV Store → PostgreSQL 마이그레이션 (ADMIN 전용)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 디버그 정보 */}
        {user && (
          <div className="bg-gray-100 border border-gray-300 rounded p-3 text-xs space-y-1">
            <p><strong>Debug Info:</strong></p>
            <p>Email: {user.email}</p>
            <p>Role: {user.role}</p>
            <p>Is Admin: {isAdmin ? 'YES ✅' : 'NO ❌'}</p>
          </div>
        )}

        {!isAdmin && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              이 기능은 ADMIN 권한이 필요합니다.
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Rotation 마이그레이션 */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Step 1: Rotation 데이터 마이그레이션</h4>
              <p className="text-sm text-gray-600">
                KV Store의 rotation_broadcast:* 데이터를 PostgreSQL로 이동합니다.
              </p>
            </div>
            <Button
              onClick={handleMigrateRotations}
              disabled={!isAdmin || loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  실행 중...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  마이그레이션 실행
                </>
              )}
            </Button>
          </div>

          {migrationResult && (
            <Alert variant={migrationResult.success ? 'default' : 'destructive'}>
              {migrationResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{migrationResult.message}</p>
                  {migrationResult.migrated !== undefined && (
                    <div className="text-sm space-y-1">
                      <p>✅ 마이그레이션: {migrationResult.migrated}개</p>
                      <p>⏭️ 건너뜀: {migrationResult.skipped}개</p>
                      {migrationResult.errors && migrationResult.errors.length > 0 && (
                        <p className="text-red-600">❌ 에러: {migrationResult.errors.length}개</p>
                      )}
                    </div>
                  )}
                  {migrationResult.errors && migrationResult.errors.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium">에러 상세</summary>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        {migrationResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Step 2: KV Store 정리 */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Step 2: KV Store 중복 데이터 정리</h4>
              <p className="text-sm text-gray-600">
                PostgreSQL로 이동한 데이터와 중복된 KV Store 데이터를 삭제합니다.
              </p>
            </div>
            <Button
              onClick={handleCleanupKV}
              disabled={!isAdmin || loading || !migrationResult?.success}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  실행 중...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  정리 실행
                </>
              )}
            </Button>
          </div>

          {cleanupResult && (
            <Alert variant={cleanupResult.success ? 'default' : 'destructive'}>
              {cleanupResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{cleanupResult.message}</p>
                  {cleanupResult.deleted && (
                    <div className="text-sm">
                      <p>🗑️ 삭제된 항목: {cleanupResult.deleted.length}개</p>
                      {cleanupResult.deleted.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium">삭제 목록</summary>
                          <ul className="mt-2 space-y-1 list-disc list-inside max-h-40 overflow-y-auto">
                            {cleanupResult.deleted.slice(0, 20).map((key, idx) => (
                              <li key={idx} className="text-xs">{key}</li>
                            ))}
                            {cleanupResult.deleted.length > 20 && (
                              <li className="text-xs text-gray-500">
                                ... 외 {cleanupResult.deleted.length - 20}개
                              </li>
                            )}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                  {cleanupResult.errors && cleanupResult.errors.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium">에러 상세</summary>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        {cleanupResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* 가이드 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-blue-900">📋 마이그레이션 가이드</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Step 1을 먼저 실행하여 rotation 데이터를 마이그레이션합니다.</li>
            <li>마이그레이션 성공 후 Step 2로 중복 데이터를 정리합니다.</li>
            <li>모든 작업은 audit_logs에 기록됩니다.</li>
            <li>문제 발생 시 /MIGRATION_GUIDE.md를 참고하세요.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}