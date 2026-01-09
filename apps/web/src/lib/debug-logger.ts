// ================================================================
// Debug Logger - 전역 디버그 로깅 시스템
// ================================================================

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();
  private maxLogs = 500; // 최대 로그 개수

  log(level: LogLevel, category: string, message: string, data?: any) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      category,
      message,
      data,
    };

    this.logs.unshift(entry); // 최신 로그를 앞에 추가

    // 최대 개수 초과 시 오래된 로그 제거
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // 리스너들에게 알림
    this.notifyListeners();
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data);
  }

  success(category: string, message: string, data?: any) {
    this.log('success', category, message, data);
  }

  debug(category: string, message: string, data?: any) {
    this.log('debug', category, message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }
}

// 싱글톤 인스턴스
export const logger = new DebugLogger();

// 헬퍼 함수들
export function addLog(level: LogLevel, category: string, message: string, data?: any) {
  logger.log(level, category, message, data);
}

export function logInfo(category: string, message: string, data?: any) {
  logger.info(category, message, data);
}

export function logWarn(category: string, message: string, data?: any) {
  logger.warn(category, message, data);
}

export function logError(category: string, message: string, data?: any) {
  logger.error(category, message, data);
}

export function logSuccess(category: string, message: string, data?: any) {
  logger.success(category, message, data);
}

export function logDebug(category: string, message: string, data?: any) {
  logger.debug(category, message, data);
}

export function getDebugLogs(): LogEntry[] {
  return logger.getLogs();
}

export function clearDebugLogs() {
  logger.clearLogs();
}

// 전역 window 객체에 추가 (개발 편의성)
if (typeof window !== 'undefined') {
  (window as any).debugLogger = logger;
}