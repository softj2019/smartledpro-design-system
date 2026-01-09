// ================================================================
// Login Component
// ================================================================

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Button } from '@softj/smartledpro-design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@softj/smartledpro-design-system';
import { Input } from '@softj/smartledpro-design-system';
import { Label } from '@softj/smartledpro-design-system';
import { Alert, AlertDescription } from '@softj/smartledpro-design-system';
import { Loader2, UserPlus, Users, Lock, Eye, Shield } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { logger } from '../lib/debug-logger';

// 개발 모드 확인 (환경변수 또는 localhost 체크)
const isDevelopment = 
  import.meta.env.DEV || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

const TEST_ACCOUNTS = [
  {
    role: 'ADMIN',
    email: 'admin@goyang.go.kr',
    password: 'Admin1234!',
    name: '관리자',
    icon: Shield,
    description: '모든 권한 + 긴급 메시지',
    color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100',
  },
  {
    role: 'OPERATOR',
    email: 'operator@goyang.go.kr',
    password: 'Operator1234!',
    name: '운영자',
    icon: Users,
    description: '콘텐츠 관리 및 송출',
    color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    role: 'VIEWER',
    email: 'viewer@goyang.go.kr',
    password: 'Viewer1234!',
    name: '조회자',
    icon: Eye,
    description: '읽기 전용',
    color: 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100',
  },
];

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [showTestAccounts, setShowTestAccounts] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      const from = location.state?.from?.pathname || '/';
      navigate(from);
      logger.success('Login', 'Login successful', { email });
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.');
      logger.error('Login', 'Login failed', { email, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(account: typeof TEST_ACCOUNTS[0]) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
    setLoading(true);

    try {
      await signIn(account.email, account.password);
      const from = location.state?.from?.pathname || '/';
      navigate(from);
      logger.success('Login', `Quick login as ${account.role}`, { email: account.email });
    } catch (err: any) {
      // 계정이 없으면 자동으로 생성 시도
      if (err.message.includes('Invalid login credentials')) {
        setLoading(false);
        setError('계정이 존재하지 않습니다. "테스트 계정 자동 생성" 버튼을 먼저 클릭하세요.');
        logger.warn('Login', 'Account not found, setup required', { email: account.email });
      } else {
        setError(err.message || '로그인에 실패했습니다.');
        logger.error('Login', 'Quick login failed', { email: account.email, error: err.message });
        setLoading(false);
      }
    }
  }

  async function handleSetupTestUsers() {
    setSetupLoading(true);
    setError(null);
    setSetupSuccess(false);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/setup-test-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      
      logger.info('Setup', 'Setup test users response', { data, status: response.status });

      if (data.success) {
        setSetupSuccess(true);
        logger.success('Setup', 'Test accounts created successfully');
      } else {
        const errorMsg = data.error || data.message || '계정 생성에 실패했습니다.';
        const details = data.details ? ` (상세: ${data.details})` : '';
        setError(errorMsg + details);
        logger.error('Setup', 'Failed to create test accounts', data);
      }
    } catch (err: any) {
      logger.error('Setup', 'Fetch error', { error: err.message });
      setError('서버 연결에 실패했습니다: ' + err.message);
    } finally {
      setSetupLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Login Form */}
          <Card className="shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">전광판 관리 시스템</CardTitle>
              <CardDescription>
                고양 스마트시티 리빙랩 실증사업
              </CardDescription>
            </CardHeader>
            <CardContent>
              {setupSuccess && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">
                    ✅ 테스트 계정이 생성되었습니다! 우측에서 빠른 로그인을 사용하세요.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@goyang.go.kr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      로그인 중...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      로그인
                    </>
                  )}
                </Button>
              </form>

              {isDevelopment && (
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleSetupTestUsers}
                    disabled={setupLoading || setupSuccess}
                  >
                    {setupLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        계정 생성 중...
                      </>
                    ) : setupSuccess ? (
                      <>
                        ✅ 계정 생성 완료
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        테스트 계정 자동 생성
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* 모바일용 빠른 로그인 (lg 이하에서만 표시) */}
              {isDevelopment && (
                <div className="lg:hidden mt-6 pt-6 border-t border-dashed border-yellow-300">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="h-4 w-4 text-yellow-600" />
                      빠른 로그인
                      <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        개발 전용
                      </span>
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      테스트 계정으로 즉시 로그인할 수 있습니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {TEST_ACCOUNTS.map((account) => {
                      const Icon = account.icon;
                      return (
                        <button
                          key={account.role}
                          type="button"
                          onClick={() => handleQuickLogin(account)}
                          disabled={loading}
                          className={`w-full p-3 rounded-lg border-2 transition-all text-left ${account.color} ${
                            loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{account.name}</span>
                                <span className="text-xs px-1.5 py-0.5 bg-white/60 rounded">
                                  {account.role}
                                </span>
                              </div>
                              <p className="text-xs opacity-80 mb-1">
                                {account.description}
                              </p>
                              <div className="text-xs font-mono opacity-70 truncate">
                                {account.email}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 bg-white/60 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">공통 비밀번호 형식:</span>
                      <span className="font-mono font-bold text-purple-700">
                        [역할]1234!
                      </span>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded p-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-700">ADMIN:</span>
                        <span className="font-mono font-semibold text-gray-900">Admin1234!</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">OPERATOR:</span>
                        <span className="font-mono font-semibold text-gray-900">Operator1234!</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">VIEWER:</span>
                        <span className="font-mono font-semibold text-gray-900">Viewer1234!</span>
                      </div>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-gray-600">권한 체계:</span>
                      <span className="font-medium text-gray-800">
                        ADMIN &gt; OPERATOR &gt; VIEWER
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">인증 정보</p>
                  {isDevelopment && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      개발 모드
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded">
                  <p>✓ JWT 기반 인증 (Access Token + Refresh Token)</p>
                  <p>✓ 액세스 토큰 만료: 1시간 (자동 갱신)</p>
                  <p>✓ 리프레시 토큰 만료: 60일</p>
                  <p>✓ 세션 자동 연장 활성화</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Test Accounts Quick Login (개발 모드에서만 표시) */}
          {isDevelopment && (
            <Card className="shadow-lg border-2 border-dashed border-yellow-300 bg-yellow-50/30">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users className="h-5 w-5 text-yellow-600" />
                  빠른 로그인
                  <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-normal">
                    개발 전용
                  </span>
                </CardTitle>
                <CardDescription>
                  테스트 계정으로 즉시 로그인할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {TEST_ACCOUNTS.map((account) => {
                  const Icon = account.icon;
                  return (
                    <button
                      key={account.role}
                      type="button"
                      onClick={() => handleQuickLogin(account)}
                      disabled={loading}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${account.color} ${
                        loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{account.name}</span>
                            <span className="text-xs px-2 py-0.5 bg-white/60 rounded">
                              {account.role}
                            </span>
                          </div>
                          <p className="text-xs opacity-80 mb-2">
                            {account.description}
                          </p>
                          <div className="text-xs font-mono opacity-70">
                            {account.email}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                <div className="pt-4 border-t border-yellow-300/50">
                  <p className="text-xs text-gray-600 mb-3">
                    💡 계정이 없다면 먼저 "테스트 계정 자동 생성"을 클릭하세요.
                  </p>
                  
                  <div className="bg-white/60 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">공통 비밀번호 형식:</span>
                      <span className="font-mono font-bold text-purple-700 text-sm">
                        [역할]1234!
                      </span>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded p-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-700">ADMIN:</span>
                        <span className="font-mono font-semibold text-gray-900">Admin1234!</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">OPERATOR:</span>
                        <span className="font-mono font-semibold text-gray-900">Operator1234!</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">VIEWER:</span>
                        <span className="font-mono font-semibold text-gray-900">Viewer1234!</span>
                      </div>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-gray-600">권한 체계:</span>
                      <span className="font-medium text-gray-800">
                        ADMIN &gt; OPERATOR &gt; VIEWER
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 프로덕션 모드에서는 일반 안내만 표시 */}
          {!isDevelopment && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">시스템 안내</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600 space-y-3">
                  <p>
                    전광판 관리 시스템은 고양시 스마트시티 리빙랩 실증사업의 일환으로
                    체육공원 전광판의 콘텐츠를 효율적으로 관리하고 송출합니다.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-blue-900">주요 기능</p>
                    <ul className="text-blue-800 space-y-1 ml-4 list-disc">
                      <li>템플릿 기반 메시지 관리</li>
                      <li>우선순위별 자동 송출</li>
                      <li>실시간 날씨 정보 연동</li>
                      <li>일정 기반 스케줄링</li>
                      <li>완전한 감사 로그</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-gray-900 mb-2">보안</p>
                    <ul className="text-gray-700 space-y-1 text-xs">
                      <li>✓ JWT 기반 토큰 인증</li>
                      <li>✓ 역할 기반 접근 제어 (RBAC)</li>
                      <li>✓ 세션 자동 갱신</li>
                      <li>✓ 모든 작업 감사 로그 기록</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}