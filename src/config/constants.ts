/**
 * Application constants and configuration
 */

/**
 * Urban Institute Education Data API base URL
 */
export const API_BASE_URL = 'https://educationdata.urban.org/api/v1/';

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** TTL for API response cache in milliseconds (5 minutes) */
  RESPONSE_TTL_MS: 300000,
  /** TTL for endpoint metadata cache in milliseconds (1 hour) */
  METADATA_TTL_MS: 3600000,
  /** Maximum number of cached API responses */
  MAX_RESPONSE_ENTRIES: 1000,
  /** Maximum number of cached metadata entries */
  MAX_METADATA_ENTRIES: 100,
} as const;

/**
 * API request limits and timeouts
 */
export const API_LIMITS = {
  /** Maximum number of results per request */
  MAX_LIMIT: 10000,
  /** Default number of results if not specified */
  DEFAULT_LIMIT: 100,
  /** Request timeout in milliseconds (30 seconds) */
  TIMEOUT_MS: 30000,
} as const;

/**
 * Retry configuration for API requests
 */
export const RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  MAX_RETRIES: 3,
  /** Initial retry delay in milliseconds */
  INITIAL_DELAY_MS: 1000,
  /** Maximum retry delay in milliseconds */
  MAX_DELAY_MS: 10000,
  /** Backoff multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 2,
  /** HTTP status codes that should trigger a retry */
  RETRYABLE_STATUS_CODES: [429, 500, 502, 503, 504],
} as const;

/**
 * Validation constraints
 */
export const VALIDATION = {
  /** Maximum length for string parameters */
  MAX_STRING_LENGTH: 100,
  /** Allowed pattern for level parameter (lowercase letters and hyphens) */
  LEVEL_PATTERN: /^[a-z-]+$/,
  /** Allowed pattern for source parameter (lowercase letters only) */
  SOURCE_PATTERN: /^[a-z]+$/,
  /** Allowed pattern for topic parameter (lowercase letters and hyphens) */
  TOPIC_PATTERN: /^[a-z-]+$/,
} as const;

/**
 * Logging configuration
 */
export const LOGGING = {
  /** Log level for development */
  DEV_LOG_LEVEL: 'debug',
  /** Log level for production */
  PROD_LOG_LEVEL: 'info',
  /** Fields to redact from logs (sensitive data) */
  REDACT_FIELDS: ['apiKey', 'password', 'token', 'secret'],
} as const;
