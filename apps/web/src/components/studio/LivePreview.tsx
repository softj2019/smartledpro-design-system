// ================================================================
// Live Preview - 실시간 미리보기 (640x360 비율 유지, 축소)
// ================================================================

import { Monitor } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@softj/smartledpro-design-system';

interface Template {
  id: string;
  name: string;
  title: string;
  body: string;
  highlight?: string;
  style_config?: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: string;
    fontWeight?: string;
    textAlign?: string;
    fontFamily?: string;
  };
}

interface LivePreviewProps {
  template: Template | null;
}

export function LivePreview({ template }: LivePreviewProps) {
  const styleConfig = template?.style_config || {};
  const backgroundColor = styleConfig.backgroundColor || '#1e3a8a';
  const textColor = styleConfig.textColor || '#ffffff';
  const fontSize = styleConfig.fontSize || '21px';
  const fontWeight = styleConfig.fontWeight || '700';
  const textAlign = styleConfig.textAlign || 'center';
  const fontFamily = styleConfig.fontFamily || 'Arial, Helvetica, sans-serif';

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Monitor className="w-5 h-5 text-blue-600" />
          실시간 미리보기
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 미리보기 프레임 - 430x260 비율 유지하면서 컨테이너에 맞게 */}
        <div className="flex flex-col items-center justify-center">
          {/* 실제 콘텐츠 영역 (430:260 비율) */}
          <div
            style={{
              width: '100%',
              maxWidth: '600px',
              aspectRatio: '430 / 260',
              backgroundColor: backgroundColor,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
              justifyContent: 'center',
              padding: '24px',
              overflow: 'hidden',
            }}
          >
            {template ? (
              <>
                {template.title && (
                  <div
                    style={{
                      fontSize: fontSize,
                      fontWeight: fontWeight,
                      color: textColor,
                      textAlign: textAlign as any,
                      fontFamily: fontFamily,
                      marginBottom: '8px',
                      width: '100%',
                    }}
                    dangerouslySetInnerHTML={{ __html: template.title }}
                  />
                )}
                {template.body && (
                  <div
                    style={{
                      fontSize: '14px',
                      color: textColor,
                      textAlign: textAlign as any,
                      fontFamily: fontFamily,
                      lineHeight: '1.4',
                      width: '100%',
                    }}
                    dangerouslySetInnerHTML={{ __html: template.body }}
                  />
                )}
                {template.highlight && (
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#fbbf24',
                      textAlign: textAlign as any,
                      fontFamily: fontFamily,
                      marginTop: '8px',
                      width: '100%',
                    }}
                    dangerouslySetInnerHTML={{ __html: template.highlight }}
                  />
                )}
              </>
            ) : (
              <div
                style={{
                  fontSize: '18px',
                  color: '#9ca3af',
                  textAlign: 'center',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                템플릿을 선택하면
                <br />
                여기에 미리보기가 표시됩니다
              </div>
            )}
          </div>

          {/* 미리보기 안내 */}
          {template && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                현재 선택: <strong className="text-blue-600">{template.name}</strong>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}