# Data Model: Response Size Optimization and Pagination Controls

**Feature**: 002-implement-response-size
**Date**: 2025-10-07
**Status**: Design Complete

## Overview

This document defines the data structures, types, and validation rules for implementing pagination and response size optimization in the Education Data MCP server.

---

## Core Entities

### 1. PaginationParams

User-provided pagination control parameters.

**Purpose**: Allow users to specify how many records they want and which page

**Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (1-indexed). Mutually exclusive with `offset`. |
| `limit` | integer | No | 20 | Records per page. Min: 1, Max: 1000. |
| `offset` | integer | No | 0 | Record offset (0-indexed). Mutually exclusive with `page`. |

**TypeScript Definition**:
```typescript
interface PaginationParams {
  page?: number;      // 1-indexed page number
  limit?: number;     // Records per page (default: 20, max: 1000)
  offset?: number;    // 0-indexed offset (alternative to page)
}
```

**Validation Rules**:
- `page` must be >= 1 (positive integer)
- `limit` must be >= 1 and <= 1000
- `offset` must be >= 0 (non-negative integer)
- Cannot specify both `page` and `offset` (mutually exclusive)
- If `page` is specified, `offset` is calculated as: `(page - 1) * limit`
- If `offset` is specified, `page` is calculated as: `Math.floor(offset / limit) + 1`

**Examples**:
```typescript
// Page-based pagination
{ page: 1, limit: 20 }  // Records 1-20
{ page: 2, limit: 20 }  // Records 21-40

// Offset-based pagination
{ offset: 0, limit: 20 }  // Records 1-20
{ offset: 20, limit: 20 } // Records 21-40

// Invalid
{ page: 2, offset: 40, limit: 20 }  // ERROR: Cannot specify both page and offset
{ page: 0, limit: 20 }              // ERROR: Page must be >= 1
{ page: 1, limit: 2000 }            // ERROR: Limit exceeds maximum (1000)
```

---

### 2. PaginationMetadata

Response metadata that helps users navigate through paginated results.

**Purpose**: Provide navigation hints and context about the current page

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `total_count` | integer | Yes | Total records available across all pages |
| `current_page` | integer | Yes | Current page number (1-indexed) |
| `page_size` | integer | Yes | Number of records in current response |
| `total_pages` | integer | Yes | Total pages available with current limit |
| `has_more` | boolean | Yes | True if more results exist beyond current page |
| `next_page` | integer \| null | Yes | Next page number, or null if on last page |

**TypeScript Definition**:
```typescript
interface PaginationMetadata {
  total_count: number;      // Total records available
  current_page: number;     // Current page (1-indexed)
  page_size: number;        // Records in this response
  total_pages: number;      // Total pages available
  has_more: boolean;        // More results available?
  next_page: number | null; // Next page number or null
}
```

**Calculation Logic**:
```typescript
function calculatePaginationMetadata(
  totalCount: number,
  currentPage: number,
  limit: number,
  actualRecordsReturned: number
): PaginationMetadata {
  const totalPages = Math.ceil(totalCount / limit);
  const hasMore = currentPage < totalPages;
  const nextPage = hasMore ? currentPage + 1 : null;

  return {
    total_count: totalCount,
    current_page: currentPage,
    page_size: actualRecordsReturned,
    total_pages: totalPages,
    has_more: hasMore,
    next_page: nextPage,
  };
}
```

**Examples**:
```typescript
// Dataset: 101,662 total schools, requesting page 1 with limit 20
{
  total_count: 101662,
  current_page: 1,
  page_size: 20,
  total_pages: 5084,
  has_more: true,
  next_page: 2
}

// Last page (page 5084)
{
  total_count: 101662,
  current_page: 5084,
  page_size: 2,        // Only 2 records on last page
  total_pages: 5084,
  has_more: false,
  next_page: null      // No more pages
}

// Empty result
{
  total_count: 0,
  current_page: 1,
  page_size: 0,
  total_pages: 0,
  has_more: false,
  next_page: null
}
```

---

### 3. PaginatedResponse

Wrapper for all paginated API responses.

**Purpose**: Consistent response structure with data + metadata

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `results` | array | Yes | Array of data records (schools, districts, etc.) |
| `pagination` | PaginationMetadata | Yes | Pagination navigation metadata |

**TypeScript Definition**:
```typescript
interface PaginatedResponse<T> {
  results: T[];                  // Array of records (generic type)
  pagination: PaginationMetadata; // Pagination info
}
```

**Generic Usage**:
```typescript
// For school records
type SchoolRecord = {
  ncessch: string;
  name: string;
  enrollment: number;
  // ... other fields
};

type SchoolResponse = PaginatedResponse<SchoolRecord>;

// For summary records
type SummaryRecord = {
  year: number;
  total_enrollment: number;
  // ... other fields
};

type SummaryResponse = PaginatedResponse<SummaryRecord>;
```

**Example Response**:
```json
{
  "results": [
    {
      "ncessch": "010000500871",
      "name": "Albertville Elementary School",
      "enrollment": 684,
      "city": "Albertville",
      "state_location": "AL"
    },
    {
      "ncessch": "010000500872",
      "name": "Albertville High School",
      "enrollment": 1245,
      "city": "Albertville",
      "state_location": "AL"
    }
    // ... 18 more records (20 total)
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

---

### 4. FieldSelectionParams

Optional field filtering to reduce response size.

**Purpose**: Allow users to request only specific fields they need

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fields` | string[] | No | Array of field names to include in response |

**TypeScript Definition**:
```typescript
interface FieldSelectionParams {
  fields?: string[];  // Optional array of field names
}
```

**Validation Rules**:
- If `fields` is omitted or empty, return all fields (backward compatible)
- If `fields` is provided, validate each field name against the endpoint schema
- Unknown field names should return an error with available field list
- Field names are case-sensitive

**Examples**:
```typescript
// Request only name and enrollment
{ fields: ['name', 'enrollment'] }

// Request multiple fields
{ fields: ['ncessch', 'name', 'city', 'state_location', 'enrollment'] }

// Invalid field
{ fields: ['invalid_field'] }
// ERROR: Unknown field 'invalid_field'. Available fields: ncessch, name, ...
```

**Field Selection Output**:
```typescript
// Without field selection (all fields returned)
{
  "ncessch": "010000500871",
  "name": "Albertville Elementary School",
  "enrollment": 684,
  "city": "Albertville",
  "state_location": "AL",
  "county_name": "Marshall County",
  "zip_location": "35950",
  "phone": "(256) 891-0123",
  // ... 40+ more fields
}

// With field selection: fields=['name', 'enrollment']
{
  "name": "Albertville Elementary School",
  "enrollment": 684
}
// Token savings: ~3000 tokens → ~100 tokens (97% reduction)
```

---

### 5. TokenEstimate

Metadata for response size validation.

**Purpose**: Track estimated token counts and enforce limits

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `estimated_tokens` | integer | Estimated token count for response |
| `character_count` | integer | Actual character count of JSON string |
| `exceeds_limit` | boolean | Whether estimate exceeds threshold |

**TypeScript Definition**:
```typescript
interface TokenEstimate {
  estimated_tokens: number;   // Calculated estimate
  character_count: number;    // Raw character count
  exceeds_limit: boolean;     // Over threshold?
}

function estimateTokens(jsonString: string, maxTokens: number): TokenEstimate {
  const characterCount = jsonString.length;
  const estimatedTokens = Math.ceil(characterCount / 3); // Conservative ratio

  return {
    estimated_tokens: estimatedTokens,
    character_count: characterCount,
    exceeds_limit: estimatedTokens > maxTokens,
  };
}
```

**Usage**:
```typescript
const responseJson = JSON.stringify(paginatedResponse);
const estimate = estimateTokens(responseJson, MAX_RESPONSE_TOKENS);

if (estimate.exceeds_limit) {
  throw new ValidationError(
    `Response too large: ~${estimate.estimated_tokens.toLocaleString()} tokens ` +
    `(limit: ${MAX_RESPONSE_TOKENS.toLocaleString()}). ` +
    `Try reducing limit or using field selection.`
  );
}
```

---

## Validation Schemas

### Zod Schemas (for runtime validation)

```typescript
import { z } from 'zod';

/**
 * Pagination parameters schema
 */
export const PaginationParamsSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(1000).optional().default(20),
  offset: z.number().int().min(0).optional(),
}).refine(
  (data) => !(data.page !== undefined && data.offset !== undefined),
  {
    message: 'Cannot specify both page and offset parameters',
    path: ['page', 'offset'],
  }
);

/**
 * Field selection schema
 */
export const FieldSelectionSchema = z.object({
  fields: z.array(z.string()).optional(),
});

/**
 * Combined request params (pagination + field selection)
 */
export const RequestParamsSchema = PaginationParamsSchema.merge(FieldSelectionSchema);
```

### Validation Error Examples

```typescript
// Error: Page must be positive
{ page: 0, limit: 20 }
// ValidationError: page: Number must be greater than or equal to 1

// Error: Limit exceeds maximum
{ page: 1, limit: 5000 }
// ValidationError: limit: Number must be less than or equal to 1000

// Error: Mutual exclusivity violation
{ page: 2, offset: 40, limit: 20 }
// ValidationError: Cannot specify both page and offset parameters

// Error: Invalid field name
{ fields: ['invalid_field'] }
// ValidationError: Unknown field 'invalid_field'. Available: ncessch, name, enrollment, ...
```

---

## State Transitions

**Pagination is stateless**. Each request is independent:

```
Request 1: {page: 1, limit: 20}
  ↓
Response 1: {results: [records 1-20], pagination: {next_page: 2}}
  ↓
Request 2: {page: 2, limit: 20}  ← User provides next_page from Response 1
  ↓
Response 2: {results: [records 21-40], pagination: {next_page: 3}}
```

**No server-side state**:
- No sessions or cursors
- No cached page data
- Each request re-fetches from API (API layer may cache)

---

## Data Flow

### Request Processing Pipeline

```
1. User Request
   {level, source, topic, page: 1, limit: 20, fields: ['name', 'enrollment']}
      ↓
2. Validation (validator.ts)
   - Validate page >= 1
   - Validate limit <= 1000
   - Check page/offset mutual exclusivity
   - Calculate offset from page
      ↓
3. API Fetch (api-client.ts)
   - Determine which API page to fetch (10K records each)
   - Fetch from Urban Institute API
   - Extract total_count from response.count
      ↓
4. Response Formatting (response-formatter.ts)
   - Slice API response to user's page window
   - Apply field selection if requested
   - Generate pagination metadata
   - Format as compact JSON
      ↓
5. Token Validation (response-formatter.ts)
   - Estimate token count
   - Check against threshold
   - Throw error if exceeds limit
      ↓
6. Return Response
   {results: [...], pagination: {...}}
```

### Multi-Page API Coordination

When user requests page that spans multiple API pages:

```
User Request: {page: 501, limit: 20}
  ↓
Calculate offset: (501-1) * 20 = 10,000
  ↓
Determine API page needed:
  - API returns 10,000 records per page
  - Offset 10,000 = start of API page 2
  ↓
Fetch API page 2
  ↓
Slice records 0-20 from API page 2
  ↓
Return {results: 20 records, pagination: {...}}
```

---

## Integration with Existing Types

### Extending Existing Request Types

**Current** (`src/models/types.ts`):
```typescript
export interface EducationDataRequest {
  level: string;
  source: string;
  topic: string;
  subtopic?: string[];
  filters?: Record<string, unknown>;
  add_labels?: boolean;
  limit?: number;
}
```

**Enhanced** (add pagination + field selection):
```typescript
export interface EducationDataRequest {
  // Existing fields
  level: string;
  source: string;
  topic: string;
  subtopic?: string[];
  filters?: Record<string, unknown>;
  add_labels?: boolean;

  // Pagination fields
  limit?: number;      // Changed: default will be 20 (was 100)
  page?: number;       // NEW
  offset?: number;     // NEW

  // Field selection
  fields?: string[];   // NEW
}
```

### Extending Existing Response Types

**Current**: Returns raw array from API
```typescript
return {
  content: [{
    type: 'text',
    text: JSON.stringify(data.results, null, 2), // Pretty-printed array
  }],
};
```

**New**: Returns paginated envelope
```typescript
const paginatedResponse: PaginatedResponse<unknown> = {
  results: selectedFields,
  pagination: metadata,
};

return {
  content: [{
    type: 'text',
    text: JSON.stringify(paginatedResponse), // Compact, with pagination metadata
  }],
};
```

---

## Field Schema Registry

To support field selection validation, we need a registry of available fields per endpoint.

**Approach**: Dynamic validation based on actual API response structure

```typescript
/**
 * Validate field names against actual record structure
 */
function validateFields<T extends Record<string, unknown>>(
  sampleRecord: T,
  requestedFields: string[]
): { valid: string[]; invalid: string[] } {
  const availableFields = Object.keys(sampleRecord);
  const valid: string[] = [];
  const invalid: string[] = [];

  requestedFields.forEach(field => {
    if (availableFields.includes(field)) {
      valid.push(field);
    } else {
      invalid.push(field);
    }
  });

  return { valid, invalid };
}
```

**Alternative**: Maintain static schema registry (more complex, requires maintenance)
```typescript
const ENDPOINT_SCHEMAS: Record<string, string[]> = {
  'schools/ccd/directory': ['ncessch', 'name', 'enrollment', 'city', ...],
  'schools/ccd/enrollment': ['ncessch', 'year', 'grade', 'enrollment', ...],
  // ... hundreds of endpoints
};
```

**Decision**: Use **dynamic validation** (check against first record in API response). Simpler and automatically stays in sync with API changes.

---

## Performance Considerations

### Memory Efficiency

| Scenario | API Records Fetched | Records Returned | Memory Usage |
|----------|---------------------|------------------|--------------|
| Page 1, limit=20 | 10,000 | 20 | ~10MB (API page cached) |
| Page 2, limit=20 | 10,000 (same page) | 20 | ~10MB (reuse cached) |
| Page 501, limit=20 | 10,000 (API page 2) | 20 | ~20MB (2 API pages in memory) |

**Optimization**: Consider LRU cache for API pages to reduce refetching.

### Token Efficiency

| Configuration | Records | Fields | Estimated Tokens | Reduction |
|--------------|---------|--------|------------------|-----------|
| Current (no pagination) | 10,000 | 50 | ~3,300,000 | Baseline |
| Default (limit=20, all fields) | 20 | 50 | ~6,600 | 99.8% ↓ |
| Optimized (limit=20, 3 fields) | 20 | 3 | ~400 | 99.99% ↓ |

---

## Summary

**New Data Structures**:
1. `PaginationParams` - User input
2. `PaginationMetadata` - Response navigation
3. `PaginatedResponse<T>` - Unified response wrapper
4. `FieldSelectionParams` - Optional field filtering
5. `TokenEstimate` - Response size validation

**Breaking Changes**:
- Response structure: Array → `{results, pagination}`
- Default limit: 100 → 20

**Validation**:
- Zod schemas for type-safe runtime validation
- Dynamic field validation against API responses

**Next Steps**: Implement contracts in `contracts/pagination-api.yaml`
