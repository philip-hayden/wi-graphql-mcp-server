/**
 * Centralized configuration management for Wildlife Insights MCP Server
 */

export interface ServerConfig {
  name: string;
  version: string;
  environment: 'development' | 'production' | 'test';
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
  };
  api: {
    timeout: number;
    retries: number;
    baseUrl?: string;
  };
  server: {
    port?: number;
    gracefulShutdownTimeout: number;
  };
}

export interface WildlifeInsightsConfig {
  graphqlEndpoint: string;
  bearerToken?: string;
  timeout: number;
  retries: number;
}

/**
 * Default configuration values
 */
function parseNumber(envVar: string | undefined, fallback: number) {
  const v = envVar ?? '';
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Build default configuration from current environment variables.
 * This is done lazily so tests can mutate process.env between calls.
 */
function buildDefaultConfig(): ServerConfig {
  const environment = (process.env.NODE_ENV as ServerConfig['environment']) || 'development';
  const apiTimeout = parseNumber(process.env.API_TIMEOUT, 30000);
  const apiRetries = parseNumber(process.env.API_RETRIES, 3);

  return {
    name: 'wildlife-insights-mcp',
    version: '0.2.3',
    environment,
    logging: {
      level: (process.env.LOG_LEVEL as ServerConfig['logging']['level']) || 'info',
      format: (process.env.LOG_FORMAT as ServerConfig['logging']['format']) || 'text',
    },
    api: {
      timeout: apiTimeout,
      retries: apiRetries,
      baseUrl: process.env.API_BASE_URL,
    },
    server: {
      port: parseNumber(process.env.PORT, 3000),
      gracefulShutdownTimeout: parseNumber(process.env.GRACEFUL_SHUTDOWN_TIMEOUT, 10000),
    },
  };
}

/**
 * Build Wildlife Insights specific configuration from current environment variables.
 */
function buildWildlifeInsightsConfig(): WildlifeInsightsConfig {
  const defaultCfg = buildDefaultConfig();
  return {
    graphqlEndpoint: process.env.WI_GRAPHQL_ENDPOINT || 'https://api.wildlifeinsights.org/graphql',
    bearerToken: process.env.WI_BEARER_TOKEN,
    timeout: defaultCfg.api.timeout,
    retries: defaultCfg.api.retries,
  };
}

/**
 * Get the current server configuration
 */
export function getConfig(): ServerConfig {
  return buildDefaultConfig();
}

/**
 * Get Wildlife Insights API configuration
 */
export function getWildlifeInsightsConfig(): WildlifeInsightsConfig {
  return buildWildlifeInsightsConfig();
}

/**
 * Validate that required configuration is present
 */
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Require the explicit environment variable for endpoint; don't accept runtime default here
  if (!process.env.WI_GRAPHQL_ENDPOINT) {
    errors.push('WI_GRAPHQL_ENDPOINT is required');
  }

  // In production, bearer token should be provided as an environment variable
  if ((process.env.NODE_ENV === 'production') && !process.env.WI_BEARER_TOKEN) {
    errors.push('WI_BEARER_TOKEN is required in production environment');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default getConfig;
