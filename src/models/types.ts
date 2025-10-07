/**
 * Core type definitions for the Education Data MCP Server
 */

/**
 * Request parameters for the get_education_data tool
 */
export interface EducationDataRequest {
  level: string;
  source: string;
  topic: string;
  subtopic?: string[];
  filters?: Record<string, string | number | string[] | number[]>;
  add_labels?: boolean;
  limit?: number;
}

/**
 * Request parameters for the get_education_data_summary tool
 */
export interface SummaryDataRequest {
  level: string;
  source: string;
  topic: string;
  subtopic?: string;
  stat: string;
  var: string;
  by: string[];
  filters?: Record<string, string | number | string[] | number[]>;
}

/**
 * Metadata about available API endpoints
 */
export interface EndpointMetadata {
  level: string;
  source: string;
  topic: string;
  endpoint: string;
  description: string;
}

/**
 * Cache entry structure
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * API request configuration
 */
export interface ApiRequest {
  url: string;
  timeout: number;
  retryConfig: RetryConfig;
}

/**
 * Retry configuration for API calls
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

/**
 * Logging context for structured logs
 */
export interface LogContext {
  requestId?: string;
  tool?: string;
  level?: string;
  source?: string;
  topic?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Health check status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: {
    cache?: boolean;
    api?: boolean;
  };
}

/**
 * Metrics tracking
 */
export interface Metrics {
  requestCount: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
  avgResponseTimeMs: number;
  lastResetTimestamp: number;
}
