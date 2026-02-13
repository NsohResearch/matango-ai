import { Request, Response, NextFunction } from 'express';

/**
 * Structured Logging System
 * 
 * Provides JSON-formatted logs with request tracing for production observability.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: number;
  orgId?: number;
  path?: string;
  method?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  requestId?: string;
  userId?: number;
  orgId?: number;
  path?: string;
  method?: string;
  durationMs?: number;
  statusCode?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  [key: string]: any;
}

const SERVICE_NAME = 'matango-api';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format a log entry as JSON
 */
function formatLog(level: LogLevel, message: string, context: LogContext = {}): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    ...context,
  };
  
  return JSON.stringify(entry);
}

/**
 * Log a message with context
 */
export function log(level: LogLevel, message: string, context: LogContext = {}) {
  const output = formatLog(level, message, context);
  
  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      if (ENVIRONMENT === 'development') {
        console.debug(output);
      }
      break;
    default:
      console.log(output);
  }
}

/**
 * Convenience logging functions
 */
export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
  
  /**
   * Log an error with stack trace
   */
  exception: (error: Error, context?: LogContext) => {
    log('error', error.message, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  },
};

// Express Request type extensions are in server/_core/types/express.d.ts

/**
 * Request logging middleware
 * 
 * Adds request ID to all requests and logs request completion with timing.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Generate and attach request ID
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  req.requestId = requestId;
  req.startTime = Date.now();
  
  // Add request ID to response headers
  res.setHeader('X-Request-Id', requestId);
  
  // Log request start (debug level)
  logger.debug('Request started', {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  
  // Log request completion
  res.on('finish', () => {
    const durationMs = Date.now() - (req.startTime || Date.now());
    const user = (req as any).user;
    
    const logLevel: LogLevel = res.statusCode >= 500 ? 'error' : 
                               res.statusCode >= 400 ? 'warn' : 'info';
    
    log(logLevel, 'Request completed', {
      requestId,
      userId: user?.id,
      orgId: user?.organizationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
    });
  });
  
  next();
}

/**
 * Error logging middleware
 * 
 * Logs unhandled errors with full context.
 */
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  
  logger.exception(err, {
    requestId: req.requestId,
    userId: user?.id,
    orgId: user?.organizationId,
    method: req.method,
    path: req.path,
    body: req.body,
  });
  
  next(err);
}

/**
 * Create a child logger with preset context
 */
export function createChildLogger(context: LogContext) {
  return {
    debug: (message: string, extra?: LogContext) => logger.debug(message, { ...context, ...extra }),
    info: (message: string, extra?: LogContext) => logger.info(message, { ...context, ...extra }),
    warn: (message: string, extra?: LogContext) => logger.warn(message, { ...context, ...extra }),
    error: (message: string, extra?: LogContext) => logger.error(message, { ...context, ...extra }),
    exception: (error: Error, extra?: LogContext) => logger.exception(error, { ...context, ...extra }),
  };
}
