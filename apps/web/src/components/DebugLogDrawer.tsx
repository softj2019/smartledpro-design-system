// ================================================================
// Debug Log Drawer - 디버그 로그 드로어
// ================================================================
// 타입별 필터, 검색, JSON copy 기능 포함
// 화면 우측에서 슬라이드되는 드로어 형태

import { useState, useEffect } from 'react';
import { X, Search, Copy, Filter, Download, Trash2, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { logger, getDebugLogs, clearDebugLogs, type LogEntry } from '../lib/debug-logger';
import { toast } from 'sonner';

interface DebugLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DebugLogDrawer({ isOpen, onClose }: DebugLogDrawerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warn' | 'info' | 'success' | 'debug'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  // 로그 주기적 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      const allLogs = getDebugLogs();
      setLogs(allLogs);
    }, 500); // 0.5초마다 업데이트

    return () => clearInterval(interval);
  }, []);

  // 초기 로드
  useEffect(() => {
    if (isOpen) {
      const allLogs = getDebugLogs();
      setLogs(allLogs);
    }
  }, [isOpen]);

  // 자동 스크롤
  useEffect(() => {
    if (autoScroll && isOpen) {
      const container = document.getElementById('debug-log-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [logs, autoScroll, isOpen]);

  // 필터링된 로그
  const filteredLogs = logs.filter(log => {
    // Level 필터
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    
    // Category 필터
    if (filterCategory !== 'all' && log.category !== filterCategory) return false;
    
    // 검색어 필터
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const messageMatch = log.message.toLowerCase().includes(search);
      const categoryMatch = log.category.toLowerCase().includes(search);
      const dataMatch = log.data ? JSON.stringify(log.data).toLowerCase().includes(search) : false;
      
      if (!messageMatch && !categoryMatch && !dataMatch) return false;
    }
    
    return true;
  });

  // 카테고리 목록 추출
  const categories = Array.from(new Set(logs.map(log => log.category)));

  // JSON 복사 (Fallback 포함)
  const copyToClipboard = (text: string) => {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          toast.success('클립보드에 복사되었습니다');
        })
        .catch(() => {
          // Fallback to legacy method
          fallbackCopyTextToClipboard(text);
        });
    } else {
      // Fallback to legacy method
      fallbackCopyTextToClipboard(text);
    }
  };

  // Fallback 복사 방법
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success('클립보드에 복사되었습니다');
      } else {
        toast.error('복사에 실패했습니다');
      }
    } catch (err) {
      toast.error('복사에 실패했습니다');
    }
    
    document.body.removeChild(textArea);
  };

  // 모든 로그 다운로드
  const downloadLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `debug-logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredLogs.length}개의 로그가 다운로드되었습니다`);
  };

  // 로그 초기화
  const handleClearLogs = () => {
    clearDebugLogs();
    setLogs([]);
    toast.success('모든 디버그 로그가 삭제되었습니다.');
  };

  // Level 아이콘
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warn': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  // Level 색상
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warn': return 'bg-yellow-50 border-yellow-200';
      case 'success': return 'bg-green-50 border-green-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-30 flex flex-col border-l transform transition-transform duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <h2 className="text-lg">디버그 로그</h2>
          <span className="px-2 py-1 text-xs bg-gray-200 rounded">
            {filteredLogs.length} / {logs.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b bg-gray-50 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Level filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as any)}
            className="px-3 py-1.5 text-sm border rounded-lg bg-white"
          >
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="debug">Debug</option>
          </select>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-lg bg-white"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Auto scroll toggle */}
          <label className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg bg-white cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Auto Scroll</span>
          </label>

          {/* Actions */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => copyToClipboard(JSON.stringify(filteredLogs, null, 2))}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              title="Copy all logs as JSON"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={downloadLogs}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              title="Download logs as JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearLogs}
              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600"
              title="Clear all logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div 
        id="debug-log-container"
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No logs found</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getLevelColor(log.level)}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getLevelIcon(log.level)}
                  <span className="text-xs text-gray-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      fractionalSecondDigits: 3,
                    })}
                  </span>
                  <span className="px-2 py-0.5 text-xs bg-white rounded border">
                    {log.category}
                  </span>
                </div>
                {log.data && (
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(log.data, null, 2))}
                    className="p-1 hover:bg-white rounded transition-colors flex-shrink-0"
                    title="Copy data as JSON"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Message */}
              <div className="text-sm mb-2">{log.message}</div>

              {/* Data */}
              {log.data && (
                <div className="text-xs font-mono bg-white p-2 rounded border overflow-x-auto">
                  <pre>{JSON.stringify(log.data, null, 2)}</pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}