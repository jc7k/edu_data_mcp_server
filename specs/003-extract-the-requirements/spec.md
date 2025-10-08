# Feature Specification: Remove Endpoint Validation to Enable Full API Access

**Feature Branch**: `003-extract-the-requirements`
**Created**: 2025-01-08
**Status**: Draft
**Input**: User description: "extract the requirements from @endpoint-validation-research.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Query Higher Education Enrollment Data (Priority: P1)

A researcher wants to find institutions with similar enrollment sizes to Florida International University by querying fall enrollment data from the IPEDS database.

**Why this priority**: This is a critical blocker affecting 90% of higher education queries. Users cannot access any enrollment, admissions, or completion data - the core use cases for higher education research. This represents the primary user pain point.

**Independent Test**: Can be fully tested by querying `college-university/ipeds/fall-enrollment` endpoint with a specific institution ID and verifies that enrollment data is returned successfully without validation errors.

**Acceptance Scenarios**:

1. **Given** the MCP server is running, **When** a user queries `college-university/ipeds/fall-enrollment` with valid filters, **Then** the server returns enrollment data from the Urban Institute API without throwing validation errors
2. **Given** a user wants enrollment data for Florida International University (unitid=133951), **When** they query fall-enrollment for year 2021, **Then** they receive FTE enrollment counts and related metrics
3. **Given** the Urban Institute API has 11 working IPEDS endpoints, **When** a user queries any of these endpoints (institutional-characteristics, admissions-enrollment, completions-cip-2, etc.), **Then** all queries succeed without client-side validation blocking them

---

### User Story 2 - Query Existing Whitelisted Endpoints (Priority: P1)

Users continue to successfully query the 4 currently whitelisted endpoints (schools/ccd/enrollment, schools/ccd/directory, school-districts/ccd/enrollment, college-university/ipeds/directory) without regression.

**Why this priority**: Maintaining existing functionality is critical. While we remove validation that blocks valid endpoints, we must ensure currently working endpoints continue to work. This is a P1 because breaking existing functionality would be unacceptable.

**Independent Test**: Can be tested by querying all 4 currently whitelisted endpoints and verifying they continue to return data successfully, proving no regression was introduced.

**Acceptance Scenarios**:

1. **Given** a user queries `schools/ccd/enrollment` with valid parameters, **When** the request is processed, **Then** enrollment data is returned successfully (no regression)
2. **Given** a user queries `college-university/ipeds/directory` with filters, **When** the request is processed, **Then** directory data is returned successfully (no regression)
3. **Given** the 4 whitelisted endpoints were working before the change, **When** validation is removed, **Then** all 4 endpoints continue to work identically

---

### User Story 3 - Receive Clear Error Messages for Invalid Endpoints (Priority: P2)

When a user accidentally provides an invalid endpoint or makes a typo, they receive clear error messages from the Urban Institute API explaining what went wrong.

**Why this priority**: Error handling is important for user experience, but less critical than unblocking valid endpoints. The Urban Institute API already provides clear 404 errors with "detail: Not found" messages, so this functionality already exists - we just need to ensure it's passed through correctly.

**Independent Test**: Can be tested by querying an intentionally invalid endpoint (e.g., `college-university/ipeds/fake-topic`) and verifying that the Urban Institute API's 404 error is returned to the user with clear messaging.

**Acceptance Scenarios**:

1. **Given** a user queries an invalid endpoint like `college-university/ipeds/invalid-topic`, **When** the Urban Institute API returns a 404 error, **Then** the MCP server passes through the API's error message to the user
2. **Given** a user makes a typo in the endpoint path, **When** the API returns an error, **Then** the error message clearly indicates the endpoint was not found (not a validation error)
3. **Given** the Urban Institute API validates all endpoints, **When** any invalid request is made, **Then** the API's native error handling provides clear feedback without client-side validation interfering

---

### User Story 4 - Use Test Fixtures Without Mocking (Priority: P3)

Developers can run test suites using test fixtures that reference non-whitelisted endpoints without needing to mock validation logic.

**Why this priority**: This fixes technical debt and improves developer experience, but doesn't directly affect end users. It's a P3 because it's a "nice to have" improvement that makes testing cleaner and more accurate.

**Independent Test**: Can be tested by running the test suite with fixtures that reference `college-university/ipeds/enrollment` and `school-districts/ccd/directory` and verifying tests pass without requiring validation mocking.

**Acceptance Scenarios**:

1. **Given** test fixtures reference `college-university/ipeds/enrollment` (currently not whitelisted), **When** tests are run, **Then** tests pass without requiring mocked validation
2. **Given** test fixtures use `school-districts/ccd/directory`, **When** validation is removed, **Then** tests accurately reflect production behavior
3. **Given** developers write new tests with any valid Urban Institute endpoint, **When** tests are executed, **Then** no validation mocking is required

---

### User Story 5 - Access Future API Endpoints Without Code Changes (Priority: P2)

When the Urban Institute adds new endpoints to their API, users can immediately access them without waiting for MCP server code updates or deployments.

**Why this priority**: This is a P2 because it's about future-proofing and reducing maintenance burden. While not immediately critical, it ensures long-term sustainability and prevents the current problem from recurring.

**Independent Test**: Can be simulated by testing an endpoint that was recently added to the Urban Institute API (or by testing against a documented endpoint not in the current whitelist) and verifying it works without any MCP server code changes.

**Acceptance Scenarios**:

1. **Given** the Urban Institute adds a new IPEDS endpoint after the MCP server deployment, **When** a user queries the new endpoint, **Then** it works immediately without requiring MCP server updates
2. **Given** the Urban Institute API has 50-100+ total endpoints, **When** any valid endpoint is queried, **Then** the MCP server supports it without code changes
3. **Given** no client-side endpoint validation exists, **When** the API evolves, **Then** zero maintenance is required to keep the MCP server in sync

---

### Edge Cases

- **What happens when a user provides a completely malformed request?** The existing input validation (Zod schemas) will catch structural errors (missing required fields, wrong types), and the Urban Institute API will handle endpoint-specific errors.
- **What happens when the Urban Institute API is down or unreachable?** Existing error handling already catches and reports network errors appropriately - no changes needed.
- **What happens when an endpoint exists but has no data for a specific year?** The Urban Institute API returns an empty results array with count=0, which is valid behavior that should be passed through.
- **What happens to the endpoint metadata in AVAILABLE_ENDPOINTS array?** It remains in the codebase but is no longer used for validation - it could be preserved for documentation purposes or removed entirely (out of scope for this spec).
- **What happens when tests that specifically test endpoint validation are run?** These tests will need to be updated to expect API errors instead of validation errors, or removed entirely if they're testing the removed validation logic.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST pass all user requests through to the Urban Institute API without client-side endpoint validation
- **FR-002**: System MUST continue to validate request structure (required fields, data types, field constraints) using existing Zod schemas
- **FR-003**: System MUST pass through Urban Institute API error responses to users without modification
- **FR-004**: System MUST support all current and future Urban Institute API endpoints without code changes
- **FR-005**: System MUST NOT perform lookups against the AVAILABLE_ENDPOINTS whitelist when processing requests
- **FR-006**: System MUST preserve existing security validations (sanitization, SQL injection prevention, XSS protection)
- **FR-007**: System MUST maintain backward compatibility for all 4 currently working endpoints
- **FR-008**: Validation functions (`validateEducationDataRequest`, `validateSummaryDataRequest`) MUST skip the `validateEndpoint()` call
- **FR-009**: System MUST document the validation approach change in user-facing documentation
- **FR-010**: Tests that verify endpoint validation behavior MUST be updated to reflect the new validation approach

### Key Entities *(include if feature involves data)*

- **Validation Request**: User input containing level, source, topic, and optional filters/parameters that needs structural validation but not endpoint validation
- **API Endpoint**: A valid path in the Urban Institute API (format: level/source/topic) that is validated by the API itself, not by client-side code
- **Error Response**: HTTP error responses from the Urban Institute API (especially 404 for invalid endpoints) that should be passed through to users
- **Test Fixture**: Test data that references various endpoints including those previously not whitelisted

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully query `college-university/ipeds/fall-enrollment` and receive data within 2 seconds (previously blocked by validation error)
- **SC-002**: All 11 verified IPEDS endpoints return data when queried with valid parameters (10x increase from 1 endpoint)
- **SC-003**: Invalid endpoint requests return Urban Institute API 404 errors with "detail: Not found" message within 2 seconds
- **SC-004**: Zero code changes required when Urban Institute adds new API endpoints
- **SC-005**: All 4 previously whitelisted endpoints continue to work without regression
- **SC-006**: Test suite runs successfully with test fixtures that reference any valid Urban Institute endpoint
- **SC-007**: Developer maintenance time for endpoint management is reduced from 15-30 hours/year to zero hours
- **SC-008**: 90% of higher education queries that were previously blocked now succeed

## Assumptions *(include if applicable)*

- **Assumption 1**: The Urban Institute API will continue to provide clear 404 error messages for invalid endpoints, eliminating the need for client-side validation
- **Assumption 2**: The Urban Institute API's error messages are sufficiently clear for end users and don't require client-side enhancement
- **Assumption 3**: The existing Zod schema validation provides adequate input sanitization and security protection without endpoint validation
- **Assumption 4**: Users can reference Urban Institute API documentation for discovering available endpoints and don't require client-side autocomplete or hints
- **Assumption 5**: The ~100ms additional latency from hitting the API to discover invalid endpoints (vs client-side validation) is acceptable
- **Assumption 6**: Test fixtures that reference non-whitelisted endpoints are testing real production scenarios and should not require mocking
- **Assumption 7**: The AVAILABLE_ENDPOINTS array can remain in the codebase for documentation purposes without being used for validation
- **Assumption 8**: Network errors and API downtime are already handled by existing error handling logic and don't require changes

## Out of Scope *(include if applicable)*

- **Dynamic endpoint discovery**: Fetching available endpoints from Urban Institute API at startup (Option 4 from research)
- **Pattern-based validation**: Validating level/source combinations while allowing any topic (Option 2 from research)
- **Expanding the hardcoded list**: Manually researching and adding all 50-100+ endpoints to the whitelist (Option 3 from research)
- **Endpoint autocomplete features**: Providing hints or autocomplete for available endpoints in the MCP client
- **Endpoint metadata management**: Enhancing or maintaining the AVAILABLE_ENDPOINTS array structure
- **Documentation of all available endpoints**: Creating comprehensive documentation of every Urban Institute API endpoint (can list common ones but not exhaustive)
- **Performance optimization**: Caching endpoint validation results (not needed since validation is removed)
- **Enhanced error messages**: Adding client-side error message enhancement for API errors (API messages are already clear)

## Dependencies *(include if applicable)*

- **Urban Institute Education Data API**: Must remain available and continue providing clear error messages for invalid endpoints
- **Existing Zod schema validation**: Must remain functional to validate request structure and sanitize inputs
- **Existing error handling logic**: Must continue to properly catch and format API errors for users
- **Test framework**: Must support updating or removing tests that specifically verify endpoint validation

## Risks & Mitigations *(include if applicable)*

### Risk 1: Less helpful error messages for typos
- **Impact**: Low - Users will receive API 404 errors instead of client-side validation errors
- **Likelihood**: Medium - Users will occasionally make typos
- **Mitigation**: The Urban Institute API returns clear "Not found" errors. Documentation can list common endpoints to help prevent typos.

### Risk 2: No autocomplete hints for endpoints
- **Impact**: Low - Users won't get client-side hints about available endpoints
- **Likelihood**: High - This is a guaranteed loss of potential feature
- **Mitigation**: Documentation can list common endpoints. Future enhancement could add documentation-based hints without validation.

### Risk 3: Test behavior changes
- **Impact**: Low - Tests that verify validation behavior will need updates
- **Likelihood**: High - Any tests checking validation will need changes
- **Mitigation**: Tests will be updated to verify API error passthrough instead of validation errors. This better reflects production behavior.

### Risk 4: Urban Institute changes error message format
- **Impact**: Low - Error messages might become less clear if API changes
- **Likelihood**: Very Low - Error message formats rarely change in mature APIs
- **Mitigation**: We can monitor for error message quality and add client-side enhancement later if needed (future scope).

## Technical Context *(include if applicable)*

The validation logic is centralized in two locations:

1. **File**: `src/services/validator.ts`
   - **Line 56**: `validateEducationDataRequest()` calls `validateEndpoint()`
   - **Line 97**: `validateSummaryDataRequest()` calls `validateEndpoint()`
   - **Lines 120-131**: `validateEndpoint()` function performs the whitelist check

2. **File**: `src/config/endpoints.ts`
   - Contains `AVAILABLE_ENDPOINTS` array with 4 hardcoded endpoints
   - `findEndpoint()` function searches the array

3. **File**: `tests/fixtures/test-data.ts`
   - Contains test data referencing non-whitelisted endpoints that currently require mocking

The change involves disabling the `validateEndpoint()` calls in the validator while preserving all other validation logic (Zod schemas, sanitization, type checking). The Urban Institute API URL is: `https://educationdata.urban.org/api/v1/{level}/{source}/{topic}/`

## Priority Justification *(include if applicable)*

This feature is classified as **P0 - Critical Blocker** because:

1. **90% of higher education queries are blocked**: Only 1 of 11 IPEDS endpoints work, preventing core research use cases
2. **No workaround exists**: Users cannot bypass the validation to access valid API endpoints
3. **Immediate user pain**: Error occurs on first query attempt, creating immediate frustration
4. **High effort for minimal value**: Maintaining the endpoint list requires 15-30 hours/year with no benefit over API validation
5. **Technical debt**: Test fixtures already reference non-whitelisted endpoints, indicating the validation is problematic
6. **Simple fix**: 5-minute implementation time to unblock all users

The recommended solution (Option 1: Remove validation) provides:
- Immediate unblocking of all valid endpoints
- Zero ongoing maintenance
- Future-proof design for API evolution
- Simpler, more maintainable codebase
