/**
 * Test setup and global configuration for Wildlife Insights MCP Server tests
 */

// Set default test environment variables only if not already set by specific tests
// NOTE: NODE_ENV and LOG_LEVEL are intentionally NOT set here because individual
// tests need to control these for testing default behavior vs environment variable overrides

// Set default test environment variables - only if not already set
if (!process.env.WI_GRAPHQL_ENDPOINT) {
  process.env.WI_GRAPHQL_ENDPOINT = 'https://api.wildlifeinsights.org/graphql';
}

// NOTE: Don't set WI_BEARER_TOKEN here as individual tests need to control this
// for testing default behavior vs environment variable overrides

// Global test utilities
export const createMockToolArgs = (overrides: Record<string, any> = {}) => ({
  bearerToken: 'test-token',
  ...overrides,
});

export const createMockGraphQLResponse = (data: any) => ({
  data,
});

export const createMockGraphQLError = (message: string) => ({
  errors: [{ message }],
});

// Test timeout for async operations
export const TEST_TIMEOUT = 10000;

// Helper to wait for async operations
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
