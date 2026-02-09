// Frontend logging utility for development and production
export enum FrontendLogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface FrontendLogEntry {
  timestamp: string;
  level: FrontendLogLevel;
  message: string;
  context?: string;
  data?: unknown;
  url?: string;
  userAgent?: string;
}

class FrontendLogger {
  private isDevelopment = import.meta.env.DEV;
  private logs: FrontendLogEntry[] = [];
  private maxLogs = 100;

  private log(entry: FrontendLogEntry) {
    // Store in memory (first 100 logs)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const prefix = `[${entry.level}]`;
    const context = entry.context ? ` [${entry.context}]` : '';
    const message = `${prefix}${context} ${entry.message}`;

    // Console output with styling
    const styles = {
      [FrontendLogLevel.DEBUG]: 'color: #999; font-style: italic;',
      [FrontendLogLevel.INFO]: 'color: #0066cc; font-weight: bold;',
      [FrontendLogLevel.WARN]: 'color: #ff9900; font-weight: bold;',
      [FrontendLogLevel.ERROR]: 'color: #cc0000; font-weight: bold;'
    };

    console.log(`%c${message}`, styles[entry.level], entry.data || '');

    // Send errors to backend for tracking
    if (entry.level === FrontendLogLevel.ERROR) {
      this.sendToBackend(entry);
    }

    // Store in localStorage (for debugging)
    this.storeInLocalStorage(entry);
  }

  private sendToBackend(entry: FrontendLogEntry) {
    try {
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'https://barber-hcv8.onrender.com';
      fetch(`${backendUrl}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entry,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      }).catch(() => {
        // Silently fail - don't break the app if logging fails
      });
    } catch (error) {
      // Ignore errors in logging
    }
  }

  private storeInLocalStorage(entry: FrontendLogEntry) {
    try {
      const logs = JSON.parse(localStorage.getItem('app-logs') || '[]');
      logs.push({
        ...entry,
        timestamp: new Date().toISOString()
      });
      // Keep only last 50 logs in localStorage
      if (logs.length > 50) logs.shift();
      localStorage.setItem('app-logs', JSON.stringify(logs));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  debug(message: string, data?: unknown, context?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      level: FrontendLogLevel.DEBUG,
      message,
      context,
      data
    });
  }

  info(message: string, data?: unknown, context?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      level: FrontendLogLevel.INFO,
      message,
      context,
      data
    });
  }

  warn(message: string, data?: unknown, context?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      level: FrontendLogLevel.WARN,
      message,
      context,
      data
    });
  }

  error(message: string, error?: Error | unknown, context?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      level: FrontendLogLevel.ERROR,
      message,
      context,
      data: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
  }

  // Export logs for debugging
  exportLogs() {
    return this.logs;
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    localStorage.removeItem('app-logs');
  }

  // Get logs from localStorage
  getStoredLogs() {
    try {
      return JSON.parse(localStorage.getItem('app-logs') || '[]');
    } catch {
      return [];
    }
  }
}

export const frontendLogger = new FrontendLogger();

// Global error handler
window.addEventListener('error', (event) => {
  frontendLogger.error(
    `Uncaught error: ${event.message}`,
    new Error(event.message),
    'GLOBAL_ERROR'
  );
});

// Global unhandled promise rejection
window.addEventListener('unhandledrejection', (event) => {
  frontendLogger.error(
    `Unhandled promise rejection`,
    event.reason,
    'UNHANDLED_REJECTION'
  );
});
