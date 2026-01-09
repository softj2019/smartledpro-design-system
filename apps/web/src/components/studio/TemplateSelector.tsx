// ================================================================
// Template Selector - 템플릿 선택 패널 (다중 선택 지원)
// ================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@softj/smartledpro-design-system';
import { Input } from '@softj/smartledpro-design-system';
import { Badge } from '@softj/smartledpro-design-system';
import { Button } from '@softj/smartledpro-design-system';
import { Alert, AlertDescription } from '@softj/smartledpro-design-system';
import { Search, FileText, AlertCircle, RefreshCw, List, CheckSquare, Radio } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Checkbox } from '@softj/smartledpro-design-system';

interface Template {
  id: string;
  name: string;
  category: string;
  title: string;
  body: string;
  highlight?: string;
  style_config?: any;
}

interface TemplateSelectorProps {
  selectedTemplate: Template | null;
  onSelectTemplate: (template: Template) => void;
  onTemplatesLoaded?: (templates: Template[]) => void;
  // 다중 선택 모드
  multiSelectMode?: boolean;
  selectedTemplates?: Template[];
  onMultiSelectChange?: (templates: Template[]) => void;
  // 현재 송출 중인 템플릿 ID (순차 반복용)
  broadcastingTemplateId?: string | null;
}

interface FetchError {
  type: 'network' | 'auth' | 'server' | 'unknown';
  message: string;
  statusCode?: number;
  details?: string;
}

export function TemplateSelector({ 
  selectedTemplate, 
  onSelectTemplate, 
  onTemplatesLoaded,
  multiSelectMode = false,
  selectedTemplates = [],
  onMultiSelectChange,
  broadcastingTemplateId
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FetchError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const accessToken = localStorage.getItem('access_token');
      
      if (!accessToken) {
        setError({
          type: 'auth',
          message: '인증 토큰이 없습니다',
          details: '다시 로그인해주세요.',
        });
        setLoading(false);
        return;
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f/templates`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          setError({
            type: 'auth',
            message: '인증 실패 (401)',
            statusCode: 401,
            details: errorData.error || '로그인이 만료되었습니다. 다시 로그인해주세요.',
          });
        } else if (response.status === 403) {
          setError({
            type: 'auth',
            message: '권한 없음 (403)',
            statusCode: 403,
            details: errorData.error || '템플릿 조회 권한이 없습니다.',
          });
        } else if (response.status === 404) {
          setError({
            type: 'server',
            message: 'API 엔드포인트를 찾을 수 없음 (404)',
            statusCode: 404,
            details: 'API 경로가 올바르지 않습니다.',
          });
        } else if (response.status >= 500) {
          setError({
            type: 'server',
            message: `서버 오류 (${response.status})`,
            statusCode: response.status,
            details: errorData.error || '서버에 일시적인 문제가 발생했습니다.',
          });
        } else {
          setError({
            type: 'server',
            message: `요청 실패 (${response.status})`,
            statusCode: response.status,
            details: errorData.error || '알 수 없는 오류가 발생했습니다.',
          });
        }
        
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      if (!data.templates || !Array.isArray(data.templates)) {
        setError({
          type: 'server',
          message: '잘못된 응답 형식',
          details: 'templates 배열을 찾을 수 없습니다.',
        });
        setLoading(false);
        return;
      }

      const loadedTemplates = data.templates;
      setTemplates(loadedTemplates);
      setRetryCount(0);
      
      if (onTemplatesLoaded) {
        onTemplatesLoaded(loadedTemplates);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError({
          type: 'network',
          message: '네트워크 연결 실패',
          details: '인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.',
        });
      } else {
        setError({
          type: 'unknown',
          message: '예상치 못한 오류',
          details: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchTemplates();
  };

  // 다중 선택 토글
  const handleMultiSelectToggle = (template: Template) => {
    if (!onMultiSelectChange) return;

    const isSelected = selectedTemplates.some(t => t.id === template.id);
    
    if (isSelected) {
      onMultiSelectChange(selectedTemplates.filter(t => t.id !== template.id));
    } else {
      onMultiSelectChange([...selectedTemplates, template]);
    }
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryBadge = (category: string) => {
    const upper = category?.toUpperCase();
    if (upper === 'EMERGENCY') return <Badge variant="destructive">긴급</Badge>;
    if (upper === 'WEATHER') return <Badge className="bg-green-500">날씨</Badge>;
    return <Badge variant="secondary">공지</Badge>;
  };

  const getErrorIcon = (type: FetchError['type']) => {
    return <AlertCircle className="w-4 h-4" />;
  };

  const getErrorVariant = (type: FetchError['type']): 'default' | 'destructive' => {
    if (type === 'auth') return 'destructive';
    return 'default';
  };

  return (
    <Card className="h-full shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {multiSelectMode ? (
            <>
              <CheckSquare className="w-5 h-5 text-purple-600" />
              템플릿 다중 선택
            </>
          ) : (
            <>
              <FileText className="w-5 h-5 text-blue-600" />
              템플릿 선택
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 에러 표시 */}
        {error && (
          <Alert variant={getErrorVariant(error.type)} className="mb-4">
            {getErrorIcon(error.type)}
            <AlertDescription>
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>{error.message}</strong>
                  {error.statusCode && <span className="ml-2 text-xs opacity-75">(코드: {error.statusCode})</span>}
                </div>
                {error.details && (
                  <div className="text-xs opacity-90">{error.details}</div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    className="gap-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    다시 시도 {retryCount > 0 && `(${retryCount})`}
                  </Button>
                  {error.type === 'auth' && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => window.location.href = '/login'}
                    >
                      로그인 페이지로
                    </Button>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="템플릿 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            disabled={loading || !!error}
          />
        </div>

        {/* 템플릿 카운트 */}
        {!loading && !error && (
          <div className="text-xs text-gray-500 flex items-center justify-between px-1">
            <span>총 {filteredTemplates.length}개</span>
            {multiSelectMode && (
              <span className="text-purple-600 font-semibold">
                {selectedTemplates.length}개 선택됨
              </span>
            )}
            {searchQuery && <span className="text-blue-600">검색 결과</span>}
          </div>
        )}

        {/* 템플릿 리스트 */}
        <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">템플릿을 불러올 수 없습니다</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">검색 결과가 없습니다</p>
              <p className="text-xs mt-1">다른 검색어를 입력해보세요</p>
            </div>
          ) : (
            filteredTemplates.map((template) => {
              const isSelected = multiSelectMode 
                ? selectedTemplates.some(t => t.id === template.id)
                : selectedTemplate?.id === template.id;
              
              const isBroadcasting = broadcastingTemplateId === template.id;

              return (
                <div
                  key={template.id}
                  onClick={() => {
                    if (multiSelectMode) {
                      handleMultiSelectToggle(template);
                    } else {
                      onSelectTemplate(template);
                    }
                  }}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all hover:shadow-lg group cursor-pointer relative ${
                    isBroadcasting
                      ? 'border-green-500 ring-2 ring-green-500 bg-white shadow-md'
                      : isSelected
                        ? multiSelectMode
                          ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 shadow-md'
                          : 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  {/* 송출 중 배지 (우측 상단) */}
                  {isBroadcasting && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-green-500 text-white border-green-600">
                        송출 중
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    {/* 다중 선택 체크박스 */}
                    {multiSelectMode && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleMultiSelectToggle(template)}
                        className="mt-1"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className={`font-semibold line-clamp-1 ${
                          isSelected 
                            ? multiSelectMode ? 'text-purple-900' : 'text-blue-900' 
                            : 'text-gray-900'
                        }`}>
                          {template.name}
                        </span>
                        {getCategoryBadge(template.category)}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {template.highlight || template.title}
                      </p>
                      {isSelected && !isBroadcasting && (
                        <div className="mt-2 pt-2 border-t border-purple-200">
                          <div className={`flex items-center gap-1 text-xs ${
                            multiSelectMode ? 'text-purple-700' : 'text-blue-700'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                              multiSelectMode ? 'bg-purple-500' : 'bg-blue-500'
                            }`}></div>
                            선택됨
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}