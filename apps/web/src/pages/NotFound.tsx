// ================================================================
// 404 Not Found Page
// ================================================================

import { useNavigate } from 'react-router-dom';
import { Button } from "@softj/smartledpro-design-system";
import { Home, ArrowLeft } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-8xl font-bold text-gray-300">404</div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">페이지를 찾을 수 없습니다</h1>
          <p className="text-gray-600">
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            이전 페이지
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            홈으로 가기
          </Button>
        </div>
      </div>
    </div>
  );
}
