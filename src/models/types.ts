/**
 * Core type definitions for the Education Data MCP Server
 */

/**
 * Pagination control parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed), mutually exclusive with offset */
  page?: number;
  /** Records per page (default: 20, max: 1000) */
  limit?: number;
  /** Record offset (0-indexed), mutually exclusive with page */
  offset?: number;
}

/**
 * Pagination metadata for navigation
 */
export interface PaginationMetadata {
  /** Total records available across all pages */
  total_count: number;
  /** Current page number (1-indexed) */
  current_page: number;
  /** Number of records in current response */
  page_size: number;
  /** Total pages available with current limit */
  total_pages: number;
  /** True if more results exist beyond current page */
  has_more: boolean;
  /** Next page number, or null if on last page */
  next_page: number | null;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Array of data records */
  results: T[];
  /** Pagination navigation metadata */
  pagination: PaginationMetadata;
}

/**
 * Field selection parameters
 */
export interface FieldSelectionParams {
  /** Optional array of field names to include in response */
  fields?: string[];
}

/**
 * Token estimation metadata
 */
export interface TokenEstimate {
  /** Estimated token count for response */
  estimated_tokens: number;
  /** Actual character count of JSON string */
  character_count: number;
  /** Whether estimate exceeds threshold */
  exceeds_limit: boolean;
}

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
  // Pagination parameters
  limit?: number;
  page?: number;
  offset?: number;
  // Field selection
  fields?: string[];
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
  // Pagination parameters
  page?: number;
  offset?: number;
  limit?: number;
  // Field selection
  fields?: string[];
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
