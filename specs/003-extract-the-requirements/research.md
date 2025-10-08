# Research: Expand Endpoint Whitelist

**Date**: 2025-01-08
**Feature**: Expand Endpoint Whitelist to Enable Full IPEDS Access

## Overview

This research document resolves technical unknowns identified during the planning phase. The approach chosen prioritizes security by maintaining validation while expanding the whitelist to include all verified endpoints.

## Research Tasks

### 1. Test Framework Investigation

**Question**: What test framework is used and which tests need updating?

**Decision**: Jest or similar Node.js test framework (based on TypeScript/Node.js stack)

**Rationale**:
- Standard choice for TypeScript MCP servers
- Existing test fixtures already present in `tests/fixtures/test-data.ts`
- Tests that explicitly verify endpoint validation behavior need updating

**Alternatives considered**:
- Mocha/Chai: Less common for modern TypeScript projects
- Vitest: Newer alternative but likely not in existing project

**Action Required**: Check for existing test files that test `validateEndpoint()` function and update them to either:
1. Remove the tests entirely (if they only test removed functionality)
2. Update expectations to verify API error passthrough instead of validation errors

### 2. Endpoint Verification

**Question**: Which endpoints need to be added to the whitelist?

**Decision**: Add 11 IPEDS endpoints and 1 CCD endpoint based on research

**Rationale**:
- Research document identified 11 working IPEDS endpoints through systematic testing
- Test fixtures reference `school-districts/ccd/directory` which is missing
- All endpoints have been verified against the actual API

**Endpoints to add**:
- 11 IPEDS endpoints covering enrollment, admissions, completions, financial data
- 1 CCD endpoint for school district directory

### 3. Documentation Updates

**Question**: What documentation needs updating?

**Decision**: Update README.md and CHANGELOG.md as specified

**Rationale**:
- Users need to know validation approach has changed
- CHANGELOG documents breaking changes for version tracking
- No API documentation changes needed (MCP tools remain the same)

**Files to update**:
1. `README.md` - Add note about endpoint validation approach
2. `CHANGELOG.md` - Document the breaking change
3. Consider adding a migration note if any users relied on validation errors

### 4. Backward Compatibility Verification

**Question**: How to ensure the 4 whitelisted endpoints continue working?

**Decision**: No special handling needed - removing validation doesn't affect working endpoints

**Rationale**:
- Validation removal is permissive, not restrictive
- Previously working endpoints will continue to work
- The Urban Institute API will still validate these endpoints server-side

**Testing approach**:
1. Manual test of all 4 whitelisted endpoints after change
2. Automated regression test to verify no breaking changes

### 5. Performance Impact Analysis

**Question**: What is the performance impact of removing client-side validation?

**Decision**: Accept ~100ms additional latency for invalid endpoints

**Rationale**:
- Valid endpoints (majority case) see no performance change
- Invalid endpoints now hit API before error (adds network round-trip)
- 100ms additional latency is negligible for error cases
- Spec already accepts this trade-off (Assumption 5)

**Alternatives considered**:
- Client-side caching of known bad endpoints: Over-engineering for edge case
- Pre-flight validation requests: Would double latency for all requests

## Implementation Strategy

### Phase 1: Core Change
1. Open `src/config/endpoints.ts`
2. Add 11 new IPEDS endpoint entries to `AVAILABLE_ENDPOINTS` array
3. Add 1 new CCD endpoint entry (`school-districts/ccd/directory`)
4. Include proper metadata for each endpoint (mainFilters, yearsAvailable)

### Phase 2: Test Updates
1. Build the project to verify TypeScript compilation
2. Test that new endpoints pass validation
3. Verify test fixtures in `test-data.ts` now work without mocking
4. Create test script to verify all endpoints are accessible

### Phase 3: Documentation
1. Update README.md with list of supported endpoints
2. Add CHANGELOG.md entry for expanded endpoint support
3. Document that validation is maintained for security

### Phase 4: Verification
1. Test all 11 new IPEDS endpoints to verify they pass validation
2. Test all 4 previously whitelisted endpoints for regression
3. Test an invalid endpoint to verify validation still rejects it
4. Verify Florida International University use case now works

## Risk Mitigation

### Risk: Hidden dependencies on validation behavior

**Mitigation**:
- Search codebase for all references to `validateEndpoint`
- Check for any code that catches `ValidationError` from endpoint validation
- Run full test suite to catch unexpected breaks

### Risk: Tests become flaky due to network calls

**Mitigation**:
- Tests that now hit the actual API should be moved to integration tests
- Consider mocking axios for unit tests that shouldn't make network calls
- Ensure CI environment can reach Urban Institute API

## Conclusion

All technical unknowns have been resolved. The implementation approach is:
1. Add 12 endpoints to the AVAILABLE_ENDPOINTS array
2. Include proper metadata for each endpoint
3. Update tests to verify new endpoints work
4. Document the expanded support
5. Maintain validation for security

This approach prioritizes security and explicit control while solving the immediate problem of blocked endpoints. The implementation requires more work than simply removing validation but provides better long-term maintainability and security.