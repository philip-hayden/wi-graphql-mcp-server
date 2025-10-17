/**
 * Unit tests for configuration management
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { getConfig, getWildlifeInsightsConfig, validateConfig } from '../../config/index.js';

describe('Configuration Management', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    // Clear test-specific environment variables that might interfere
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
    delete process.env.WI_BEARER_TOKEN;
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getConfig', () => {
    it('should return default configuration', () => {
      // Create isolated environment for this test
      const testEnv = {
        NODE_ENV: 'development',
        LOG_LEVEL: 'info',
      };

      // Temporarily replace process.env
      const originalEnv = process.env;
      process.env = testEnv;

      const config = getConfig();

      expect(config).toMatchObject({
        name: 'wildlife-insights-mcp',
        version: '0.2.3',
        environment: 'development',
        logging: {
          level: 'info',
          format: 'text',
        },
        api: {
          timeout: 30000,
          retries: 3,
        },
        server: {
          gracefulShutdownTimeout: 10000,
        },
      });

      // Restore original environment
      process.env = originalEnv;
    });

    it('should use environment variables when provided', () => {
      // Create isolated environment for this test
      const testEnv = {
        NODE_ENV: 'production',
        LOG_LEVEL: 'debug',
        API_TIMEOUT: '60000',
      };

      // Temporarily replace process.env
      const originalEnv = process.env;
      process.env = testEnv;

      const config = getConfig();

      expect(config).toMatchObject({
        environment: 'production',
        logging: {
          level: 'debug',
        },
        api: {
          timeout: 60000,
        },
      });

      // Restore original environment
      process.env = originalEnv;
    });
  });

  describe('getWildlifeInsightsConfig', () => {
    it('should return default Wildlife Insights configuration', () => {
      // Create isolated environment for this test
      const testEnv = {};

      // Temporarily replace process.env
      const originalEnv = process.env;
      process.env = testEnv;

      const config = getWildlifeInsightsConfig();

      expect(config).toMatchObject({
        graphqlEndpoint: 'https://api.wildlifeinsights.org/graphql',
        timeout: 30000,
        retries: 3,
      });

      // Restore original environment
      process.env = originalEnv;
    });

    it('should use environment variables for Wildlife Insights config', () => {
      // Create isolated environment for this test
      const testEnv = {
        WI_GRAPHQL_ENDPOINT: 'https://custom-endpoint.com/graphql',
        WI_BEARER_TOKEN: 'custom-token',
      };

      // Temporarily replace process.env
      const originalEnv = process.env;
      process.env = testEnv;

      const config = getWildlifeInsightsConfig();

      expect(config).toMatchObject({
        graphqlEndpoint: 'https://custom-endpoint.com/graphql',
        bearerToken: 'custom-token',
      });

      // Restore original environment
      process.env = originalEnv;
    });
  });

  describe('validateConfig', () => {
    it('should validate successfully with required configuration', () => {
      // Create isolated environment for this test
      const testEnv = {
        WI_GRAPHQL_ENDPOINT: 'https://api.wildlifeinsights.org/graphql',
      };

      // Temporarily replace process.env
      const originalEnv = process.env;
      process.env = testEnv;

      const result = validateConfig();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Restore original environment
      process.env = originalEnv;
    });

    it('should fail validation without required endpoint', () => {
      // Create isolated environment for this test
      const testEnv = {};

      // Temporarily replace process.env
      const originalEnv = process.env;
      process.env = testEnv;

      const result = validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('WI_GRAPHQL_ENDPOINT is required');

      // Restore original environment
      process.env = originalEnv;
    });

    it('should require bearer token in production', () => {
      // Create isolated environment for this test
      const testEnv = {
        NODE_ENV: 'production',
      };

      // Temporarily replace process.env
      const originalEnv = process.env;
      process.env = testEnv;

      const result = validateConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('WI_BEARER_TOKEN is required in production environment');

      // Restore original environment
      process.env = originalEnv;
    });
  });
});
