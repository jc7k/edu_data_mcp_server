# Research: Technical Debt Remediation and Architectural Improvements

**Feature**: Technical Debt Remediation and Architectural Improvements
**Branch**: `001-i-want-to`
**Date**: 2025-10-07

## Overview

This document consolidates research findings for resolving NEEDS CLARIFICATION items from the Technical Context and establishing best practices for the refactoring effort.

## Research Items

### 1. Testing Framework Selection for TypeScript

**Decision**: Vitest

**Rationale**:
- Native ESM support (matches our `"type": "module"` in package.json)
- Vite-powered, extremely fast test execution
- Jest-compatible API (easy migration path if needed)
- Built-in TypeScript support without additional configuration
- Superior watch mode performance for TDD workflow
- Native code coverage via c8 (no additional configuration)
- Modern, actively maintained (better than Jest for new projects)

**Alternatives Considered**:
- **Jest**: Industry standard but requires additional ESM configuration, slower performance, heavier setup
- **Node Test Runner**: Native to Node.js but immature ecosystem, limited assertion libraries, no coverage built-in
- **AVA**: Good TypeScript support but smaller ecosystem, less familiar to contributors

**Implementation Notes**:
- Install: `vitest`, `@vitest/ui` (for browser-based test UI)
- Coverage: Built-in via `--coverage` flag (uses c8 under the hood)
- Integration testing: Use `vitest` with real HTTP requests via `axios` (no need for supertest)
- Configuration: `vitest.config.ts` with coverage thresholds (80% for critical paths)

### 2. Input Validation Library

**Decision**: Zod

**Rationale**:
- TypeScript-first design with automatic type inference
- Runtime validation with compile-time type safety
- Excellent error messages for debugging and user feedback
- Composable schemas (build complex validations from simple ones)
- Small bundle size, no dependencies
- Active maintenance and large community

**Alternatives Considered**:
- **Joi**: More verbose API, no TypeScript inference, larger bundle
- **Yup**: Good but less TypeScript-native than Zod
- **AJV (JSON Schema)**: Powerful but verbose, JSON Schema syntax less ergonomic

**Implementation Notes**:
- Define schemas in `src/models/schemas.ts`
- Create reusable schemas for common patterns (API parameters, filters)
- Use `.safeParse()` for validation that returns result objects (no throwing)
- Transform Zod errors into user-friendly MCP error messages

### 3. LRU Cache Implementation

**Decision**: lru-cache (npm package)

**Rationale**:
- Industry-standard, battle-tested implementation
- Configurable TTL (time-to-live) per entry
- Automatic memory management with max size limits
- Built-in eviction policies (least recently used)
- TypeScript definitions included
- Zero dependencies, small footprint

**Alternatives Considered**:
- **Custom implementation**: Unnecessary reinvention, prone to bugs, no TTL support out of box
- **node-cache**: Good but less features than lru-cache, no LRU eviction
- **Redis/external cache**: Over-engineering for single-process MCP server, adds deployment complexity

**Implementation Notes**:
- Configure separate caches for endpoint metadata vs API responses
- Endpoint metadata cache: high TTL (1 hour), rarely changes
- API response cache: medium TTL (5 minutes), balance freshness vs performance
- Max size: 1000 entries for responses, 100 for metadata
- Cache key generation: hash of all query parameters for uniqueness

### 4. Logging Strategy

**Decision**: pino (structured logger)

**Rationale**:
- Fastest Node.js logger (important for high-throughput scenarios)
- Structured JSON logging by default (easy to parse, query, monitor)
- Child loggers for request context (automatic request ID tracking)
- Multiple log levels (trace, debug, info, warn, error, fatal)
- Pretty-printing for development, JSON for production
- Redaction support (automatically hide sensitive data)

**Alternatives Considered**:
- **Winston**: More features but slower, more complex configuration
- **Bunyan**: Good but less maintained than pino, similar performance
- **console.log/console.error**: Insufficient for production (no structure, no levels, no context)

**Implementation Notes**:
- Configure with `pino-pretty` for development (human-readable)
- Production: pure JSON to stderr (MCP servers use stdout for protocol)
- Create child logger per request with context (request ID, tool name, params)
- Redact sensitive fields: API keys (if added later), user data in logs
- Log levels: ERROR for failures, WARN for degraded performance, INFO for key events, DEBUG for troubleshooting

### 5. Error Handling Patterns

**Decision**: Custom error hierarchy + error mapping

**Rationale**:
- TypeScript custom error classes for internal errors (ValidationError, ApiError, CacheError)
- Map internal errors to MCP ErrorCode enum (InvalidParams, InvalidRequest, InternalError)
- Preserve error context internally while sanitizing external messages
- Support error chaining (capture original error as `cause`)

**Best Practices**:
- Never expose stack traces or internal paths to MCP clients
- Log full error context (stack, params, state) internally
- Return actionable error messages (what failed, how to fix)
- Use error codes consistently (400-level = client error, 500-level = server error)
- Implement retry logic only for transient failures (network timeouts, 503 errors)

**Implementation Notes**:
- Create error classes in `src/utils/errors.ts`
- Implement `formatErrorForClient()` to sanitize errors before sending to MCP
- Implement `logErrorWithContext()` to log full details without exposing them
- Use `instanceof` checks for error type discrimination

### 6. Retry Logic with Exponential Backoff

**Decision**: Custom implementation with configurable strategy

**Rationale**:
- Simple enough to implement correctly (< 50 lines)
- Full control over retry conditions (which errors to retry)
- Configurable max retries and backoff multiplier
- Jitter support to prevent thundering herd

**Best Practices**:
- Retry only idempotent operations (GET requests)
- Retry only transient failures: network errors, 429 (rate limit), 503 (service unavailable)
- Do NOT retry: 400 (bad request), 401 (unauthorized), 404 (not found)
- Exponential backoff: 1s, 2s, 4s, 8s (max 4 retries)
- Add jitter: ±25% randomness to prevent synchronized retries

**Implementation Notes**:
- Create `retry()` utility in `src/utils/retry.ts`
- Accept retry predicate function (determines which errors to retry)
- Log retry attempts with context (attempt number, delay, error)
- Set overall timeout to prevent infinite retry loops

### 7. Concurrent Request Deduplication

**Decision**: Promise-based request coalescing

**Rationale**:
- Prevent duplicate API calls for identical concurrent requests
- Use in-flight request tracking (Map of request key → Promise)
- Automatic cleanup after request completes
- Transparent to callers (same API, better performance)

**Implementation Pattern**:
```typescript
// Pseudo-code for pattern
class ApiClient {
  private inFlightRequests = new Map<string, Promise<Response>>();

  async get(url: string): Promise<Response> {
    const key = this.generateKey(url);

    // If request in flight, return existing promise
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key)!;
    }

    // Otherwise, start new request
    const promise = this.executeRequest(url)
      .finally(() => this.inFlightRequests.delete(key));

    this.inFlightRequests.set(key, promise);
    return promise;
  }
}
```

### 8. Testing Strategy

**Decision**: Three-tier testing approach

**Test Pyramid**:
1. **Unit Tests** (70%): Fast, isolated, mock external dependencies
   - Validators: test all validation rules and edge cases
   - Cache: test eviction, TTL, hit/miss behavior
   - Error handling: test error formatting and sanitization
   - Retry logic: test backoff calculations and retry conditions

2. **Integration Tests** (25%): Test component interactions
   - API client: test real HTTP calls to Education Data API (or mock server)
   - End-to-end tool handlers: test full request→response flow
   - Cache integration: test cache hits/misses with real API client

3. **Contract Tests** (5%): Verify external API compatibility
   - Test Education Data API response format matches expectations
   - Test error responses from API are handled correctly
   - Detect breaking changes in upstream API

**Coverage Goals**:
- Overall: 80% minimum
- Critical paths (validation, error handling, API calls): 90%+
- Configuration/constants: excluded from coverage

### 9. Code Quality Tools

**Decision**: ESLint + Prettier + TypeScript strict mode

**Configuration**:
- **ESLint**: `@typescript-eslint/recommended`, plus security rules
- **Prettier**: Standard config with 2-space indent, single quotes, trailing commas
- **TypeScript**: Strict mode enabled (no implicit any, strict null checks)
- **Pre-commit hooks**: Husky + lint-staged (auto-format on commit)

**Justification**:
- Industry standard tooling, familiar to contributors
- Automated enforcement prevents bikeshedding
- Catches common errors before runtime
- Improves readability and consistency

### 10. Modularization Strategy

**Decision**: Incremental refactoring with strangler fig pattern

**Approach**:
1. **Phase 1**: Extract utilities and models (no behavior change)
   - Move types to `src/models/types.ts`
   - Move constants to `src/config/constants.ts`
   - Extract endpoint metadata to `src/config/endpoints.ts`

2. **Phase 2**: Extract services (behavior preserved, testable)
   - Create `src/services/api-client.ts` with existing HTTP logic
   - Create `src/services/cache.ts` (new functionality)
   - Create `src/services/validator.ts` (new functionality)
   - Create `src/services/logger.ts` (upgrade console.log/error)

3. **Phase 3**: Refactor handlers (inject dependencies)
   - Split `src/handlers/tools.ts` and `src/handlers/resources.ts`
   - Wire dependencies through constructor injection
   - Original `index.ts` becomes thin initialization layer

4. **Phase 4**: Add missing features (tests first)
   - Input validation (TDD)
   - Caching (TDD)
   - Retry logic (TDD)
   - Enhanced error handling (TDD)

**Testing During Refactoring**:
- Run existing inspector tests after each phase
- No new features until code is modular
- Add tests for each extracted module
- Integration tests ensure behavior unchanged

## Summary

All NEEDS CLARIFICATION items resolved. Technology decisions:
- **Testing**: Vitest + c8 coverage
- **Validation**: Zod schemas
- **Caching**: lru-cache package
- **Logging**: pino structured logger
- **Quality**: ESLint + Prettier + TypeScript strict

Next phase: Create data model and API contracts based on these decisions.
