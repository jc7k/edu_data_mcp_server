# Quick Start: Expand Endpoint Whitelist

**Feature**: Expand Endpoint Whitelist to Enable Full IPEDS Access
**Estimated Time**: 45 minutes

## Overview

This guide walks through expanding the endpoint validation whitelist from 4 to 16 endpoints, which unblocks access to comprehensive IPEDS and CCD data while maintaining security through explicit validation.

## Prerequisites

- Access to the edu_data_mcp_server codebase
- Node.js 18+ environment for testing
- Basic understanding of TypeScript

## Implementation Steps

### Step 1: Expand Endpoint Whitelist (10 minutes)

Open `src/config/endpoints.ts` and add the new endpoints to `AVAILABLE_ENDPOINTS`:

```typescript
export const AVAILABLE_ENDPOINTS: ApiEndpoint[] = [
  // ... existing 4 endpoints ...

  // Add missing CCD endpoint
  {
    level: 'school-districts',
    source: 'ccd',
    topic: 'directory',
    mainFilters: ['year'],
    yearsAvailable: '1986–2022',
  },

  // Add 11 new IPEDS endpoints
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'institutional-characteristics',
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'fall-enrollment',
    mainFilters: ['year', 'unitid', 'level_of_study'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'enrollment',
    subtopic: ['race', 'sex'],
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'enrollment-full-time-equivalent',
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'admissions-enrollment',
    mainFilters: ['year', 'unitid', 'sex'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'admissions-requirements',
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'completions-cip-2',
    subtopic: ['award_level', 'race', 'sex'],
    mainFilters: ['year', 'unitid', 'cipcode', 'award_level'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'completions-cip-6',
    subtopic: ['award_level', 'race', 'sex'],
    mainFilters: ['year', 'unitid', 'cipcode', 'award_level'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'outcome-measures',
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '2015–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'sfa-grants-and-net-price',
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'finance',
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '1980, 1984–2022',
  },
];
```

### Step 2: Update Tests (5 minutes)

Search for test files that test endpoint validation:

```bash
# Find test files that might need updates
grep -r "validateEndpoint" tests/
grep -r "Invalid endpoint" tests/
```

For any tests found:
1. If they only test endpoint validation → Remove them
2. If they test error handling → Update to expect API 404 errors instead

Example test update:
```typescript
// Before
it('should throw ValidationError for invalid endpoint', () => {
  expect(() => validateRequest({
    level: 'college-university',
    source: 'ipeds',
    topic: 'fake-topic'
  })).toThrow('Invalid endpoint');
});

// After
it('should pass requests to API for endpoint validation', async () => {
  const response = await makeRequest({
    level: 'college-university',
    source: 'ipeds',
    topic: 'fake-topic'
  });
  expect(response.error).toBe('Not found');
  expect(response.status).toBe(404);
});
```

### Step 3: Update Documentation (3 minutes)

Update `README.md`:

```markdown
## Endpoint Validation

The server passes all requests directly to the Urban Institute Education Data API,
which handles endpoint validation. This ensures the MCP server automatically
supports all current and future API endpoints without requiring code updates.

Invalid endpoints return clear error messages from the API (404 "Not found").
```

Update `CHANGELOG.md`:

```markdown
## [Next Version] - 2025-01-08

### Changed
- Removed client-side endpoint validation to support all Urban Institute API endpoints
- Invalid endpoints now return 404 errors from the API instead of validation errors
- Test fixtures now work without endpoint mocking

### Fixed
- Access to 50-100+ valid API endpoints that were previously blocked
- IPEDS endpoints (fall-enrollment, admissions-enrollment, etc.) now accessible
```

### Step 4: Verify Changes (15 minutes)

Build and test the implementation:

```bash
# 1. Build the project
npm run build

# 2. Run existing tests
npm test

# 3. Test a previously blocked endpoint (should work now)
npm run inspector
# Then test: get_education_data with:
#   level: "college-university"
#   source: "ipeds"
#   topic: "fall-enrollment"
#   filters: {"year": 2021, "unitid": 133951, "limit": 2}

# 4. Test an invalid endpoint (should still be rejected by validation)
# Try topic: "invalid-topic"
# Expected: Validation error "Invalid endpoint"

# 5. Test backward compatibility (should still work)
# Test the 4 originally whitelisted endpoints
```

## Verification Checklist

- [ ] All 12 new endpoints added to `endpoints.ts`
- [ ] Each endpoint has proper metadata (mainFilters, yearsAvailable)
- [ ] Project builds without TypeScript errors
- [ ] Tests pass with new endpoints
- [ ] README.md updated with list of supported endpoints
- [ ] CHANGELOG.md documents the expanded support
- [ ] Previously blocked IPEDS endpoints now pass validation
- [ ] Invalid endpoints still rejected by validation (security maintained)
- [ ] All 4 original endpoints still work
- [ ] Florida International University use case works (unitid: 133951)

## Testing Script

Quick test of newly accessible endpoints:

```javascript
// test-endpoints.js
const endpoints = [
  // Previously blocked, now working
  { level: 'college-university', source: 'ipeds', topic: 'fall-enrollment' },
  { level: 'college-university', source: 'ipeds', topic: 'admissions-enrollment' },
  { level: 'school-districts', source: 'ccd', topic: 'directory' },

  // Should still work (backward compatibility)
  { level: 'schools', source: 'ccd', topic: 'enrollment' },

  // Should return 404 from API
  { level: 'college-university', source: 'ipeds', topic: 'invalid-topic' }
];

// Run each through your MCP tool and verify behavior
```

## Rollback Plan

If issues arise, rollback is simple:

1. Remove the newly added endpoints from `endpoints.ts`
2. Keep the original 4 endpoints
3. Revert documentation changes

## Success Metrics

After implementation:
- ✅ 12 IPEDS endpoints accessible (vs 1 before) - 12x increase
- ✅ 16 total endpoints whitelisted (vs 4 before) - 4x increase
- ✅ Test fixtures work without mocking
- ✅ Validation still rejects invalid endpoints
- ✅ No regression in existing functionality
- ✅ Security maintained through explicit validation

## FAQ

**Q: What about typos in endpoint names?**
A: Validation will catch them and return "Invalid endpoint" error before hitting the API.

**Q: Will this break existing code?**
A: No. This change only adds new endpoints to the whitelist - all existing endpoints continue to work.

**Q: What if the API adds new endpoints?**
A: They will need to be manually added to the whitelist. This is intentional for security.

**Q: Is this more secure than removing validation?**
A: Yes. We maintain explicit control over what endpoints are allowed, providing a security layer before API calls.

**Q: How often will we need to update the whitelist?**
A: Based on API evolution patterns, likely 1-2 times per year as new endpoints are added.