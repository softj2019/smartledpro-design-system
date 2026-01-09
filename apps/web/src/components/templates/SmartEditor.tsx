// ================================================================
// SmartEditor - 전광판 전용 텍스트 에디터
// ================================================================

import { useRef, useState, useEffect } from 'react';
import { Button } from '@softj/smartledpro-design-system';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@softj/smartledpro-design-system';
import { Type, Palette, X, Plus, Minus, AlignLeft, AlignCenter, AlignRight, Bold } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '../../lib/debug-logger';

const PRESET_COLORS = [
  { value: '#FFD400', label: '노랑' },
  { value: '#FFFFFF', label: '흰색' },
  { value: '#FF0000', label: '빨강' },
  { value: '#00FF00', label: '초록' },
  { value: '#0099FF', label: '파랑' },
  { value: '#FF6600', label: '주황' },
  { value: '#FF00FF', label: '분홍' },
];

const PRESET_FONTS = [
  { value: 'DejaVu Sans', label: 'DejaVu Sans' },
  { value: 'Noto Sans CJK KR', label: 'Noto Sans CJK KR' },
  { value: 'NanumGothic', label: '나눔고딕' },
  { value: 'NanumSquare', label: '나눔스퀘어' },
  { value: 'NanumMyeongjo', label: '나눔명조' },
  { value: 'NanumBarunGothic', label: '나눔바른고딕' },
  { value: 'Liberation Sans', label: 'Liberation Sans' },
  { value: 'FreeSans', label: 'FreeSans' },
];

const PRESET_FONT_SIZES = [
  { value: '14', label: '14px' },
  { value: '16', label: '16px' },
  { value: '18', label: '18px' },
  { value: '20', label: '20px' },
  { value: '24', label: '24px' },
  { value: '28', label: '28px' },
  { value: '32', label: '32px' },
  { value: '36', label: '36px' },
  { value: '40', label: '40px' },
  { value: '48', label: '48px' },
  { value: '56', label: '56px' },
  { value: '64', label: '64px' },
];

const PRESET_FONT_WEIGHTS = [
  { value: '300', label: '얇게' },
  { value: '400', label: '보통' },
  { value: '500', label: '중간' },
  { value: '600', label: '약간 굵게' },
  { value: '700', label: '굵게' },
  { value: '800', label: '매우 굵게' },
  { value: '900', label: '가장 굵게' },
];

interface SmartEditorProps {
  value: string;
  onChange: (html: string) => void;
  backgroundColor?: string;
  placeholder?: string;
}

export function SmartEditor({ value, onChange, backgroundColor = '#000000', placeholder = '내용을 입력하세요...' }: SmartEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [customColor, setCustomColor] = useState('#FFD400');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 기본 스타일 상수
  const DEFAULT_COLOR = '#FFD400';
  const DEFAULT_FONT_SIZE = '16';
  const DEFAULT_FONT_FAMILY = 'NanumGothic';
  const DEFAULT_FONT_WEIGHT = '400';

  // 현재 선택된 스타일 state
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLOR);
  const [currentFontFamily, setCurrentFontFamily] = useState(DEFAULT_FONT_FAMILY);
  const [currentFontSize, setCurrentFontSize] = useState(DEFAULT_FONT_SIZE);
  const [currentTextAlign, setCurrentTextAlign] = useState('left');
  const [currentFontWeight, setCurrentFontWeight] = useState(DEFAULT_FONT_WEIGHT);

  // 현재 커서 위치의 스타일 감지
  const updateCurrentStyles = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement 
      : container as HTMLElement;

    if (!element) return;

    const computedStyle = window.getComputedStyle(element);
    
    // 색상 감지
    const color = computedStyle.color;
    const rgbToHex = (rgb: string) => {
      const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      if (!match) return DEFAULT_COLOR;
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    };
    
    if (color.startsWith('rgb')) {
      setCurrentColor(rgbToHex(color));
    } else if (color.startsWith('#')) {
      setCurrentColor(color.toUpperCase());
    }

    // 폰트 감지
    const fontFamily = computedStyle.fontFamily;
    // 폰트 패밀리에서 첫 번째 폰트 추출
    const firstFont = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    setCurrentFontFamily(firstFont);

    // 폰트 크기 감지 (px 단위 제거)
    const fontSize = parseInt(computedStyle.fontSize);
    setCurrentFontSize(fontSize.toString());

    // 정렬 감지
    const textAlign = computedStyle.textAlign || 'left';
    setCurrentTextAlign(textAlign);

    // 폰트 굵기 감지
    const fontWeight = computedStyle.fontWeight;
    setCurrentFontWeight(fontWeight);
  };

  // 스타일 적용 함수 (기존 HTML 구조 유지)
  const applyStyle = (styleName: 'color' | 'fontFamily' | 'fontSize' | 'textAlign' | 'fontWeight', styleValue: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast.error('먼저 텍스트를 선택해주세요.');
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    if (!selectedText || selectedText.trim().length === 0) {
      toast.error('먼저 텍스트를 선택해주세요.');
      return;
    }

    try {
      // 정렬은 블록 요소(div)로 감싸기, 나머지는 인라인 요소(span)로 감싸기
      const element = styleName === 'textAlign' 
        ? document.createElement('div') 
        : document.createElement('span');
      
      // 스타일 적용
      if (styleName === 'color') {
        element.style.color = styleValue;
      } else if (styleName === 'fontFamily') {
        element.style.fontFamily = styleValue;
      } else if (styleName === 'fontSize') {
        element.style.fontSize = `${styleValue}px`;
      } else if (styleName === 'textAlign') {
        element.style.textAlign = styleValue;
        element.style.display = 'block';
      } else if (styleName === 'fontWeight') {
        element.style.fontWeight = styleValue;
      }

      // 기존 내용을 추출 (HTML 구조 유지)
      const fragment = range.extractContents();
      element.appendChild(fragment);

      // 새 element 삽입
      range.insertNode(element);

      // 선택 해제
      selection.removeAllRanges();

      // 에디터 포커스 유지 및 업데이트
      if (editorRef.current) {
        const newHtml = editorRef.current.innerHTML;
        onChange(newHtml);
        
        // 포커스를 다시 설정
        setTimeout(() => {
          editorRef.current?.focus();
        }, 0);
      }

      // 성공 메시지
      const messages = {
        color: '색상 적용',
        fontFamily: '폰트 적용',
        fontSize: '크기 적용',
        textAlign: '정렬 적용',
        fontWeight: '굵기 적용',
      };
      toast.success(messages[styleName]);
    } catch (error) {
      toast.error('스타일 적용 중 오류가 발생했습니다.');
      logger.error('SmartEditor', 'Style apply failed', { error, styleName, styleValue });
    }
  };

  const handleColorSelect = (color: string) => {
    applyStyle('color', color);
    setColorPickerOpen(false);
  };

  const handleCustomColorApply = () => {
    applyStyle('color', customColor);
    setColorPickerOpen(false);
  };

  // 폰트 크기 증감
  const handleFontSizeChange = (increment: number) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast.error('먼저 텍스트를 선택해주세요.');
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    if (!selectedText || selectedText.trim().length === 0) {
      toast.error('먼저 텍스트를 선택해주세요.');
      return;
    }

    // 현재 폰트 크기 가져오기
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
    const currentFontSize = element ? parseInt(window.getComputedStyle(element).fontSize) : 18;
    
    // 새 폰트 크기 계산 (최소 12px, 최대 72px)
    const newFontSize = Math.max(12, Math.min(72, currentFontSize + increment));
    
    applyStyle('fontSize', newFontSize.toString());
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      // onChange를 즉시 호출하여 미리보기 업데이트
      onChange(editorRef.current.innerHTML);
    }
  };

  // 외부 클릭 시 색상 피커 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPickerOpen(false);
      }
    };

    if (colorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [colorPickerOpen]);

  // 초기값 설정 및 외부에서 value 변경 시 에디터 업데이트
  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      // 초기 로드 시에만 value 설정
      editorRef.current.innerHTML = value || '';
    }
  }, [value, isInitialized]);

  // 초기 스타일 설정
  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.style.color = DEFAULT_COLOR;
      editorRef.current.style.fontSize = `${DEFAULT_FONT_SIZE}px`;
      editorRef.current.style.fontFamily = DEFAULT_FONT_FAMILY;
      setIsInitialized(true);
    }
  }, [isInitialized]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-visible bg-white">
      {/* 툴바 */}
      <div className="border-b border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* 색상 선택 */}
          <div className="relative" ref={colorPickerRef}>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              className="gap-2 h-8"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setColorPickerOpen(!colorPickerOpen);
              }}
            >
              <Palette className="h-4 w-4" />
              <span className="text-xs">색상</span>
            </Button>

            {/* 색상 피커 드롭다운 */}
            {colorPickerOpen && (
              <div 
                className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-xl p-3 z-[9999]"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-gray-700">색상 선택</h4>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setColorPickerOpen(false);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">프리셋 색상</p>
                    <div className="grid grid-cols-7 gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleColorSelect(color.value);
                          }}
                          className="w-8 h-8 rounded border-2 border-gray-300 hover:border-blue-500 hover:scale-110 transition-all"
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">커스텀 색상</p>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => {
                          setCustomColor(e.target.value);
                        }}
                        className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => {
                          setCustomColor(e.target.value);
                        }}
                        placeholder="#FFD400"
                        className="flex-1 px-2 text-xs border border-gray-300 rounded"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          handleCustomColorApply();
                        }}
                        className="h-8 px-3 text-xs"
                      >
                        적용
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* 폰트 선택 */}
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-gray-600" />
            <Select value={currentFontFamily} onValueChange={(value) => applyStyle('fontFamily', value)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="폰트" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_FONTS.map((font) => (
                  <SelectItem key={font.value} value={font.value} className="text-xs">
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* 크기 선택 */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.preventDefault();
                handleFontSizeChange(-2);
              }}
              title="크기 줄이기"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <Select value={currentFontSize} onValueChange={(value) => applyStyle('fontSize', value)}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue placeholder="크기" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_FONT_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value} className="text-xs">
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.preventDefault();
                handleFontSizeChange(2);
              }}
              title="크기 키우기"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* 정렬 선택 */}
          <div className="flex items-center gap-2">
            <AlignLeft className="h-4 w-4 text-gray-600" />
            <Select value={currentTextAlign} onValueChange={(value) => applyStyle('textAlign', value)}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left" className="text-xs">
                  왼쪽 정렬
                </SelectItem>
                <SelectItem value="center" className="text-xs">
                  가운데 정렬
                </SelectItem>
                <SelectItem value="right" className="text-xs">
                  오른쪽 정렬
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* 굵기 선택 */}
          <div className="flex items-center gap-2">
            <Bold className="h-4 w-4 text-gray-600" />
            <Select value={currentFontWeight} onValueChange={(value) => applyStyle('fontWeight', value)}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue placeholder="굵기" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_FONT_WEIGHTS.map((weight) => (
                  <SelectItem key={weight.value} value={weight.value} className="text-xs">
                    {weight.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          💡 텍스트를 선택한 후 툴바에서 스타일을 적용하세요
        </p>
      </div>

      {/* 에디터 */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleEditorInput}
        onMouseUp={updateCurrentStyles}
        onKeyUp={updateCurrentStyles}
        onClick={updateCurrentStyles}
        className="min-h-[400px] p-4 outline-none"
        style={{
          backgroundColor: backgroundColor,
          color: DEFAULT_COLOR,
          fontSize: `${DEFAULT_FONT_SIZE}px`,
          fontWeight: 700,
          lineHeight: '1.6',
          fontFamily: DEFAULT_FONT_FAMILY,
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
        data-placeholder={placeholder}
      />

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgba(255, 212, 0, 0.4);
          pointer-events: none;
          position: absolute;
        }
      `}</style>
    </div>
  );
}