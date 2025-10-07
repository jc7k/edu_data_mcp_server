# Source Code Architecture

This document describes the modular architecture of the Education Data MCP Server.

## Directory Structure

```
src/
├── index.ts           # Entry point (27 lines)
├── server.ts          # MCP server configuration
├── config/            # Configuration and constants
│   ├── constants.ts   # API limits, cache TTLs, validation rules
│   └── endpoints.ts   # Available API endpoints metadata
├── models/            # TypeScript type definitions
│   └── types.ts       # All interfaces and types
├── services/          # Business logic services
│   └── api-client.ts  # HTTP client for Education Data API
├── handlers/          # MCP request handlers
│   ├── tools.ts       # Tool call handlers
│   └── resources.ts   # Resource handlers
└── utils/             # Utility functions
    └── errors.ts      # Custom error classes and formatting
```

## Module Dependency Graph

```
index.ts
  └── server.ts
        ├── handlers/tools.ts
        │     ├── services/api-client.ts
        │     │     ├── config/constants.ts
        │     │     ├── models/types.ts
        │     │     └── utils/errors.ts
        │     ├── models/types.ts
        │     └── utils/errors.ts
        └── handlers/resources.ts
              ├── config/endpoints.ts
              │     └── models/types.ts
              └── models/types.ts
```

## Module Descriptions

### Entry Point

- **index.ts**: Bootstrap server initialization (27 lines)
  - Creates server instance via `createServer()`
  - Sets up stdio transport
  - Error handling for startup failures

### Core Server

- **server.ts**: MCP server configuration and request routing
  - Creates MCP Server instance with capabilities
  - Wires request handlers for tools and resources
  - No business logic - pure dependency injection

### Configuration

- **config/constants.ts**: Application constants
  - API base URL
  - Cache configuration (TTLs, max entries)
  - Request limits and timeouts
  - Retry configuration
  - Validation patterns

- **config/endpoints.ts**: API endpoint metadata
  - Static list of available endpoints
  - Endpoint lookup functions
  - Conversion utilities for metadata formats

### Models

- **models/types.ts**: TypeScript type definitions
  - Request types: `EducationDataRequest`, `SummaryDataRequest`
  - Domain types: `EndpointMetadata`, `CacheEntry`, `ApiRequest`
  - Error types: `RetryConfig`, `LogContext`
  - Observability types: `HealthStatus`, `Metrics`

### Services

- **services/api-client.ts**: HTTP client for Education Data API
  - URL construction: `buildEducationDataUrl()`, `buildSummaryDataUrl()`
  - Data fetching: `fetchEducationData()`, `fetchSummaryData()`
  - Error mapping: `mapAxiosError()`
  - Preserves exact behavior from original implementation

### Handlers

- **handlers/tools.ts**: MCP tool call handlers
  - Tool definitions (JSON schema)
  - Tool call routing: `handleToolCall()`
  - Individual handlers: `handleGetEducationData()`, `handleGetEducationDataSummary()`
  - Validation and error conversion to MCP errors

- **handlers/resources.ts**: MCP resource handlers
  - Resource listing: `listResources()`
  - Template listing: `listResourceTemplates()`
  - Resource reading: `readResource()`
  - URI parsing and endpoint lookup

### Utilities

- **utils/errors.ts**: Error handling utilities
  - Custom errors: `ValidationError`, `ApiError`
  - Error formatting: `formatErrorForClient()`
  - Structured logging: `logErrorWithContext()`
  - Retry detection: `isRetryableError()`

## Import Rules

1. **No Circular Dependencies**: Dependencies flow in one direction (downward in the graph)
2. **Use .js Extensions**: All imports use `.js` extension for ESM compatibility
3. **Type Imports**: Use `import type` for types to enable type-only imports
4. **Barrel Files**: Avoid barrel files (index.ts re-exports) to maintain explicit imports

## Testing Strategy

- **Unit Tests**: Test individual modules in isolation
  - `tests/unit/services/` - Service layer tests
  - `tests/unit/handlers/` - Handler tests
  - `tests/unit/utils/` - Utility tests

- **Integration Tests**: Test module interactions
  - `tests/integration/` - End-to-end MCP tool calls

- **Fixtures**: Shared test data
  - `tests/fixtures/mock-responses.ts` - Mock API responses
  - `tests/fixtures/test-data.ts` - Test input data

## Migration Notes

This modular architecture was created using the Strangler Fig pattern:

1. **Phase 1**: Created new modules alongside original `index.ts`
2. **Phase 2**: Extracted logic into separate modules (preserving behavior)
3. **Phase 3**: Refactored `index.ts` to slim entry point (27 lines)

The original monolithic `index.ts` (~500 lines) has been decomposed into:
- 1 entry point (27 lines)
- 1 server config (57 lines)
- 2 config modules
- 1 models module
- 1 service module
- 2 handler modules
- 1 utils module

Total: ~800 lines across 9 files, with improved:
- **Testability**: Each module can be tested in isolation
- **Maintainability**: Changes are localized to specific modules
- **Clarity**: Clear separation of concerns
