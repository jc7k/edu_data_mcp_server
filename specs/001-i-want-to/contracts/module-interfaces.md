# Module Interfaces and Contracts

**Feature**: Technical Debt Remediation and Architectural Improvements
**Branch**: `001-i-want-to`
**Date**: 2025-10-07

## Overview

This document defines the contracts (interfaces) between modules in the refactored architecture. Each module has clear input/output contracts enabling independent testing and modification (FR-001, FR-002, FR-003).

## Module Dependency Graph

```
┌─────────────────┐
│   index.ts      │  Entry point - minimal orchestration
│  (Main/Server)  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   server.ts     │  MCP server config and handler wiring
│                 │
└────┬────────┬───┘
     │        │
     ↓        ↓
┌─────────┐ ┌──────────────┐
│handlers/│ │  services/   │
│tools.ts │ │  validator   │
│resources│ │  api-client  │
│         │ │  cache       │
└─────┬───┘ │  logger      │
      │     └──────┬───────┘
      │            │
      ↓            ↓
   ┌──────────────────┐
   │     models/      │  Types and schemas
   │  config/         │  Constants
   │  utils/          │  Errors, retry
   └──────────────────┘
```

**Dependency Rules**:
- Lower layers have NO dependencies on upper layers
- `utils/` and `models/` are foundational (no dependencies within src/)
- `services/` depend only on `models/`, `config/`, `utils/`
- `handlers/` depend on `services/`, `models/`, `utils/`
- `server.ts` wires everything together
- `index.ts` just bootstraps server

---

## 1. Validator Service

### Interface

```typescript
interface IValidator {
  /**
   * Validate education data request parameters
   * @throws ValidationError if validation fails
   */
  validateEducationDataRequest(params: unknown): EducationDataRequest;

  /**
   * Validate summary data request parameters
   * @throws ValidationError if validation fails
   */
  validateSummaryDataRequest(params: unknown): SummaryDataRequest;

  /**
   * Sanitize string input to prevent injection attacks
   * Removes control characters, limits length, escapes special chars
   */
  sanitizeString(input: string, maxLength?: number): string;

  /**
   * Validate that level/source/topic combination exists
   * @throws ValidationError if endpoint not found
   */
  validateEndpoint(level: string, source: string, topic: string): EndpointMetadata;
}
```

### Dependencies
- `models/schemas.ts` - Zod validation schemas
- `config/endpoints.ts` - Endpoint metadata for validation
- `utils/errors.ts` - ValidationError class

### Contract Guarantees
- ✅ Returns type-safe validated object if validation succeeds
- ✅ Throws ValidationError with descriptive message if validation fails
- ✅ All string inputs are sanitized before returning
- ✅ Validation errors include field name, expected format, received value

### Testing Contract
- Unit tests: validate all validation rules (required fields, types, ranges, regex)
- Edge cases: empty strings, null, undefined, wrong types, out-of-range values
- Security: injection attempts (SQL, XSS, path traversal), control characters, excessive length

---

## 2. API Client Service

### Interface

```typescript
interface IApiClient {
  /**
   * Fetch education data from API
   * @throws ApiError on HTTP errors or network failures
   * @returns Raw API response data
   */
  getEducationData(request: EducationDataRequest): Promise<unknown>;

  /**
   * Fetch summary data from API
   * @throws ApiError on HTTP errors or network failures
   * @returns Raw API response data
   */
  getSummaryData(request: SummaryDataRequest): Promise<unknown>;

  /**
   * Build API URL with query parameters
   * Internal method for URL construction
   */
  buildUrl(request: EducationDataRequest | SummaryDataRequest): string;
}
```

### Dependencies
- `models/types.ts` - Request/response types
- `utils/errors.ts` - ApiError class
- `utils/retry.ts` - Retry logic
- `services/logger.ts` - Logging
- `axios` - HTTP client (external)

### Contract Guarantees
- ✅ Returns parsed JSON response on success (2xx status)
- ✅ Throws ApiError with status code and message on HTTP errors
- ✅ Retries transient failures (429, 503, network timeout) with exponential backoff
- ✅ Does NOT retry client errors (400, 401, 404)
- ✅ Implements request timeout (30 seconds default)
- ✅ Logs all requests and responses with sanitized parameters
- ✅ Deduplicates concurrent identical requests (promise coalescing)

### Testing Contract
- Unit tests: URL building, error mapping, retry decision logic
- Integration tests: real API calls (or mock server), timeout handling, retry behavior
- Contract tests: verify API response format matches expectations

---

## 3. Cache Service

### Interface

```typescript
interface ICache {
  /**
   * Get cached value by key
   * @returns Cached value if found and not expired, undefined otherwise
   */
  get<T>(key: string): T | undefined;

  /**
   * Set cached value with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time-to-live in milliseconds (optional, uses default if not provided)
   */
  set<T>(key: string, value: T, ttl?: number): void;

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean;

  /**
   * Remove specific key from cache
   */
  delete(key: string): void;

  /**
   * Clear all cached entries
   */
  clear(): void;

  /**
   * Get cache statistics
   */
  getStats(): CacheStats;
}

interface CacheStats {
  size: number;           // Current number of entries
  hits: number;           // Total cache hits
  misses: number;         // Total cache misses
  hitRate: number;        // hits / (hits + misses)
  evictions: number;      // Total evictions (TTL + LRU)
}
```

### Dependencies
- `lru-cache` - LRU cache implementation (external)
- `config/constants.ts` - Cache configuration (max size, default TTL)

### Contract Guarantees
- ✅ Returns undefined for missing or expired keys
- ✅ Evicts least-recently-used entries when max size reached
- ✅ Evicts expired entries based on TTL
- ✅ Thread-safe for concurrent access (single-threaded Node.js)
- ✅ Tracks hit/miss statistics for monitoring

### Testing Contract
- Unit tests: get/set/delete operations, TTL expiration, LRU eviction
- Edge cases: cache full, zero TTL, concurrent access, large values
- Performance: cache hit should be <1ms, memory usage stays bounded

---

## 4. Logger Service

### Interface

```typescript
interface ILogger {
  /**
   * Create child logger with request context
   */
  child(context: LogContext): ILogger;

  /**
   * Log informational message
   */
  info(message: string, ...args: unknown[]): void;

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * Log error message
   */
  error(message: string, error?: Error, ...args: unknown[]): void;

  /**
   * Log debug message (only in development)
   */
  debug(message: string, ...args: unknown[]): void;
}
```

### Dependencies
- `pino` - Structured logger (external)
- `models/types.ts` - LogContext type

### Contract Guarantees
- ✅ All logs output to stderr (stdout reserved for MCP protocol)
- ✅ JSON format in production, pretty-print in development
- ✅ Automatically includes timestamp, log level, context
- ✅ Redacts sensitive fields (if configured)
- ✅ Child loggers inherit parent context

### Testing Contract
- Unit tests: verify log output format, context propagation, redaction
- Integration tests: verify logs are written to correct stream (stderr)

---

## 5. Tool Handlers

### Interface

```typescript
interface IToolHandlers {
  /**
   * Handle get_education_data tool call
   * @returns MCP tool response with data or error
   */
  handleGetEducationData(params: unknown): Promise<ToolResponse>;

  /**
   * Handle get_education_data_summary tool call
   * @returns MCP tool response with data or error
   */
  handleGetSummaryData(params: unknown): Promise<ToolResponse>;
}

type ToolResponse = {
  content: Array<{
    type: "text";
    text: string;  // JSON stringified data
  }>;
};
```

### Dependencies
- `services/validator.ts` - Input validation
- `services/api-client.ts` - API calls
- `services/cache.ts` - Caching
- `services/logger.ts` - Logging
- `utils/errors.ts` - Error handling

### Contract Guarantees
- ✅ Validates input before processing (throws ValidationError on invalid input)
- ✅ Checks cache before calling API
- ✅ Caches successful API responses
- ✅ Handles all error types gracefully (validation, API, network)
- ✅ Returns user-friendly error messages (sanitized, no stack traces)
- ✅ Logs all requests with context (request ID, params, duration, cache hit status)

### Testing Contract
- Unit tests: validation flow, cache hit/miss, error handling
- Integration tests: end-to-end tool call with real API
- Contract tests: MCP response format compliance

---

## 6. Resource Handlers

### Interface

```typescript
interface IResourceHandlers {
  /**
   * List all available endpoint resources
   */
  listResources(): Promise<ResourceListResponse>;

  /**
   * List resource templates
   */
  listResourceTemplates(): Promise<ResourceTemplateListResponse>;

  /**
   * Read specific endpoint resource by URI
   */
  readResource(uri: string): Promise<ResourceReadResponse>;
}
```

### Dependencies
- `config/endpoints.ts` - Endpoint metadata
- `utils/errors.ts` - Error handling

### Contract Guarantees
- ✅ Returns all endpoints in listResources()
- ✅ Validates URI format in readResource()
- ✅ Throws InvalidRequest error for malformed URIs or non-existent endpoints

### Testing Contract
- Unit tests: URI parsing, endpoint lookup, error cases

---

## 7. Error Utilities

### Interface

```typescript
interface IErrorUtils {
  /**
   * Format error for MCP client (sanitized, no sensitive data)
   */
  formatErrorForClient(error: Error): McpError;

  /**
   * Log error with full context (includes stack trace, params)
   */
  logErrorWithContext(logger: ILogger, error: Error, context: LogContext): void;

  /**
   * Check if error is retryable
   */
  isRetryableError(error: Error): boolean;
}
```

### Contract Guarantees
- ✅ Client errors never include stack traces or internal paths
- ✅ Logged errors include full diagnostic context
- ✅ Retryable errors: only transient failures (network timeout, 429, 503)

---

## 8. Retry Utilities

### Interface

```typescript
interface IRetryUtils {
  /**
   * Execute function with retry logic
   * @param fn Function to execute
   * @param config Retry configuration
   * @returns Result of fn on success
   * @throws Last error if all retries exhausted
   */
  retry<T>(
    fn: () => Promise<T>,
    config: RetryConfig
  ): Promise<T>;

  /**
   * Calculate delay for next retry attempt
   */
  calculateDelay(attempt: number, config: RetryConfig): number;
}
```

### Contract Guarantees
- ✅ Retries only if error passes retry predicate
- ✅ Implements exponential backoff with jitter
- ✅ Logs each retry attempt with delay and reason
- ✅ Throws original error if max retries exceeded

---

## Module Integration Patterns

### Pattern 1: Validation → API Call → Cache

```typescript
// In tool handler
async handleGetEducationData(params: unknown): Promise<ToolResponse> {
  const logger = this.logger.child({ requestId: generateId(), toolName: 'get_education_data' });

  try {
    // Step 1: Validate input
    const validatedRequest = this.validator.validateEducationDataRequest(params);

    // Step 2: Check cache
    const cacheKey = this.generateCacheKey(validatedRequest);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.info('Cache hit', { cacheKey });
      return { content: [{ type: 'text', text: JSON.stringify(cached) }] };
    }

    // Step 3: Call API
    logger.info('Cache miss, calling API', { cacheKey });
    const data = await this.apiClient.getEducationData(validatedRequest);

    // Step 4: Cache result
    this.cache.set(cacheKey, data);

    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  } catch (error) {
    logErrorWithContext(logger, error, { params });
    throw formatErrorForClient(error);
  }
}
```

### Pattern 2: Dependency Injection

```typescript
// In server.ts
const logger = createLogger();
const cache = new Cache({ maxSize: 1000, defaultTtl: 300000 });
const validator = new Validator(endpoints, logger);
const apiClient = new ApiClient(logger, cache);
const toolHandlers = new ToolHandlers(validator, apiClient, cache, logger);

// Wire handlers to MCP server
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'get_education_data') {
    return toolHandlers.handleGetEducationData(request.params.arguments);
  }
  // ... other tools
});
```

## Summary

**Total Interfaces**: 8 clearly defined contracts
- 4 service interfaces (Validator, ApiClient, Cache, Logger)
- 2 handler interfaces (ToolHandlers, ResourceHandlers)
- 2 utility interfaces (ErrorUtils, RetryUtils)

**Key Principles**:
- Dependency inversion: depend on interfaces, not implementations
- Single responsibility: each module has one clear purpose
- Clear contracts: inputs, outputs, guarantees, and error conditions documented
- Testability: all modules can be tested in isolation with mocks

Next: Create quickstart guide for developers.
