# Implementation Plan: Expand Endpoint Whitelist to Enable Full IPEDS Access

**Branch**: `003-extract-the-requirements` | **Date**: 2025-01-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-extract-the-requirements/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Expand the endpoint validation whitelist from 4 to 16 verified endpoints to enable comprehensive access to Urban Institute Education Data API, particularly IPEDS (higher education) data. Currently, the server blocks 90% of higher education queries by validating against an incomplete whitelist. The technical approach is to add all 11 verified IPEDS endpoints plus 1 missing CCD endpoint to the `AVAILABLE_ENDPOINTS` array while maintaining the `validateEndpoint()` security layer for controlled, explicit validation.

## Technical Context

**Language/Version**: TypeScript/Node.js (ES2022 target, Node16 module system)
**Primary Dependencies**: @modelcontextprotocol/sdk, zod (validation), axios (HTTP client)
**Storage**: N/A (stateless MCP server, no database)
**Testing**: Jest or similar test framework (existing test fixtures reference endpoints)
**Target Platform**: MCP server running on any Node.js 18+ environment
**Project Type**: single (MCP server library/tool)
**Performance Goals**: API responses within 2 seconds (including Urban Institute API latency)
**Constraints**: Must maintain backward compatibility for 4 currently working endpoints
**Scale/Scope**: Moderate change - adding 12 endpoints to whitelist array, updating tests and docs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: No constitution file found at `.specify/.specify/memory/constitution.md`. Proceeding with standard best practices:
- ✅ Single responsibility: Expanding whitelist is a focused, single change
- ✅ Security first: Maintains validation layer with explicit control
- ✅ No unnecessary abstractions: Direct array expansion, no new patterns
- ✅ Backward compatibility: All existing endpoints continue to work
- ✅ Explicit over implicit: Clear list of what's supported vs. removing all validation

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── config/
│   └── endpoints.ts        # PRIMARY CHANGE: Expand AVAILABLE_ENDPOINTS array from 4 to 16 endpoints
├── services/
│   └── validator.ts        # No changes - validateEndpoint() calls remain active
├── models/
│   ├── types.ts           # Type definitions (no changes)
│   └── schemas.ts         # Zod schemas for validation (no changes)
└── utils/
    └── errors.ts          # Error handling (no changes)

tests/
├── fixtures/
│   └── test-data.ts       # Test fixtures will now work without mocking
└── unit/
    └── services/
        └── validator.test.ts  # Tests may need updating for new endpoints
```

**Structure Decision**: Single project structure - this is a TypeScript MCP server with a standard src/tests layout. The primary change is in the endpoints configuration, with validation logic remaining intact.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

N/A - No constitution violations. While this approach requires more implementation work than removing validation entirely, it maintains security best practices and explicit control over allowed endpoints.

## Endpoints to Add

### IPEDS Endpoints (11 new endpoints)
1. `college-university/ipeds/institutional-characteristics` - Institution type, calendar, services
2. `college-university/ipeds/fall-enrollment` - Fall term enrollment (FTE and headcount)
3. `college-university/ipeds/enrollment` - General enrollment with demographics
4. `college-university/ipeds/enrollment-full-time-equivalent` - FTE calculations
5. `college-university/ipeds/admissions-enrollment` - Admissions and first-year enrollment
6. `college-university/ipeds/admissions-requirements` - Admissions policies
7. `college-university/ipeds/completions-cip-2` - Degrees by 2-digit CIP code
8. `college-university/ipeds/completions-cip-6` - Degrees by 6-digit CIP code
9. `college-university/ipeds/outcome-measures` - Graduation and retention rates
10. `college-university/ipeds/sfa-grants-and-net-price` - Financial aid and net price
11. `college-university/ipeds/finance` - Institutional financial data

### CCD Endpoints (1 new endpoint)
1. `school-districts/ccd/directory` - School district directory information

This expansion increases coverage from 4 to 16 endpoints, with IPEDS coverage improving from 1 to 12 endpoints (12x increase).
