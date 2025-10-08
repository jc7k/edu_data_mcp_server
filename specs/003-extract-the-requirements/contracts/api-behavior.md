# API Behavior Contract: Expanded Endpoint Whitelist

**Date**: 2025-01-08
**Feature**: Expand Endpoint Whitelist to Enable Full IPEDS Access

## Overview

This document defines the expected behavior of the MCP server after expanding the endpoint validation whitelist from 4 to 16 endpoints. It serves as a contract for testing and verification.

## Request Processing

### Valid Endpoint Requests

**Given**: A request with valid structure and whitelisted endpoint
**When**: Request is processed
**Then**:
- Zod schema validation passes
- Endpoint whitelist validation passes (endpoint is in AVAILABLE_ENDPOINTS)
- Request is forwarded to Urban Institute API without modification
- API response is returned to user
- Response time is within 2 seconds

**Example**:
```json
{
  "tool": "get_education_data",
  "parameters": {
    "level": "college-university",
    "source": "ipeds",
    "topic": "fall-enrollment",
    "filters": {"year": 2021, "unitid": 133951}
  }
}
```

### Non-Whitelisted Endpoint Requests

**Given**: A request with valid structure but non-whitelisted endpoint
**When**: Request is processed
**Then**:
- Zod schema validation passes
- Endpoint whitelist validation fails
- ValidationError is thrown with "Invalid endpoint" message
- Request never reaches Urban Institute API

**Example**:
```json
{
  "tool": "get_education_data",
  "parameters": {
    "level": "college-university",
    "source": "ipeds",
    "topic": "invalid-topic"
  }
}
```

**Error Response**:
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "Invalid endpoint: college-university/ipeds/invalid-topic",
    "details": {
      "available_endpoints": ["...list of 16 whitelisted endpoints..."]
    }
  }
}
```

### Malformed Requests

**Given**: A request with invalid structure (missing required fields, wrong types)
**When**: Request is processed
**Then**:
- Zod schema validation fails
- ValidationError is thrown
- Request never reaches Urban Institute API
- Error describes the structural issue

**Example**:
```json
{
  "tool": "get_education_data",
  "parameters": {
    "source": "ipeds",
    "topic": "enrollment"
    // Missing required field: level
  }
}
```

## Error Responses

### Endpoint Validation Errors (Non-Whitelisted Endpoints)

```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "Invalid endpoint: college-university/ipeds/invalid-topic",
    "details": {
      "available_endpoints": [
        "schools/ccd/enrollment",
        "schools/ccd/directory",
        "school-districts/ccd/enrollment",
        "school-districts/ccd/directory",
        "college-university/ipeds/directory",
        "college-university/ipeds/institutional-characteristics",
        "college-university/ipeds/fall-enrollment",
        "...and 9 more..."
      ]
    }
  }
}
```

### Validation Errors (Structural Issues)

```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "Missing required field: level",
    "details": {
      "field": "level",
      "expected": "string",
      "received": "undefined"
    }
  }
}
```

### Network/API Errors

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to fetch from Urban Institute API",
    "details": {
      "status": 500
    }
  }
}
```

## Performance Guarantees

| Scenario | Expected Performance |
|----------|---------------------|
| Whitelisted endpoint, data exists | < 2 seconds |
| Whitelisted endpoint, no data | < 2 seconds |
| Non-whitelisted endpoint | < 100ms (caught by validation, no API call) |
| Malformed request | < 100ms (no API call) |
| Network timeout | Configured timeout (default 30s) |

## Backward Compatibility

### Previously Whitelisted Endpoints (Still Working)

These 4 endpoints continue to work identically:

1. `schools/ccd/enrollment`
2. `schools/ccd/directory`
3. `school-districts/ccd/enrollment`
4. `college-university/ipeds/directory`

### Newly Whitelisted Endpoints

These 12 endpoints are now added to the validation whitelist:

1. `college-university/ipeds/institutional-characteristics`
2. `college-university/ipeds/fall-enrollment`
3. `college-university/ipeds/enrollment`
4. `college-university/ipeds/enrollment-full-time-equivalent`
5. `college-university/ipeds/admissions-enrollment`
6. `college-university/ipeds/admissions-requirements`
7. `college-university/ipeds/completions-cip-2`
8. `college-university/ipeds/completions-cip-6`
9. `college-university/ipeds/outcome-measures`
10. `college-university/ipeds/sfa-grants-and-net-price`
11. `college-university/ipeds/finance`
12. `school-districts/ccd/directory`

**Total**: 16 whitelisted endpoints (4 previously + 12 newly added)

## Testing Requirements

### Unit Tests
- Verify Zod schema validation still works
- Verify `validateEndpoint()` correctly validates against expanded whitelist
- Test that whitelisted endpoints pass validation
- Test that non-whitelisted endpoints fail validation with clear error
- Test error handling for various API responses

### Integration Tests
- Test all 12 newly whitelisted endpoints with real API calls
- Test non-whitelisted endpoints return validation errors (not API 404s)
- Test backward compatibility with 4 original endpoints
- Verify test fixtures work with expanded whitelist

### Regression Tests
- Ensure no functionality is lost
- Verify error messages are clear
- Confirm performance meets requirements
- Verify security validations are still active

## Security Considerations

### Preserved Protections
- SQL injection prevention via sanitization
- XSS protection via string normalization
- Input type validation via Zod schemas
- Parameter bounds checking (limit, page, offset)
- **Endpoint whitelist validation** - Maintained with expanded list of 16 verified endpoints

### Expanded Protections
- Endpoint whitelist expanded from 4 to 16 endpoints
- All endpoints remain explicitly validated before API calls
- Maintains security layer while enabling comprehensive data access

### Risk Assessment
- **Risk**: Manual maintenance of whitelist required as API evolves
- **Impact**: Minimal - Urban Institute API adds new endpoints infrequently (1-2 times/year)
- **Mitigation**: Documentation and monitoring for new endpoint announcements
- **Security Benefit**: Explicit control over allowed endpoints prevents unauthorized access patterns