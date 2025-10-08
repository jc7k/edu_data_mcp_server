# Implementation Plan: Response Size Optimization and Pagination Controls

**Branch**: `002-implement-response-size` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-implement-response-size/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement response size optimization and pagination controls to prevent massive token usage (4.4M tokens) in MCP server responses. The solution introduces default limits (20 records), compact JSON formatting, pagination metadata, and optional field selection. This ensures AI agents can query large education datasets without exceeding context windows while maintaining backward compatibility.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Node.js (ES2022 modules)
**Primary Dependencies**: @modelcontextprotocol/sdk (0.6.0), axios (1.8.4), zod (4.1.12 - validation)
**Storage**: N/A (stateless proxy to Urban Institute Education Data API)
**Testing**: Vitest (3.2.4) with unit, integration, and contract tests
**Target Platform**: Node.js server (CLI via stdio transport, npx distribution)
**Project Type**: Single project (MCP server library)
**Performance Goals**:
- Response generation under 3 seconds for paginated queries
- Token reduction from 4.4M to under 10K tokens
- Support datasets with 10K+ records through pagination

**Constraints**:
- Backward compatibility required (existing queries must work)
- Stateless operation (no session/cache required for pagination)
- API response time limited by Urban Institute API (external dependency)
- Maximum response size: configurable threshold (default 10K tokens estimated)

**Scale/Scope**:
- Support pagination of datasets up to 10K+ records
- Default limit: 20 records per request
- Maximum limit: 1000 records per request
- Field selection for endpoints with 10+ fields

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS (No constitution file defined - using default gates)

Since no project constitution is defined (`.specify/memory/constitution.md` is a template), we apply standard software engineering gates:

### Default Quality Gates
- ✅ **Modularity**: Changes isolated to services/handlers/models layers
- ✅ **Testability**: All new logic is unit testable (pagination, validation, formatting)
- ✅ **Backward Compatibility**: Existing queries continue to work (no breaking changes)
- ✅ **Documentation**: Tool descriptions updated with pagination parameters
- ✅ **Error Handling**: Validation for invalid limits, pages, fields

### Feature-Specific Gates
- ✅ **Performance**: Response size reduction is measurable (token count validation)
- ✅ **Usability**: Pagination metadata makes navigation discoverable
- ✅ **Safety**: Maximum limits prevent accidental large queries

**Re-evaluation after Phase 1 design**: Required to verify contract design doesn't introduce complexity violations.

## Project Structure

### Documentation (this feature)

```
specs/002-implement-response-size/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── pagination-api.yaml   # OpenAPI-style contract for pagination parameters
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── config/
│   ├── constants.ts         # [MODIFY] Update DEFAULT_LIMIT, add pagination constants
│   └── endpoints.ts         # [READ ONLY] Endpoint metadata
├── handlers/
│   ├── tools.ts             # [MODIFY] Update response formatting (compact JSON)
│   └── resources.ts         # [READ ONLY] Resource handlers
├── models/
│   ├── types.ts             # [MODIFY] Add pagination types (PaginationParams, PaginationMetadata)
│   └── schemas.ts           # [MODIFY] Add zod schemas for pagination validation
├── services/
│   ├── api-client.ts        # [MODIFY] Add pagination logic to URL builders
│   ├── validator.ts         # [MODIFY] Add pagination parameter validation
│   └── response-formatter.ts  # [NEW] Handle compact JSON, field selection, pagination metadata
├── utils/
│   └── errors.ts            # [MODIFY] Add pagination-specific error types
├── index.ts                 # [READ ONLY] Entry point
└── server.ts                # [READ ONLY] Server configuration

tests/
├── unit/
│   ├── pagination.test.ts        # [NEW] Test pagination logic
│   ├── response-formatter.test.ts # [NEW] Test response formatting
│   └── validator.test.ts         # [MODIFY] Add pagination validation tests
├── integration/
│   └── pagination-flow.test.ts   # [NEW] End-to-end pagination scenarios
└── fixtures/
    └── large-dataset.json        # [NEW] Mock data for pagination testing
```

**Structure Decision**: Single project structure (Option 1) is appropriate. This is a Node.js library/CLI tool, not a web application. The existing modular structure (config, handlers, models, services, utils) provides clear separation of concerns for adding pagination features. No frontend/backend split needed.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

N/A - No constitution violations. All changes follow existing architectural patterns:
- Pagination logic added to existing services layer
- New types added to existing models layer
- Validation follows existing zod schema patterns
- Response formatting extracted to dedicated service (single responsibility)

---

## Phase 0: Research & Decisions

### Research Tasks

The following research tasks will be dispatched to resolve technical uncertainties and establish best practices for implementation:

#### RT-001: Urban Institute API Pagination Support
**Question**: Does the Education Data API support offset/page parameters natively, or must pagination be implemented client-side?

**Research Scope**:
- Review API documentation for pagination parameters
- Test API with limit/offset parameters
- Determine if API returns total count metadata
- Identify any API-specific pagination constraints

**Decision Impact**: Determines whether pagination is API-native (simple pass-through) or client-side (requires multiple API calls and state management).

#### RT-002: Token Estimation Strategy
**Question**: How to accurately estimate response token count before sending to prevent exceeding thresholds?

**Research Scope**:
- Review token counting methods for JSON data
- Evaluate approximate character-to-token ratios
- Determine if exact tokenization is needed or approximation sufficient
- Consider performance impact of token counting

**Decision Impact**: Affects whether we need tiktoken library or can use character-based estimation.

#### RT-003: Field Selection Implementation Pattern
**Question**: How to implement field filtering - at API level (if supported) or post-processing?

**Research Scope**:
- Check if Education Data API supports field selection parameters
- Evaluate client-side field filtering performance
- Determine impact on pagination metadata accuracy
- Consider backward compatibility with full responses

**Decision Impact**: Determines implementation complexity and whether field selection affects API calls or just response formatting.

#### RT-004: Pagination Metadata Standards
**Question**: What pagination metadata format best serves AI agents querying via MCP?

**Research Scope**:
- Review common pagination metadata standards (JSON:API, HAL, GraphQL)
- Evaluate AI agent needs for navigation (next_page vs cursor vs offset)
- Determine minimal metadata for effective pagination
- Consider MCP-specific best practices

**Decision Impact**: Affects response structure and ease of use for AI agents.

#### RT-005: Backward Compatibility Testing Strategy
**Question**: How to ensure existing queries continue working without specifying pagination parameters?

**Research Scope**:
- Identify existing query patterns in codebase/tests
- Determine default behavior for omitted parameters
- Evaluate risk of changing DEFAULT_LIMIT from 100 to 20
- Consider deprecation strategy if needed

**Decision Impact**: Affects rollout strategy and potential breaking changes.

### Expected Outcomes

After Phase 0 research, we will have:

1. **research.md** documenting:
   - API pagination capabilities and constraints
   - Token estimation approach (library vs approximation)
   - Field selection implementation strategy
   - Pagination metadata format
   - Backward compatibility approach

2. **Technology decisions**:
   - Whether to add tiktoken dependency or use character-based estimation
   - Pagination parameter names (page/offset, limit/per_page)
   - Metadata structure and field names
   - Default limit change strategy (breaking vs non-breaking)

3. **Architecture clarifications**:
   - Which layer handles pagination logic (api-client vs response-formatter)
   - How field selection integrates with pagination
   - Error handling strategy for invalid pagination parameters

---

## Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete

### Deliverables

#### 1. data-model.md

Define the data structures for pagination:

**Entities**:
- **PaginationParams**: User-provided pagination controls
  - `page`: Page number (1-indexed)
  - `limit`: Records per page (default: 20, max: 1000)
  - `offset`: Alternative to page (0-indexed record offset)

- **PaginationMetadata**: Response metadata for navigation
  - `total_count`: Total records available
  - `current_page`: Current page number
  - `page_size`: Records returned in current page
  - `has_more`: Boolean indicating more results available
  - `next_page`: Next page number (null if last page)

- **ResponseEnvelope**: Wrapper for paginated responses
  - `results`: Array of data records
  - `pagination`: PaginationMetadata object

- **FieldSelectionParams**: Optional field filtering
  - `fields`: Array of field names to include

**Validation Rules**:
- `page` must be positive integer >= 1
- `limit` must be positive integer <= 1000
- `offset` must be non-negative integer
- `fields` must be array of valid field names for endpoint
- Cannot specify both `page` and `offset` (mutually exclusive)

**State Transitions**: N/A (stateless pagination)

#### 2. contracts/ (OpenAPI-style documentation)

**File**: `contracts/pagination-api.yaml`

Defines the contract for pagination parameters and metadata:

```yaml
# Pagination Parameter Schema
PaginationParams:
  type: object
  properties:
    page:
      type: integer
      minimum: 1
      description: Page number (1-indexed)
    limit:
      type: integer
      minimum: 1
      maximum: 1000
      default: 20
      description: Records per page
    offset:
      type: integer
      minimum: 0
      description: Record offset (alternative to page)
    fields:
      type: array
      items:
        type: string
      description: Optional field selection

# Pagination Metadata Schema
PaginationMetadata:
  type: object
  required:
    - total_count
    - current_page
    - page_size
    - has_more
  properties:
    total_count:
      type: integer
      description: Total records available
    current_page:
      type: integer
      description: Current page number
    page_size:
      type: integer
      description: Records in current page
    has_more:
      type: boolean
      description: More results available
    next_page:
      type: integer
      nullable: true
      description: Next page number or null

# Response Envelope
PaginatedResponse:
  type: object
  required:
    - results
    - pagination
  properties:
    results:
      type: array
      items:
        type: object
    pagination:
      $ref: '#/PaginationMetadata'
```

#### 3. quickstart.md

User-facing guide for pagination:

**Topics**:
- Quick example: Basic paginated query
- Default behavior (20 records)
- Navigating pages (page vs offset)
- Field selection for efficiency
- Handling large datasets
- Error scenarios and troubleshooting

#### 4. Agent Context Update

Run: `.specify/scripts/bash/update-agent-context.sh claude`

**Context additions**:
- Technology: Zod for pagination validation
- Pattern: Response envelope pattern with metadata
- Architecture: response-formatter service for post-processing
- Testing: Vitest fixtures for large datasets

---

## Phase 2: Implementation Tasks

**NOTE**: Tasks are generated by `/speckit.tasks` command (not part of `/speckit.plan`).

This section is intentionally left empty. After Phase 1 design artifacts are complete, run `/speckit.tasks` to generate the dependency-ordered implementation task list in `tasks.md`.

Expected task categories:
1. Configuration updates (constants, schemas)
2. Core pagination logic (api-client, response-formatter)
3. Validation layer (parameter checking, error handling)
4. Tool definition updates (add pagination parameters)
5. Unit tests (pagination logic, validation, formatting)
6. Integration tests (end-to-end pagination flows)
7. Documentation updates (tool descriptions, README)

---

## Post-Phase 1 Constitution Re-Check

*To be completed after Phase 1 design*

**Re-evaluation criteria**:
- ✅ Does pagination logic stay in services layer? (no cross-cutting concerns)
- ✅ Are response envelopes backward compatible? (existing queries return same structure)
- ✅ Do contracts follow existing patterns? (consistent with current MCP tool schemas)
- ✅ Is complexity justified? (no over-engineering, minimal new abstractions)

**Status**: Pending Phase 1 completion

---

## Notes

### Key Design Decisions Pending Research

1. **API vs Client-Side Pagination**: If the Education Data API doesn't support pagination natively, we must implement client-side batching, which increases complexity.

2. **Token Estimation**: Character-based approximation (1 token ≈ 4 characters) is simpler but less accurate than tiktoken library. Research will determine acceptable trade-off.

3. **Default Limit Change**: Changing from 100 to 20 is technically breaking but may be justified by the 4.4M token issue. Research will inform rollout strategy (immediate vs deprecation).

4. **Field Selection Scope**: If API doesn't support field filtering, client-side filtering still reduces tokens but doesn't save API bandwidth. Research determines priority.

### Success Metrics Validation

After implementation, validate against spec success criteria:
- **SC-001**: Measure actual token count for 1000 record query
- **SC-002**: Automated test verifying 20 records default
- **SC-003**: Integration test with 10K+ dataset
- **SC-004**: Performance benchmark for response time
- **SC-005**: Token measurement across query patterns
- **SC-007**: Field selection efficiency test

### Rollout Considerations

- Deploy behind feature flag if default limit change is risky
- Monitor token usage metrics post-deployment
- Provide migration guide if breaking changes necessary
- Consider versioning MCP tool definitions if non-backward compatible
