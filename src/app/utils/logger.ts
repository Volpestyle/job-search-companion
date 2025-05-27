/**
 * Logger utility for consistent logging across the application
 */

// Log levels enum - single source of truth
// Note: Stagehand expects numeric levels, but our logger uses string levels
// We'll map between them as needed
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// Map our log levels to Stagehand's numeric levels
// Based on run.ts line 80: 0=error, 1=info, anything else=debug
export const LOG_LEVEL_TO_NUMERIC: Record<LogLevel, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2, // Stagehand treats this as debug
  [LogLevel.DEBUG]: 2, // Stagehand treats this as debug
};

export interface LogProgress {
  step: string;
  message: string;
  percentage?: number;
  sessionId?: string;
}

// Get log level from environment or default to 'info'
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Colors for different log levels (for server-side console)
const COLORS = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m', // Reset
};

/**
 * Checks if the given log level should be displayed based on the configured level
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeData(data: any): any {
  if (!data) return data;

  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credentials', 'apiKey'];

  if (typeof data === 'object') {
    const sanitized = { ...data };
    for (const key in sanitized) {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeData(sanitized[key]);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Log a message at the specified level
 */
function log(level: LogLevel, message: string, meta?: any): void {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  // Add color in server environment
  const formattedPrefix =
    typeof window === 'undefined' ? `${COLORS[level]}${prefix}${COLORS.reset}` : prefix;

  const logMessage = `${formattedPrefix} ${message}`;
  const sanitizedMeta = meta ? sanitizeData(meta) : undefined;

  switch (level) {
    case 'debug':
      console.debug(logMessage, sanitizedMeta || '');
      break;
    case 'info':
      console.info(logMessage, sanitizedMeta || '');
      break;
    case 'warn':
      console.warn(logMessage, sanitizedMeta || '');
      break;
    case 'error':
      console.error(logMessage, sanitizedMeta || '');
      break;
  }
}

// Export logger functions
export const logger = {
  debug: (message: string, meta?: any) => log(LogLevel.DEBUG, message, meta),
  info: (message: string, meta?: any) => log(LogLevel.INFO, message, meta),
  warn: (message: string, meta?: any) => log(LogLevel.WARN, message, meta),
  error: (message: string, meta?: any) => log(LogLevel.ERROR, message, meta),

  // Progress logging for UI updates
  progress: (step: string, message: string, percentage?: number, sessionId?: string) => {
    const progress: LogProgress = { step, message, percentage, sessionId };
    log(LogLevel.INFO, `[PROGRESS] ${step}: ${message}`, { progress, percentage });

    // Send to SSE endpoint if we're on the server and have a sessionId
    if (typeof window === 'undefined' && sessionId) {
      // Use process.nextTick to avoid blocking
      process.nextTick(() => {
        // Dynamic import to avoid client-side bundling
        import('../api/progress/route')
          .then(({ sendProgressUpdate }) => {
            sendProgressUpdate(sessionId, { step, message, percentage });
          })
          .catch(() => {
            // Ignore errors if SSE is not available
          });
      });
    }
  },

  // Timer utility for performance tracking
  startTimer: (label: string) => {
    const start = Date.now();
    return {
      end: (metadata?: any) => {
        const duration = Date.now() - start;
        log(LogLevel.INFO, `[TIMER] ${label} completed in ${duration}ms`, {
          ...metadata,
          duration_ms: duration,
        });
      },
    };
  },
};
