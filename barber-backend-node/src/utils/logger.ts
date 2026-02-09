// Logger utility for consistent logging across the backend
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  error?: string;
  stack?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(entry: LogEntry) {
    const prefix = `[${entry.timestamp}] [${entry.level}]`;
    const context = entry.context ? ` [${entry.context}]` : '';
    const message = `${prefix}${context} ${entry.message}`;

    const output = {
      ...entry,
      timestamp: new Date(entry.timestamp).toISOString()
    };

    // Always log to console
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message, entry.data || '', entry.stack || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.log(message, entry.data || '');
        break;
      case LogLevel.DEBUG:
        if (this.isDevelopment) console.debug(message, entry.data || '');
        break;
    }

    // In production, you would send to log aggregation service (Logtail, Papertrail, etc.)
    if (process.env.LOG_LEVEL === 'verbose' || entry.level === LogLevel.ERROR) {
      this.sendToLoggingService(output);
    }
  }

  private sendToLoggingService(entry: LogEntry) {
    // TODO: Send to Logtail, Papertrail, or Datadog
    // Example for Logtail:
    // fetch('https://in.logtail.com/', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(entry)
    // }).catch(() => {});
  }

  debug(message: string, data?: unknown, context?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      context,
      data
    });
  }

  info(message: string, data?: unknown, context?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      context,
      data
    });
  }

  warn(message: string, data?: unknown, context?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      context,
      data
    });
  }

  error(message: string, error?: Error | unknown, context?: string) {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack
    } : error;

    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      context,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      data: errorData
    });
  }
}

export const logger = new Logger();
