// ================================================================
// AirKorea API Helpers - Timeout & Retry with Exponential Backoff
// ================================================================

interface FetchWithRetryOptions {
  url: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelays?: number[]; // [400, 900] for exponential backoff
}

interface FetchResult {
  ok: boolean;
  status?: number;
  data?: any;
  reason?: string;
  elapsedMs: number;
}

// Fetch with timeout
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Fetch with retry and exponential backoff
export async function fetchWithRetry(options: FetchWithRetryOptions): Promise<FetchResult> {
  const {
    url,
    timeoutMs = 7000,
    maxRetries = 2,
    retryDelays = [400, 900],
  } = options;
  
  const startTime = Date.now();
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs);
      const elapsedMs = Date.now() - startTime;
      
      // 4xx errors - don't retry
      if (response.status >= 400 && response.status < 500) {
        return {
          ok: false,
          status: response.status,
          reason: `HTTP_${response.status}`,
          elapsedMs,
        };
      }
      
      // 5xx errors - retry
      if (response.status >= 500) {
        lastError = new Error(`HTTP_${response.status}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt] || 1000));
          continue;
        }
        return {
          ok: false,
          status: response.status,
          reason: `HTTP_${response.status}`,
          elapsedMs,
        };
      }
      
      // Success - parse JSON
      try {
        const data = await response.json();
        return {
          ok: true,
          status: response.status,
          data,
          elapsedMs,
        };
      } catch (parseError) {
        return {
          ok: false,
          status: response.status,
          reason: 'JSON_PARSE_FAIL',
          elapsedMs,
        };
      }
      
    } catch (error: any) {
      lastError = error;
      
      // Timeout or network error - retry
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt] || 1000));
        continue;
      }
      
      const elapsedMs = Date.now() - startTime;
      return {
        ok: false,
        reason: error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
        elapsedMs,
      };
    }
  }
  
  // Should not reach here
  const elapsedMs = Date.now() - startTime;
  return {
    ok: false,
    reason: 'MAX_RETRIES_EXCEEDED',
    elapsedMs,
  };
}

// Validate AirKorea response
export function validateAirKoreaResponse(data: any): { ok: boolean; reason?: string; items?: any[] } {
  // Check response structure
  if (!data.response) {
    return { ok: false, reason: 'INVALID_RESPONSE_STRUCTURE' };
  }
  
  const { header, body } = data.response;
  
  // Check result code
  if (header?.resultCode !== '00') {
    return { ok: false, reason: `RESULTCODE_${header?.resultCode || 'UNKNOWN'}` };
  }
  
  // Check items
  const items = body?.items;
  if (!items || items.length === 0) {
    return { ok: false, reason: 'NO_ITEMS' };
  }
  
  return { ok: true, items };
}

// Parse AirKorea dataTime to ISO timestamp
export function parseDataTime(dataTime: string): string | null {
  try {
    // dataTime format: "YYYY-MM-DD HH:mm"
    // Convert to ISO with +09:00 (KST)
    const [datePart, timePart] = dataTime.split(' ');
    if (!datePart || !timePart) return null;
    
    return `${datePart}T${timePart}:00+09:00`;
  } catch {
    return null;
  }
}

// Get latest item by dataTime
export function getLatestItem(items: any[]): any | null {
  if (!items || items.length === 0) return null;
  
  // Sort by dataTime descending
  const sorted = items.sort((a, b) => {
    const timeA = a.dataTime || '';
    const timeB = b.dataTime || '';
    return timeB.localeCompare(timeA);
  });
  
  return sorted[0];
}
