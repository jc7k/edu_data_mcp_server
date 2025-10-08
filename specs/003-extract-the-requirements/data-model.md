# Data Model: Expand Endpoint Whitelist

**Date**: 2025-01-08
**Feature**: Expand Endpoint Whitelist to Enable Full IPEDS Access

## Overview

This feature involves expanding the validation whitelist rather than changing data structures. The entities described here represent the existing data flow with an expanded set of valid endpoints.

## Key Entities

### 1. EducationDataRequest

**Description**: User request for education data from a specific endpoint

**Fields**:
- `level`: string - API level (e.g., "schools", "college-university")
- `source`: string - Data source (e.g., "ccd", "ipeds")
- `topic`: string - Data topic (e.g., "enrollment", "directory")
- `subtopic?`: string[] - Optional subtopic filters
- `filters?`: object - Optional query filters (year, unitid, etc.)
- `limit?`: number - Results per page (default: 20, max: 1000)
- `page?`: number - Page number (1-indexed)
- `offset?`: number - Record offset (0-indexed)
- `add_labels?`: boolean - Include human-readable labels
- `fields?`: string[] - Specific fields to include

**Validation** (all preserved):
- Required fields: level, source, topic
- Zod schema validation for types and constraints
- Sanitization of string inputs
- Endpoint whitelist validation (EXPANDED from 4 to 16 endpoints)

**State**: Stateless - each request is independent

### 2. SummaryDataRequest

**Description**: Request for aggregated education data statistics

**Fields**:
- All fields from EducationDataRequest
- `stat`: string - Statistical operation ("sum", "avg", "count", "median")
- `var`: string - Variable to aggregate
- `by`: string[] - Grouping variables

**Validation** (all preserved):
- All EducationDataRequest validations
- Required: stat, var, by
- Endpoint whitelist validation (uses same expanded list)

**State**: Stateless

### 3. APIEndpoint (whitelist entry)

**Description**: A whitelisted endpoint in AVAILABLE_ENDPOINTS array

**Format**: `{level}/{source}/{topic}/{optional-subtopic}`

**Whitelisted endpoints** (expanded to 16):
- 4 CCD endpoints (K-12)
- 12 IPEDS endpoints (higher education)

**Validation**:
- Client-side whitelist check against 16 verified endpoints (preserved and expanded)
- Server-side validation by Urban Institute API (preserved)

### 4. ValidationError

**Description**: Error thrown for invalid input

**Fields**:
- `message`: string - Error description
- `field?`: string - Field that failed validation
- `expected?`: string - Expected value/format
- `received?`: any - Actual value received

**Usage**:
- Thrown for missing required fields
- Thrown for type mismatches
- Thrown for non-whitelisted endpoints (expanded validation list)

### 5. APIError

**Description**: Error response from Urban Institute API

**Fields**:
- `status`: number - HTTP status code
- `detail`: string - Error message from API
- `type?`: string - Error classification

**Common cases**:
- 404: Endpoint not found (for endpoints not in whitelist or genuinely missing)
- 400: Bad request parameters
- 413: Query returned too many records

## Data Flow

### Before (4 whitelisted endpoints)
```
User Request
    ↓
Zod Schema Validation
    ↓
Endpoint Whitelist Check (4 endpoints) ← ❌ BLOCKED 90% of higher ed queries
    ↓
Urban Institute API Call
    ↓
Response
```

### After (16 whitelisted endpoints)
```
User Request
    ↓
Zod Schema Validation (preserved)
    ↓
Endpoint Whitelist Check (16 endpoints) ← ✅ Now passes IPEDS queries
    ↓
Urban Institute API Call
    ↓
Response
```

## Relationships

- **EducationDataRequest** → **Urban Institute API**: Direct pass-through after structural and endpoint validation
- **SummaryDataRequest** → **Urban Institute API**: Direct pass-through with `/summaries` suffix after validation
- **APIError** ← **Urban Institute API**: Returned for invalid parameters or API issues
- **ValidationError** ← **Zod Schemas & validateEndpoint()**: Returned for structural issues and non-whitelisted endpoints

## Migration Notes

### No Data Migration Required

This change expands validation whitelist only. No data structures change:
- Request formats remain identical
- Response formats unchanged
- Error types preserved (same triggers, expanded whitelist)

### Test Data Considerations

Test fixtures that reference previously non-whitelisted endpoints will now:
- Pass validation checks (new endpoints whitelisted)
- Work without validation mocking
- Should include both whitelisted and non-whitelisted endpoints for coverage

## Impact Summary

- **Added entities**: None
- **Modified entities**: None
- **Expanded validations**: Endpoint whitelist from 4 to 16 endpoints
- **Preserved validations**: All structural, type, security, and endpoint validations