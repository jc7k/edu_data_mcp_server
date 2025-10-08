# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Expanded Endpoint Support
- Added 11 new IPEDS (higher education) endpoints to the validation whitelist
- Added missing CCD endpoint (`school-districts/ccd/directory`) from test fixtures
- Comprehensive support for IPEDS data including:
  - `institutional-characteristics` - Detailed institutional data
  - `fall-enrollment` - Fall term enrollment counts
  - `enrollment` - General enrollment with demographics
  - `enrollment-full-time-equivalent` - FTE enrollment calculations
  - `admissions-enrollment` - Admissions and first-year enrollment
  - `admissions-requirements` - Admissions policies
  - `completions-cip-2` - Degrees by 2-digit CIP code
  - `completions-cip-6` - Degrees by 6-digit CIP code
  - `outcome-measures` - Graduation and retention rates
  - `sfa-grants-and-net-price` - Financial aid and net price
  - `finance` - Institutional financial data

### Changed
- Updated `AVAILABLE_ENDPOINTS` array from 4 to 16 verified endpoints
- Expanded IPEDS coverage from 1 endpoint to 12 endpoints (12x increase)
- Test fixtures now work without validation mocking

### Fixed
- Resolved issue where 90% of higher education queries were blocked by validation
- Fixed test fixture incompatibility with endpoint validation
- Enabled access to Florida International University enrollment data (user's original use case)

## [0.1.0] - 2025-01-08

### Added

#### Pagination System
- Smart pagination with configurable page size (default: 20 records, max: 1000)
- Support for both page-based (`page`) and offset-based (`offset`) pagination
- Pagination metadata in all responses with navigation information
- Multi-page API navigation for datasets beyond 10K records
- Automatic calculation of API page boundaries for seamless navigation through millions of records

#### Field Selection
- New `fields` parameter to request specific fields only
- Client-side field filtering to reduce token usage by 50-97%
- Field name validation with helpful error messages listing available fields

#### Token Management
- Automatic token estimation (character count ÷ 3)
- Response size validation against 10K token limit
- Helpful error messages with suggestions when limits exceeded
- Compact JSON formatting (no indentation) to reduce token usage by ~30%

#### Validation & Error Handling
- Comprehensive input validation with Zod schemas
- Custom error types: `TokenLimitError`, `PaginationError`, `FieldSelectionError`
- Mutual exclusivity validation for `page`/`offset` parameters
- Detailed error messages with actionable suggestions

#### Testing
- 91 new unit tests covering pagination, validation, and response formatting
- 13 integration tests for end-to-end pagination flows
- Test coverage for edge cases: empty results, partial pages, token limits
- Comprehensive test fixtures and mocking infrastructure

### Changed

#### Breaking Changes

**Response Structure**
- **Before (v0.0.x):** Tools returned raw array of records
  ```json
  [
    { "id": 1, "name": "School A" },
    { "id": 2, "name": "School B" }
  ]
  ```

- **After (v0.1.0):** Tools return paginated response object
  ```json
  {
    "results": [
      { "id": 1, "name": "School A" },
      { "id": 2, "name": "School B" }
    ],
    "pagination": {
      "total_count": 100,
      "current_page": 1,
      "page_size": 2,
      "total_pages": 50,
      "has_more": true,
      "next_page": 2
    }
  }
  ```

**Default Limit**
- **Before:** 100 records per request
- **After:** 20 records per request
- **Reason:** Prevents 4.4M token responses that exceed LLM context windows

**API Request Behavior**
- Server now always requests API's maximum limit (10K records) per API page
- Client-side pagination slices API responses to user's requested page size
- Enables navigation beyond first 10K records via multi-page fetching

### Migration Guide

#### Update Response Parsing

```javascript
// Before (v0.0.x)
const schools = response;
for (const school of schools) {
  console.log(school.name);
}

// After (v0.1.0)
const schools = response.results;
const totalCount = response.pagination.total_count;
for (const school of schools) {
  console.log(school.name);
}
```

#### Adjust Pagination Expectations

If you were relying on the default 100 records, explicitly set `limit`:

```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "directory",
  "filters": { "year": 2020 },
  "limit": 100
}
```

#### Navigate Through Pages

Use pagination metadata to implement pagination:

```javascript
// Check if more results exist
if (response.pagination.has_more) {
  // Fetch next page
  const nextPage = response.pagination.next_page;
  // Make request with page: nextPage
}
```

#### Reduce Token Usage

Use field selection to request only needed fields:

```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "directory",
  "filters": { "year": 2020 },
  "fields": ["ncessch", "school_name", "enrollment"],
  "limit": 100
}
```

### Technical Implementation Details

#### Architecture Changes
- New service module: `src/services/response-formatter.ts`
  - `calculatePaginationMetadata()`: Computes pagination metadata
  - `formatPaginatedResponse()`: Wraps results in paginated structure
  - `sliceApiPage()`: Extracts user's requested records from API's 10K page
  - `selectFields()`: Filters records to requested fields
  - `estimateTokens()`: Estimates token count for validation

- Enhanced `src/services/api-client.ts`
  - `calculateApiPage()`: Maps user offset to API page number
  - Modified URL builders to support multi-page requests
  - Always requests API's MAX_LIMIT (10K) for full page fetching

- Enhanced `src/services/validator.ts`
  - `validatePaginationParams()`: Validates and normalizes pagination parameters
  - `validateFieldNames()`: Validates requested fields against actual data
  - Converts between page-based and offset-based pagination

- Updated `src/handlers/tools.ts`
  - Complete rewrite of both tool handlers
  - Integrated pagination, field selection, and token validation
  - Comprehensive error handling for all new error types

#### Type System Additions
- New types in `src/models/types.ts`:
  - `PaginationParams`, `PaginationMetadata`, `PaginatedResponse`
  - `FieldSelectionParams`, `TokenEstimate`

- New validation schemas in `src/models/schemas.ts`:
  - `PaginationParamsSchema` with mutual exclusivity validation
  - `FieldSelectionSchema`
  - `RequestParamsSchema` combining pagination and field selection

#### Configuration Updates
- `src/config/constants.ts`:
  - `DEFAULT_LIMIT`: 100 → 20
  - New `MAX_USER_LIMIT`: 1000
  - New `TOKEN_LIMITS` configuration with thresholds

### Fixed

- Token overflow issues with large dataset responses
- Missing support for datasets with more than 10K records
- Inefficient full-field responses when only subset needed
- Lack of navigation metadata for pagination implementation
- Missing validation for incompatible pagination parameters

### Documentation

- Comprehensive pagination guide in README.md
- Migration guide for v0.0.x → v0.1.0 upgrade
- Field selection examples and best practices
- Multi-page navigation documentation
- Updated tool parameter documentation with new pagination options

### Security

- Input validation prevents parameter injection
- Field name validation prevents unauthorized data access
- Token limit validation prevents resource exhaustion
- String length limits on all user inputs

## [0.0.1] - 2024-12-01

### Added
- Initial release
- Basic MCP server implementation
- `get_education_data` tool for retrieving education data
- `get_education_data_summary` tool for retrieving aggregated data
- Resource browsing for available endpoints
- Integration with Urban Institute Education Data API

[0.1.0]: https://github.com/jc7k/edu_data_mcp_server/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/jc7k/edu_data_mcp_server/releases/tag/v0.0.1
