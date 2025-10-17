/**
 * Structured logging utility for Wildlife Insights MCP Server
 * Provides consistent logging across the application with proper formatting
 */

import { getConfig } from '../config/index.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  tool?: string;
  operation?: string;
}

export class Logger {
  private config = getConfig();
  private minLevel: LogLevel;

  constructor() {
    this.minLevel = this.parseLogLevel(this.config.logging.level);
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelName = LogLevel[entry.level];
    const contextStr = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';

    return `[${timestamp}] ${levelName}: ${entry.message}${contextStr}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
    tool?: string,
    operation?: string,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      tool,
      operation,
    };
  }

  debug(message: string, context?: Record<string, any>, tool?: string, operation?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, undefined, tool, operation);
    console.debug(this.formatMessage(entry));
  }

  info(message: string, context?: Record<string, any>, tool?: string, operation?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.createLogEntry(LogLevel.INFO, message, context, undefined, tool, operation);
    console.info(this.formatMessage(entry));
  }

  warn(message: string, context?: Record<string, any>, tool?: string, operation?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.createLogEntry(LogLevel.WARN, message, context, undefined, tool, operation);
    console.warn(this.formatMessage(entry));
  }

  error(
    message: string,
    error?: Error,
    context?: Record<string, any>,
    tool?: string,
    operation?: string,
  ): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error, tool, operation);
    const formattedMessage = this.formatMessage(entry);

    if (error) {
      console.error(formattedMessage, '\nStack:', error.stack);
    } else {
      console.error(formattedMessage);
    }
  }

  // Tool-specific logging methods
  toolStart(toolName: string, operation: string, context?: Record<string, any>): void {
    this.debug(`Starting tool execution`, context, toolName, operation);
  }

  toolSuccess(toolName: string, operation: string, duration: number, context?: Record<string, any>): void {
    this.info(`Tool executed successfully`, { ...context, duration: `${duration}ms` }, toolName, operation);
  }

  toolError(toolName: string, operation: string, error: Error, context?: Record<string, any>): void {
    this.error(`Tool execution failed`, error, context, toolName, operation);
  }

  // API request logging
  apiRequest(endpoint: string, method: string, context?: Record<string, any>): void {
    this.debug(`API request`, { endpoint, method, ...context });
  }

  apiResponse(endpoint: string, method: string, status: number, duration: number, context?: Record<string, any>): void {
    const level = status >= 400 ? LogLevel.WARN : LogLevel.DEBUG;
    if (this.shouldLog(level)) {
      this.log(`API response: ${status}`, level, { endpoint, method, duration: `${duration}ms`, ...context });
    }
  }

  private log(message: string, level: LogLevel, context?: Record<string, any>, tool?: string, operation?: string): void {
    const entry = this.createLogEntry(level, message, context, undefined, tool, operation);
    const formattedMessage = this.formatMessage(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }
}

// Create and export a singleton logger instance
export const logger = new Logger();

/**
 * Create a child logger with pre-bound context
 */
export function createChildLogger(context: Record<string, any>): Logger {
  const childLogger = new Logger();

  // Override the logging methods to include the context
  const originalDebug = childLogger.debug.bind(childLogger);
  const originalInfo = childLogger.info.bind(childLogger);
  const originalWarn = childLogger.warn.bind(childLogger);
  const originalError = childLogger.error.bind(childLogger);

  childLogger.debug = (message: string, additionalContext?: Record<string, any>, tool?: string, operation?: string) => {
    originalDebug(message, { ...context, ...additionalContext }, tool, operation);
  };

  childLogger.info = (message: string, additionalContext?: Record<string, any>, tool?: string, operation?: string) => {
    originalInfo(message, { ...context, ...additionalContext }, tool, operation);
  };

  childLogger.warn = (message: string, additionalContext?: Record<string, any>, tool?: string, operation?: string) => {
    originalWarn(message, { ...context, ...additionalContext }, tool, operation);
  };

  childLogger.error = (message: string, error?: Error, additionalContext?: Record<string, any>, tool?: string, operation?: string) => {
    originalError(message, error, { ...context, ...additionalContext }, tool, operation);
  };

  return childLogger;
}

export default logger;
