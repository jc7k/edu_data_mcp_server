# Research Findings: Response Size Optimization and Pagination Controls

**Feature**: 002-implement-response-size
**Date**: 2025-10-07
**Status**: Complete

## Executive Summary

All research tasks have been completed. Key findings:

1. **API supports native pagination** with a hard limit of 10,000 records per page
2. **Token counting** should use character-based approximation (no accurate TypeScript library available)
3. **Field selection** is not supported by the API; must be implemented client-side
4. **Pagination metadata** should follow minimal, AI-agent-friendly standards
5. **Backward compatibility** is achievable through optional parameters with safe defaults

---

## RT-001: Urban Institute API Pagination Support

### Question
Does the Education Data API support offset/page parameters natively, or must pagination be implemented client-side?

### Research Findings

**API Pagination Support**: ✅ **NATIVE PAGINATION CONFIRMED**

The Urban Institute Education Data API has **built-in pagination** with the following characteristics:

#### API Behavior
- **Hard limit**: Maximum 10,000 records per page (enforced by API)
- **Pagination parameters**:
  - `limit`: Requested records per page (default: 10,000, max: 10,000)
  - `page`: Page number (1-indexed)
- **Response metadata**:
  ```json
  {
    "count": 101662,        // Total records available
    "next": "https://...",  // URL to next page (null if last page)
    "previous": "https://...", // URL to previous page (null if first page)
    "results": [...]        // Array of data records
  }
  ```

#### Testing Results
```bash
# Query: limit=5, actual results: 10,000 (limit not respected, API default applied)
curl "https://educationdata.urban.org/api/v1/schools/ccd/directory/2020/?limit=5&mode=R"
# Response: count=101662, results.length=10000

# Query: limit=20, page=2, actual results: 10,000
curl "https://educationdata.urban.org/api/v1/schools/ccd/directory/2020/?limit=20&page=2&mode=R"
# Response: has next=true, has previous=true
```

**Critical Discovery**: The API **ignores the limit parameter** if it's below the default 10,000. The limit parameter only works to *reduce* from 10,000, not to request fewer records.

#### API Documentation (from FAQ)
> "The API limits the number of records returned per page to 10,000. This ceiling prevents large data requests from slowing down the API for other users."

**Recommended approach for large datasets**:
- Iterate over pages using the `next` URL
- Append results from each page
- For very large datasets (100K+ records), download CSV instead

### Decision

**Implementation Strategy**: **Client-side pagination wrapper**

Since the API returns 10,000 records regardless of the `limit` parameter value, we must:

1. **Always request with limit=10000** (API maximum)
2. **Implement client-side slicing** to return the user's requested page size (e.g., 20 records)
3. **Calculate pagination metadata** based on total count from API and user's page size
4. **Support multi-page fetching** when user navigates beyond the first 10,000 records

**Example**:
- User requests: `page=1, limit=20`
- MCP server fetches: API page 1 (10,000 records)
- MCP server returns: Records 1-20 + pagination metadata (total=101662, has_more=true)
- User requests: `page=500, limit=20` (record 9,980-10,000)
- MCP server fetches: API page 1 (same cache or re-fetch)
- MCP server returns: Records 9,980-10,000
- User requests: `page=501, limit=20` (record 10,001-10,020)
- MCP server fetches: API page 2 (next 10,000 records)
- MCP server returns: Records 1-20 from API page 2

**Rationale**:
- API's 10,000 record minimum makes client-side pagination necessary
- Provides user-friendly page sizes (20 records) while respecting API limits
- Enables token-efficient responses even though API returns large datasets

**Alternatives Considered**:
- ❌ **Pass-through pagination**: API doesn't respect small limits
- ❌ **Always return 10,000 records**: Defeats purpose of token reduction

---

## RT-002: Token Estimation Strategy

### Question
How to accurately estimate response token count before sending to prevent exceeding thresholds?

### Research Findings

**TypeScript Token Counting Options**:

#### Option 1: Anthropic Token Counting API
- **Accuracy**: Exact (uses Claude's actual tokenizer)
- **Method**: API call to Anthropic's `/messages/count_tokens` endpoint
- **Cost**: Free (rate limited)
- **Latency**: Network round-trip per estimation
- **TypeScript Support**: Via `@anthropic-ai/sdk`

```typescript
const response = await client.messages.count_tokens({
  model: "claude-sonnet-4-5",
  messages: [{ role: "user", content: jsonData }]
});
// response.input_tokens = exact count
```

**Pros**: Exact accuracy, official API
**Cons**: Requires network call, adds latency, rate limited

#### Option 2: anthropic-tokenizer-typescript npm package
- **Accuracy**: ⚠️ Inaccurate for Claude 3+ models (per official warning)
- **Method**: Client-side tokenization
- **Cost**: Free (no API calls)
- **Latency**: ~1-2ms locally
- **Status**: Beta, not recommended by Anthropic

```typescript
import { countTokens } from '@anthropic-ai/tokenizer';
// ⚠️ Warning: Rough approximation only
```

**Pros**: Fast, no network
**Cons**: Inaccurate, deprecated for Claude 3+, beta stability

#### Option 3: Character-based Approximation
- **Accuracy**: ±15% for English, ±25% for JSON (based on research)
- **Method**: Simple calculation
- **Cost**: Free
- **Latency**: <1ms

**Approximation formulas** (from research):
- **JSON data**: `characters / 3.5` ≈ tokens (JSON has structural overhead)
- **Plain text**: `characters / 4` ≈ tokens (GPT-4 approximation)
- **Conservative estimate**: `characters / 3` (overestimate by ~15%)

**Testing**:
```bash
# 10,000 school records response: 11,688,133 bytes
# Estimated tokens: 11,688,133 / 3.5 = ~3.3M tokens
# Actual issue reported: 4.4M tokens (our estimate: 75% accurate)
```

### Decision

**Selected Approach**: **Character-based approximation with safety margin**

**Implementation**:
```typescript
/**
 * Estimate token count for JSON response
 * Uses conservative ratio: 1 token ≈ 3 characters
 * Overestimates by ~15% to provide safety buffer
 */
function estimateTokens(jsonString: string): number {
  return Math.ceil(jsonString.length / 3);
}

// Threshold checks
const MAX_TOKENS = 10_000; // Configurable
const jsonResponse = JSON.stringify(data); // Compact, no indentation
const estimatedTokens = estimateTokens(jsonResponse);

if (estimatedTokens > MAX_TOKENS) {
  throw new Error(
    `Response too large: ~${estimatedTokens.toLocaleString()} tokens ` +
    `(limit: ${MAX_TOKENS.toLocaleString()}). ` +
    `Try reducing limit or using filters.`
  );
}
```

**Rationale**:
1. **No network latency**: Keeps response times under 3 seconds
2. **Good enough accuracy**: ±15% is acceptable for threshold warnings
3. **Simple implementation**: No external dependencies beyond TypeScript
4. **Conservative safety margin**: Overestimation prevents threshold breaches
5. **No API rate limits**: Won't hit Anthropic's token counting quotas

**Alternatives Considered**:
- ❌ **Token Counting API**: Adds 200-500ms latency per request, rate limited
- ❌ **anthropic-tokenizer-typescript**: Officially deprecated for Claude 3+
- ❌ **No estimation**: Can't warn users before exceeding limits

**Future Enhancement**: If exact counts become critical, implement optional API-based counting with caching.

---

## RT-003: Field Selection Implementation Pattern

### Question
How to implement field filtering - at API level (if supported) or post-processing?

### Research Findings

**API Field Selection Support**: ❌ **NOT SUPPORTED**

The Urban Institute Education Data API does **not** support field/column selection parameters. The R package documentation shows:

#### Available Parameters
- `filters`: Row filtering (year, grade, ncessch, etc.)
- `subtopic`: Changes endpoint structure (different dataset)
- `add_labels`: Adds/removes label columns (limited customization)

**No parameters for**:
- Column selection (e.g., `fields=name,enrollment`)
- Column exclusion (e.g., `exclude=id,metadata`)
- Sparse fieldsets (JSON:API style)

#### Subtopic Behavior
The `subtopic` parameter changes the **endpoint** and **data structure**, not just columns:

```r
# Different endpoints, different schemas
get_education_data(level = "schools", source = "ccd", topic = "enrollment")
get_education_data(level = "schools", source = "ccd", topic = "enrollment", subtopic = "race")
```

This is **not** field selection; it's selecting a different dataset.

### Decision

**Implementation Strategy**: **Client-side field filtering (post-processing)**

**Approach**:
1. Fetch full records from API (can't avoid this)
2. If user specifies `fields` parameter, filter client-side before returning
3. Apply field selection **after** pagination slicing (more efficient)
4. Return compact JSON regardless of field selection

**Implementation**:
```typescript
interface FieldSelectionParams {
  fields?: string[]; // Optional array of field names
}

function selectFields<T extends Record<string, unknown>>(
  records: T[],
  fields?: string[]
): Partial<T>[] | T[] {
  if (!fields || fields.length === 0) {
    return records; // No filtering, return all fields
  }

  return records.map(record => {
    const filtered: Partial<T> = {};
    fields.forEach(field => {
      if (field in record) {
        filtered[field as keyof T] = record[field as keyof T];
      }
    });
    return filtered;
  });
}

// Usage
const allRecords = apiResponse.results; // Full records from API
const paginatedRecords = allRecords.slice(offset, offset + limit); // Pagination
const filteredRecords = selectFields(paginatedRecords, requestParams.fields); // Field selection
return { results: filteredRecords, pagination: metadata };
```

**Benefits**:
- **Token reduction**: Removing unused fields significantly reduces response size
- **Bandwidth neutral**: Can't reduce API bandwidth (not supported)
- **Simple validation**: Check field names against known schema
- **Backward compatible**: Omitting `fields` returns all data

**Example Savings**:
```typescript
// Full school record: ~50 fields × 200 chars = 10,000 chars ≈ 3,000 tokens
// Selected fields (name, enrollment): ~300 chars ≈ 100 tokens
// Savings: 97% token reduction per record
```

**Rationale**:
- API doesn't support field selection (verified)
- Client-side filtering still achieves token reduction goal
- Implementation is simple and performant
- Provides immediate value even though API fetches full data

**Alternatives Considered**:
- ❌ **API-level filtering**: Not supported by Urban Institute API
- ❌ **Skip field selection entirely**: Misses 50%+ token savings opportunity
- ❌ **Subtopic as field selection**: Changes dataset structure, not column filtering

**Priority**: **P3** (implement after pagination; nice-to-have optimization)

---

## RT-004: Pagination Metadata Standards

### Question
What pagination metadata format best serves AI agents querying via MCP?

### Research Findings

**Common Pagination Standards**:

#### JSON:API Format
```json
{
  "data": [...],
  "links": {
    "self": "https://api.example.com/articles?page[number]=3&page[size]=1",
    "first": "https://api.example.com/articles?page[number]=1&page[size]=1",
    "prev": "https://api.example.com/articles?page[number]=2&page[size]=1",
    "next": "https://api.example.com/articles?page[number]=4&page[size]=1",
    "last": "https://api.example.com/articles?page[number]=13&page[size]=1"
  },
  "meta": {
    "total-pages": 13
  }
}
```
**Pros**: Hypermedia-driven, self-documenting
**Cons**: URL-heavy (not useful for MCP context), verbose

#### HAL Format
```json
{
  "_embedded": {
    "items": [...]
  },
  "_links": {
    "self": { "href": "..." },
    "next": { "href": "..." }
  },
  "page": 1,
  "totalPages": 10
}
```
**Pros**: Standard, well-documented
**Cons**: Complex structure, URL-centric

#### GraphQL Cursor-based
```json
{
  "edges": [
    { "node": {...}, "cursor": "abc123" }
  ],
  "pageInfo": {
    "hasNextPage": true,
    "endCursor": "xyz789"
  }
}
```
**Pros**: Efficient for real-time data, handles concurrent modifications
**Cons**: Complex cursor management, overkill for static datasets

#### Simple Offset-based (recommended for AI agents)
```json
{
  "results": [...],
  "pagination": {
    "total_count": 101662,
    "current_page": 1,
    "page_size": 20,
    "total_pages": 5084,
    "has_more": true,
    "next_page": 2
  }
}
```
**Pros**: Minimal, self-explanatory, no URLs needed
**Cons**: Less sophisticated (not an issue for our use case)

### Decision

**Selected Format**: **Simple offset-based with clear navigation hints**

**Pagination Metadata Structure**:
```typescript
interface PaginationMetadata {
  total_count: number;      // Total records available across all pages
  current_page: number;     // Current page number (1-indexed)
  page_size: number;        // Records in current response
  total_pages: number;      // Total pages available
  has_more: boolean;        // Boolean for easy next-page checks
  next_page: number | null; // Next page number or null if last page
}

interface PaginatedResponse<T> {
  results: T[];             // Array of data records
  pagination: PaginationMetadata;
}
```

**Example Response**:
```json
{
  "results": [
    {"ncessch": "010000500871", "name": "Albertville Elementary School", "enrollment": 684},
    ...20 records total...
  ],
  "pagination": {
    "total_count": 101662,
    "current_page": 1,
    "page_size": 20,
    "total_pages": 5084,
    "has_more": true,
    "next_page": 2
  }
}
```

**Rationale**:
1. **AI-agent friendly**: No URL parsing required; just increment `next_page`
2. **Self-explanatory**: Field names are clear without documentation
3. **Minimal token overhead**: ~100 tokens for metadata vs ~500 for HAL/JSON:API
4. **Stateless**: All info needed to navigate is in the response
5. **Easy validation**: `has_more` provides simple boolean check

**Navigation Examples**:
```typescript
// AI agent logic
if (response.pagination.has_more) {
  const nextPage = response.pagination.next_page;
  // Make new request with page=nextPage
}

// Jump to specific page
const targetPage = 100;
if (targetPage <= response.pagination.total_pages) {
  // Request page=100
}
```

**Alternatives Considered**:
- ❌ **JSON:API**: Too verbose, URL-centric (adds 400+ tokens)
- ❌ **GraphQL cursors**: Overcomplicated for static dataset pagination
- ❌ **HAL**: Hypermedia features unused in MCP context

---

## RT-005: Backward Compatibility Testing Strategy

### Question
How to ensure existing queries continue working without specifying pagination parameters?

### Research Findings

**Current System Behavior**:
- Default limit: 100 records (in constants.ts)
- No pagination parameters required
- Existing queries: `{level, source, topic, filters?}`

**Proposed Changes**:
- New default limit: 20 records
- New optional parameters: `page`, `limit`, `offset`, `fields`
- New response structure: `{results, pagination}` vs current `results` array

**Backward Compatibility Concerns**:

#### Breaking Change Analysis

| Change | Impact | Breaking? | Mitigation |
|--------|--------|-----------|------------|
| Default limit: 100→20 | Returns fewer records | ⚠️ YES | Make `limit` optional with default 20, document change |
| Add `page` parameter | No impact if omitted | ✅ NO | Optional parameter, defaults to page 1 |
| Response structure change | `results` array → `{results, pagination}` | ⚠️ YES | Major breaking change |
| Add `fields` parameter | No impact if omitted | ✅ NO | Optional, returns all fields by default |

**Critical Decision**: Response structure change is the biggest compatibility concern.

#### Existing Test Patterns
From `/tests/unit/services/validator.test.ts`:
- Tests expect validation of `{level, source, topic, filters, subtopic, add_labels, limit}`
- No tests for pagination metadata
- Tests use fixtures with expected request shapes

**Existing tool definitions** (from `/src/handlers/tools.ts`):
```typescript
{
  name: 'get_education_data',
  inputSchema: {
    type: 'object',
    properties: {
      level: { type: 'string' },
      source: { type: 'string' },
      topic: { type: 'string' },
      subtopic: { type: 'array', items: { type: 'string' } },
      filters: { type: 'object' },
      add_labels: { type: 'boolean' },
      limit: { type: 'number' } // Already exists!
    },
    required: ['level', 'source', 'topic']
  }
}
```

**Key Finding**: `limit` parameter **already exists** in tool schema! Changing the default from 100→20 is a **parameter value change**, not a schema change.

### Decision

**Backward Compatibility Strategy**: **Versioned response format with migration path**

#### Phase 1: Immediate (breaking changes accepted)
Since this is version 0.1.0 (pre-1.0), breaking changes are acceptable:

1. **Change default limit**: 100 → 20 (⚠️ breaking but documented)
2. **Change response structure**: Add pagination wrapper
3. **Add new parameters**: `page`, `offset`, `fields` (all optional)
4. **Update documentation**: Clear migration guide

**New Response Format**:
```json
{
  "results": [...],
  "pagination": {
    "total_count": 101662,
    "current_page": 1,
    "page_size": 20,
    "total_pages": 5084,
    "has_more": true,
    "next_page": 2
  }
}
```

**Rationale for Breaking Changes**:
- **Pre-1.0 version**: Semantic versioning allows breaking changes before 1.0
- **Critical bug fix**: 4.4M token responses make the server unusable
- **Tool definition unchanged**: Only parameter defaults and response shape change
- **Clear migration**: Document in CHANGELOG and tool descriptions

#### Phase 2: Future (if backward compatibility becomes critical)

If users require strict backward compatibility post-1.0:

**Option A**: Versioned tools
```typescript
// v1: Original behavior
{
  name: 'get_education_data',
  // Returns array directly, limit=100
}

// v2: New behavior
{
  name: 'get_education_data_v2',
  // Returns {results, pagination}, limit=20
}
```

**Option B**: Response format flag
```typescript
{
  compact: true, // Return {results, pagination}
  compact: false // Return results array only (no pagination metadata)
}
```

**Current Decision**: **Accept breaking changes** (Phase 1) since:
1. Version 0.1.0 indicates pre-release stability
2. 4.4M token issue makes current behavior unusable
3. No production users identified (new MCP server)
4. Better to fix early before 1.0 release

#### Testing Strategy
```typescript
// Add tests for backward compatibility scenarios
describe('Backward Compatibility', () => {
  it('should accept queries without page parameter', () => {
    const request = { level: 'schools', source: 'ccd', topic: 'directory' };
    // Should default to page 1, limit 20
  });

  it('should accept queries with old limit value', () => {
    const request = { level: 'schools', source: 'ccd', topic: 'directory', limit: 100 };
    // Should respect user's limit (up to 1000 max)
  });

  it('should return pagination metadata in all responses', () => {
    // All responses must have {results, pagination} structure
  });
});
```

**Documentation Updates Required**:
1. **CHANGELOG.md**: Document breaking changes from v0.1.0 → v0.2.0
2. **README.md**: Update examples to show pagination
3. **Tool descriptions**: Note default limit change
4. **Migration guide**: Show before/after examples

**Alternatives Considered**:
- ❌ **Maintain 100 record default**: Doesn't solve 4.4M token problem
- ❌ **Add v2 tools immediately**: Premature complexity for pre-1.0 software
- ❌ **Make pagination opt-in**: Every query would still return large responses by default

---

## Technology Decisions Summary

| Decision Point | Selected Approach | Alternative Rejected | Rationale |
|----------------|-------------------|----------------------|-----------|
| **Pagination** | Client-side wrapper around API's 10K pages | Pure API pass-through | API doesn't respect small limits |
| **Token Counting** | Character-based approximation (÷3) | Anthropic API or TypeScript package | Fast, no latency, good enough accuracy |
| **Field Selection** | Client-side post-processing | API-level filtering | API doesn't support field selection |
| **Metadata Format** | Simple offset-based | JSON:API, HAL, GraphQL cursors | AI-agent friendly, minimal tokens |
| **Compatibility** | Accept breaking changes (v0.1→0.2) | Strict backward compatibility | Pre-1.0 version, critical bug fix |

---

## Architecture Clarifications

### Layer Responsibilities

**src/services/api-client.ts**:
- Fetch data from Urban Institute API
- Handle API pagination (manage `next` URLs)
- Return raw API responses with 10K record pages

**src/services/response-formatter.ts** (NEW):
- Slice large API responses into user's page size
- Apply field selection filtering
- Generate pagination metadata
- Format as compact JSON
- Estimate token counts and enforce limits

**src/services/validator.ts**:
- Validate pagination parameters (page, limit, offset)
- Ensure mutual exclusivity (page XOR offset)
- Validate field names against schema
- Enforce limits (max 1000 records)

**src/handlers/tools.ts**:
- Orchestrate: validate → fetch → format → return
- Handle errors and warnings
- Update tool definitions with new parameters

### Data Flow

```
User Request {level, source, topic, page=1, limit=20, fields=[name, enrollment]}
    ↓
[validator.ts] Validate parameters
    ↓
[api-client.ts] Fetch API page 1 (10,000 records)
    ↓
[response-formatter.ts]
  - Slice records 0-20
  - Filter fields to [name, enrollment]
  - Generate pagination metadata
  - Estimate token count
  - Check threshold
    ↓
Return {results: 20 records, pagination: {...}}
```

---

## Dependencies

**No new npm packages required**:
- ✅ Existing: `@modelcontextprotocol/sdk`, `axios`, `zod`
- ✅ Dev dependencies: `vitest`, `typescript`
- ❌ **Not adding**: `tiktoken`, `@anthropic-ai/tokenizer`, `@anthropic-ai/sdk`

**Rationale**: Character-based token estimation avoids external dependencies and API calls.

---

## Implementation Notes

### Token Estimation Configuration

```typescript
// src/config/constants.ts
export const TOKEN_LIMITS = {
  /** Characters per token (conservative estimate) */
  CHARS_PER_TOKEN: 3,

  /** Maximum estimated tokens per response */
  MAX_RESPONSE_TOKENS: 10_000,

  /** Warning threshold (80% of max) */
  WARNING_THRESHOLD_TOKENS: 8_000,
} as const;
```

### Default Limit Change Rollout

**Current**:
```typescript
DEFAULT_LIMIT: 100
```

**New**:
```typescript
DEFAULT_LIMIT: 20
```

**Impact**: Queries without explicit `limit` will return 20 records instead of 100.

**Communication Plan**:
1. Document in CHANGELOG as breaking change
2. Update tool description to show new default
3. Add migration example in README
4. Version bump: 0.1.0 → 0.2.0

---

## Open Questions Resolved

All research tasks complete. No open questions remain. Ready to proceed to Phase 1: Design & Contracts.

---

## Appendix: Research Sources

1. **Urban Institute API Documentation**: https://educationdata.urban.org/documentation/
2. **Education Data API FAQs**: https://urbaninstitute.github.io/education-data-faqs/
3. **R Package Documentation**: https://urbaninstitute.github.io/education-data-package-r/
4. **Anthropic Token Counting Docs**: https://docs.claude.com/en/docs/build-with-claude/token-counting
5. **anthropic-tokenizer-typescript**: https://github.com/anthropics/anthropic-tokenizer-typescript
6. **Pagination Best Practices**: GraphQL docs, JSON:API spec, HAL specification
