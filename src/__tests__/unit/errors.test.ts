/**
 * Unit tests for error handling utilities
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  MCPError,
  ErrorCode,
  getUserFriendlyError,
  withErrorHandling,
  withRetry,
} from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

describe('Error Handling', () => {
  beforeEach(() => {
    // Mock logger to avoid console output during tests
    jest.spyOn(logger, 'toolStart').mockImplementation();
    jest.spyOn(logger, 'toolSuccess').mockImplementation();
    jest.spyOn(logger, 'toolError').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('MCPError', () => {
    it('should create error with all properties', () => {
      const error = new MCPError({
        code: ErrorCode.AUTH_TOKEN_INVALID,
        message: 'Technical error message',
        userMessage: 'User-friendly message',
        context: { tool: 'test-tool' },
        retryable: true,
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(ErrorCode.AUTH_TOKEN_INVALID);
      expect(error.userMessage).toBe('User-friendly message');
      expect(error.context).toEqual({ tool: 'test-tool' });
      expect(error.retryable).toBe(true);
      expect(error.message).toBe('Technical error message');
    });

    it('should convert to response format', () => {
      const error = new MCPError({
        code: ErrorCode.API_REQUEST_FAILED,
        message: 'Request failed',
        userMessage: 'Request failed',
      });

      const response = error.toResponse();

      expect(response).toHaveProperty('content');
      expect(response.content).toHaveLength(2);
      expect(response.content[0].type).toBe('text');
      expect(response.content[1].type).toBe('resource');
    });
  });

  describe('getUserFriendlyError', () => {
    it('should return MCPError as-is', () => {
      const originalError = new MCPError({
        code: ErrorCode.AUTH_TOKEN_INVALID,
        message: 'Auth failed',
        userMessage: 'Please check token',
      });

      const result = getUserFriendlyError(originalError);
      expect(result).toBe(originalError);
    });

    it('should handle GraphQL errors', () => {
      const graphqlError = {
        errors: [{ message: 'Unauthorized access' }],
      };

      const result = getUserFriendlyError(graphqlError, 'test-tool');

      expect(result).toBeInstanceOf(MCPError);
      expect(result.code).toBe(ErrorCode.AUTH_TOKEN_INVALID);
      expect(result.userMessage).toContain('Authentication failed');
      expect(result.retryable).toBe(true);
    });

    it('should handle network timeout errors', () => {
      const networkError = new Error('Request timeout');

      const result = getUserFriendlyError(networkError, 'test-tool');

      expect(result).toBeInstanceOf(MCPError);
      expect(result.code).toBe(ErrorCode.NETWORK_TIMEOUT);
      expect(result.userMessage).toContain('timed out');
      expect(result.retryable).toBe(true);
    });

    it('should handle connection errors', () => {
      const connectionError = new Error('ECONNREFUSED');

      const result = getUserFriendlyError(connectionError, 'test-tool');

      expect(result).toBeInstanceOf(MCPError);
      expect(result.code).toBe(ErrorCode.NETWORK_CONNECTION_ERROR);
      expect(result.userMessage).toContain('Connection error');
      expect(result.retryable).toBe(true);
    });

    it('should handle string errors', () => {
      const result = getUserFriendlyError('Something went wrong', 'test-tool');

      expect(result).toBeInstanceOf(MCPError);
      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.userMessage).toContain('unexpected error occurred');
      expect(result.retryable).toBe(false);
    });

    it('should handle unknown errors', () => {
      const unknownError = { someProperty: 'value' };

      const result = getUserFriendlyError(unknownError, 'test-tool');

      expect(result).toBeInstanceOf(MCPError);
      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.retryable).toBe(false);
    });
  });

  describe('withErrorHandling', () => {
    it('should execute operation successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await withErrorHandling(mockOperation, 'test-tool', { param: 'value' });

      expect(result).toBe('success');
      expect(logger.toolStart).toHaveBeenCalledWith('test-tool', 'execute', { param: 'value' });
      expect(logger.toolSuccess).toHaveBeenCalled();
    });

    it('should handle operation errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(withErrorHandling(mockOperation, 'test-tool')).rejects.toThrow(MCPError);

      expect(logger.toolStart).toHaveBeenCalled();
      expect(logger.toolError).toHaveBeenCalled();
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(mockOperation, 3, 100, 'test-tool');

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const retryableError = new MCPError({
        code: ErrorCode.NETWORK_TIMEOUT,
        message: 'Timeout',
        userMessage: 'Timeout',
        retryable: true,
      });

      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const result = await withRetry(mockOperation, 3, 10, 'test-tool');

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new MCPError({
        code: ErrorCode.AUTH_TOKEN_INVALID,
        message: 'Invalid token',
        userMessage: 'Invalid token',
        retryable: false,
      });

      const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(withRetry(mockOperation, 3, 10, 'test-tool')).rejects.toThrow(MCPError);

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const error = new Error('Persistent failure');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(withRetry(mockOperation, 2, 10, 'test-tool')).rejects.toThrow('Persistent failure');

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });
});
