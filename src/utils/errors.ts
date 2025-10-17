/**
 * Enhanced error handling utilities for Wildlife Insights MCP Server
 * Provides user-friendly error messages while preserving technical details
 */

import { logger } from './logger.js';

export enum ErrorCode {
  // Authentication errors
  AUTH_TOKEN_MISSING = 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',

  // API errors
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  API_RESPONSE_INVALID = 'API_RESPONSE_INVALID',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  API_SERVER_ERROR = 'API_SERVER_ERROR',

  // GraphQL errors
  GRAPHQL_QUERY_FAILED = 'GRAPHQL_QUERY_FAILED',
  GRAPHQL_VALIDATION_ERROR = 'GRAPHQL_VALIDATION_ERROR',
  GRAPHQL_SYNTAX_ERROR = 'GRAPHQL_SYNTAX_ERROR',

  // Tool execution errors
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_INVALID_INPUT = 'TOOL_INVALID_INPUT',
  TOOL_MISSING_REQUIRED_PARAM = 'TOOL_MISSING_REQUIRED_PARAM',

  // File upload errors
  UPLOAD_FILE_NOT_FOUND = 'UPLOAD_FILE_NOT_FOUND',
  UPLOAD_SESSION_FAILED = 'UPLOAD_SESSION_FAILED',
  UPLOAD_URL_GENERATION_FAILED = 'UPLOAD_URL_GENERATION_FAILED',
  UPLOAD_NETWORK_ERROR = 'UPLOAD_NETWORK_ERROR',

  // Configuration errors
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_MISSING_REQUIRED = 'CONFIG_MISSING_REQUIRED',

  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION_ERROR = 'NETWORK_CONNECTION_ERROR',

  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface MCPErrorDetails {
  code: ErrorCode;
  message: string;
  userMessage: string;
  context?: Record<string, any>;
  originalError?: Error;
  retryable?: boolean;
  tool?: string;
  operation?: string;
}

/**
 * Enhanced error class for MCP server operations
 */
export class MCPError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly context?: Record<string, any>;
  public readonly retryable: boolean;
  public readonly tool?: string;
  public readonly operation?: string;
  public readonly originalError?: Error;

  constructor(details: MCPErrorDetails) {
    super(details.message);
    this.name = 'MCPError';
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.context = details.context;
    this.retryable = details.retryable ?? false;
    this.tool = details.tool;
    this.operation = details.operation;
    this.originalError = details.originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPError);
    }
  }

  /**
   * Convert to user-friendly response format
   */
  toResponse() {
    return {
      content: [
        { type: 'text', text: this.userMessage },
        {
          type: 'resource',
          resource: {
            text: JSON.stringify(
              {
                error: {
                  code: this.code,
                  message: this.message,
                  context: this.context,
                  retryable: this.retryable,
                  ...(process.env.NODE_ENV === 'development' && {
                    stack: this.stack,
                    originalError: this.originalError?.message,
                  }),
                },
              },
              null,
              2,
            ),
            uri: 'error-details.json',
          },
        },
      ],
    };
  }
}

/**
 * Create user-friendly error messages from technical errors
 */
export function getUserFriendlyError(error: unknown, tool?: string, operation?: string): MCPError {
  const context = { tool, operation };

  // Handle known error types
  if (error instanceof MCPError) {
    return error;
  }

  // Handle GraphQL errors
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const graphqlError = error as { errors: Array<{ message: string; extensions?: any }> };
    const firstError = graphqlError.errors[0];

    if (firstError?.message?.includes('Unauthorized') || firstError?.message?.includes('Invalid token')) {
      return new MCPError({
        code: ErrorCode.AUTH_TOKEN_INVALID,
        message: 'Authentication failed',
        userMessage: '❌ Authentication failed. Please check your bearer token and try again.',
        context,
        originalError: new Error(firstError.message),
        retryable: true,
      });
    }

    if (firstError?.message?.includes('rate limit') || firstError?.message?.includes('too many requests')) {
      return new MCPError({
        code: ErrorCode.API_RATE_LIMITED,
        message: 'API rate limit exceeded',
        userMessage: '⏱️ API rate limit exceeded. Please wait a moment and try again.',
        context,
        originalError: new Error(firstError.message),
        retryable: true,
      });
    }

    return new MCPError({
      code: ErrorCode.GRAPHQL_QUERY_FAILED,
      message: firstError?.message || 'GraphQL query failed',
      userMessage: '❌ Query failed. Please check your parameters and try again.',
      context,
      originalError: new Error(firstError?.message || 'Unknown GraphQL error'),
      retryable: true,
    });
  }

  // Handle network errors
  if (error instanceof Error) {
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return new MCPError({
        code: ErrorCode.NETWORK_TIMEOUT,
        message: 'Network timeout',
        userMessage: '⏱️ Request timed out. Please try again.',
        context,
        originalError: error,
        retryable: true,
      });
    }

    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return new MCPError({
        code: ErrorCode.NETWORK_CONNECTION_ERROR,
        message: 'Network connection error',
        userMessage: '🌐 Connection error. Please check your internet connection and try again.',
        context,
        originalError: error,
        retryable: true,
      });
    }

    if (error.message.includes('fetch')) {
      return new MCPError({
        code: ErrorCode.API_REQUEST_FAILED,
        message: 'API request failed',
        userMessage: '❌ API request failed. Please check your parameters and try again.',
        context,
        originalError: error,
        retryable: true,
      });
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return new MCPError({
      code: ErrorCode.UNKNOWN_ERROR,
      message: error,
      userMessage: '❌ An unexpected error occurred. Please try again or contact support if the issue persists.',
      context,
      originalError: new Error(error),
      retryable: false,
    });
  }

  // Handle unknown errors
  return new MCPError({
    code: ErrorCode.UNKNOWN_ERROR,
    message: 'Unknown error occurred',
    userMessage: '❌ An unexpected error occurred. Please try again or contact support if the issue persists.',
    context,
    originalError: error instanceof Error ? error : new Error(String(error)),
    retryable: false,
  });
}

/**
 * Wrap tool execution with enhanced error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  toolName: string,
  context?: Record<string, any>,
): Promise<T> {
  const startTime = Date.now();

  try {
    logger.toolStart(toolName, 'execute', context);
    const result = await operation();
    const duration = Date.now() - startTime;

    logger.toolSuccess(toolName, 'execute', duration, context);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const mcpError = getUserFriendlyError(error, toolName, 'execute');

    logger.toolError(toolName, 'execute', mcpError, { ...context, duration: `${duration}ms` });
    throw mcpError;
  }
}

/**
 * Retry operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  toolName?: string,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if error is not retryable
      if (error instanceof MCPError && !error.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;

      logger.warn(
        `Operation failed, retrying in ${Math.round(delay)}ms`,
        {
          tool: toolName,
          attempt,
          maxRetries,
          error: lastError.message,
        },
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export default MCPError;
