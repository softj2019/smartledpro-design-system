// ================================================================
// Supabase Connection Test Component
// ================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@softj/smartledpro-design-system';
import { Badge } from '@softj/smartledpro-design-system';
import { Button } from '@softj/smartledpro-design-system';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'loading' | 'success' | 'error';
  message?: string;
  data?: any;
}

export function SupabaseTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Supabase 연결', status: 'loading' },
    { name: '테이블 조회 (displays)', status: 'loading' },
    { name: '측정소 데이터 (weather_stations)', status: 'loading' },
    { name: '뷰 조회 (v_current_display_content)', status: 'loading' },
  ]);

  useEffect(() => {
    runTests();
  }, []);

  async function runTests() {
    // Test 1: Supabase 연결 확인
    await updateTest(0, async () => {
      const { data, error } = await supabase.from('displays').select('count');
      if (error) throw error;
      return { message: '연결 성공', data: null };
    });

    // Test 2: displays 테이블 조회
    await updateTest(1, async () => {
      const { data, error } = await supabase
        .from('displays')
        .select('id, name, location, is_active')
        .limit(5);
      
      if (error) throw error;
      return { 
        message: `${data?.length || 0}개 전광판 조회 성공`, 
        data 
      };
    });

    // Test 3: weather_stations 테이블 조회
    await updateTest(2, async () => {
      const { data, error } = await supabase
        .from('weather_stations')
        .select('id, name, region')
        .limit(5);
      
      if (error) throw error;
      return { 
        message: `${data?.length || 0}개 측정소 조회 성공`, 
        data 
      };
    });

    // Test 4: 뷰 조회
    await updateTest(3, async () => {
      const { data, error } = await supabase
        .from('v_current_display_content')
        .select('*')
        .limit(3);
      
      if (error) throw error;
      return { 
        message: `${data?.length || 0}개 현재 송출 콘텐츠 조회 성공`, 
        data 
      };
    });
  }

  async function updateTest(
    index: number, 
    testFn: () => Promise<{ message: string; data: any }>
  ) {
    try {
      const result = await testFn();
      setTests(prev => {
        const newTests = [...prev];
        newTests[index] = {
          ...newTests[index],
          status: 'success',
          message: result.message,
          data: result.data,
        };
        return newTests;
      });
    } catch (error: any) {
      setTests(prev => {
        const newTests = [...prev];
        newTests[index] = {
          ...newTests[index],
          status: 'error',
          message: error.message || '알 수 없는 오류',
        };
        return newTests;
      });
    }
  }

  function getStatusIcon(status: TestResult['status']) {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  }

  function getStatusBadge(status: TestResult['status']) {
    switch (status) {
      case 'loading':
        return <Badge variant="secondary">테스트 중</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">성공</Badge>;
      case 'error':
        return <Badge variant="destructive">실패</Badge>;
    }
  }

  const allSuccess = tests.every(t => t.status === 'success');
  const anyError = tests.some(t => t.status === 'error');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Supabase 연결 테스트</h1>
          <p className="text-gray-600">
            데이터베이스 연결 및 테이블 조회를 테스트합니다.
          </p>
        </div>

        {allSuccess && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">
                    모든 테스트 통과! ✓
                  </p>
                  <p className="text-sm text-green-700">
                    Supabase 연결이 정상적으로 작동합니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {anyError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">일부 테스트 실패</p>
                  <p className="text-sm text-red-700">
                    환경 변수 설정 및 마이그레이션을 확인하세요.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {tests.map((test, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <CardTitle className="text-lg">{test.name}</CardTitle>
                      {test.message && (
                        <CardDescription className="mt-1">
                          {test.message}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(test.status)}
                </div>
              </CardHeader>

              {test.data && test.data.length > 0 && (
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      조회된 데이터:
                    </p>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(test.data, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6">
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              테스트 다시 실행
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>환경 변수 확인</CardTitle>
            <CardDescription>
              다음 환경 변수가 설정되어 있는지 확인하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {import.meta.env.VITE_SUPABASE_URL ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>VITE_SUPABASE_URL: </span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {import.meta.env.VITE_SUPABASE_URL || '설정되지 않음'}
                </code>
              </div>
              <div className="flex items-center gap-2">
                {import.meta.env.VITE_SUPABASE_ANON_KEY ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>VITE_SUPABASE_ANON_KEY: </span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {import.meta.env.VITE_SUPABASE_ANON_KEY 
                    ? `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` 
                    : '설정되지 않음'}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-sm text-gray-500 text-center">
          <p>문제가 발생하면 SUPABASE_SETUP.md를 참고하세요.</p>
        </div>
      </div>
    </div>
  );
}
