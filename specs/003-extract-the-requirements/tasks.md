# Tasks: Expand Endpoint Whitelist to Enable Full IPEDS Access

**Feature Branch**: `003-extract-the-requirements`
**Input**: Design documents from `/specs/003-extract-the-requirements/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api-behavior.md

**Current Status**: The endpoints.ts file has already been expanded to 16 endpoints during Phase 6 work. This task list focuses on verification, testing, and documentation to complete the feature.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

---

## Phase 1: Verification & Current State Assessment

**Purpose**: Verify the endpoint whitelist expansion is complete and identify any remaining work

- [x] T001 Verify AVAILABLE_ENDPOINTS array in src/config/endpoints.ts contains all 16 endpoints
- [x] T002 Verify project builds successfully with expanded whitelist
- [x] T003 Review src/services/validator.ts to confirm validateEndpoint() is active and using expanded whitelist
- [x] T004 [P] Check CHANGELOG.md has proper documentation of the expanded endpoints

**Checkpoint**: Current state is verified - endpoint expansion is complete

---

## Phase 2: User Story 1 - Query Higher Education Enrollment Data (Priority: P1) 🎯 MVP

**Goal**: Enable researchers to query IPEDS fall enrollment data and other higher education endpoints without validation errors

**Independent Test**: Query `college-university/ipeds/fall-enrollment` with unitid=133951 (Florida International University) and year=2021, verify enrollment data is returned successfully

### Verification for User Story 1

- [x] T005 [US1] Test college-university/ipeds/fall-enrollment endpoint with real API call (filters: year=2021, unitid=133951, limit=5)
- [x] T006 [P] [US1] Test college-university/ipeds/institutional-characteristics endpoint with real API call
- [x] T007 [P] [US1] Test college-university/ipeds/admissions-enrollment endpoint with real API call
- [x] T008 [P] [US1] Test college-university/ipeds/completions-cip-2 endpoint with real API call
- [x] T009 [P] [US1] Test college-university/ipeds/enrollment endpoint with real API call
- [x] T010 [P] [US1] Test college-university/ipeds/outcome-measures endpoint with real API call
- [x] T011 [P] [US1] Verify all 11 new IPEDS endpoints pass validateEndpoint() checks

**Checkpoint**: All new IPEDS endpoints are accessible and return data successfully

---

## Phase 3: User Story 2 - Query Existing Whitelisted Endpoints (Priority: P1)

**Goal**: Ensure backward compatibility - all 4 previously whitelisted endpoints continue to work without regression

**Independent Test**: Query all 4 original endpoints and verify they return data successfully

### Verification for User Story 2

- [x] T012 [P] [US2] Regression test schools/ccd/enrollment endpoint (year=2020, grade=9, limit=5)
- [x] T013 [P] [US2] Regression test schools/ccd/directory endpoint (year=2020, limit=5)
- [x] T014 [P] [US2] Regression test school-districts/ccd/enrollment endpoint (year=2020, limit=5)
- [x] T015 [P] [US2] Regression test college-university/ipeds/directory endpoint (year=2020, limit=5)
- [x] T016 [US2] Verify no regression in response format or error handling

**Checkpoint**: Backward compatibility confirmed - all original endpoints work identically

---

## Phase 4: User Story 3 - Receive Clear Error Messages (Priority: P2)

**Goal**: Ensure users receive clear validation errors for non-whitelisted endpoints

**Independent Test**: Query an invalid endpoint (e.g., college-university/ipeds/fake-topic) and verify clear validation error message is returned

### Verification for User Story 3

- [x] T017 [US3] Test non-whitelisted endpoint returns ValidationError (not API 404)
- [x] T018 [US3] Verify error message includes "Invalid endpoint" with endpoint path
- [x] T019 [US3] Confirm error response includes list of available endpoints (or reference to them)
- [x] T020 [US3] Verify malformed requests still return proper Zod validation errors

**Checkpoint**: Error handling provides clear, actionable feedback

---

## Phase 5: User Story 4 - Use Test Fixtures Without Mocking (Priority: P3)

**Goal**: Enable test fixtures to use expanded whitelist without requiring validation mocking

**Independent Test**: Run test suite and verify tests using new endpoints pass without mocking

### Implementation for User Story 4

- [x] T021 [US4] Review tests/fixtures/test-data.ts for endpoints that now pass validation
- [x] T022 [US4] Search for validation mocking in test files (grep for "validateEndpoint" or mocking patterns)
- [x] T023 [US4] Remove any validation mocking that is no longer needed for whitelisted endpoints
- [x] T024 [US4] Update test fixtures to use newly whitelisted endpoints (if not already)
- [x] T025 [US4] Run full test suite and verify all tests pass

**Checkpoint**: Test suite runs cleanly with expanded whitelist

---

## Phase 6: User Story 5 - Documentation for Future Endpoint Access (Priority: P2)

**Goal**: Document the approach and process for adding new endpoints when Urban Institute API evolves

**Independent Test**: Review README.md and CHANGELOG.md confirm they accurately describe the validation approach

### Implementation for User Story 5

- [x] T026 [P] [US5] Update README.md with section on endpoint validation approach
- [x] T027 [P] [US5] Add list of all 16 whitelisted endpoints to README.md
- [x] T028 [P] [US5] Document process for adding new endpoints when API evolves
- [x] T029 [P] [US5] Update CHANGELOG.md to move expanded endpoints from [Unreleased] to next version
- [x] T030 [US5] Add inline code comments in src/config/endpoints.ts explaining the security approach

**Checkpoint**: Documentation is complete and accurate

---

## Phase 7: Polish & Integration Testing

**Purpose**: Final verification that all user stories work together

- [x] T031 [P] Run integration test scenarios from contracts/api-behavior.md
- [x] T032 [P] Verify performance requirements (< 2 seconds for valid endpoints)
- [x] T033 [P] Verify security validations remain active (Zod schemas, sanitization)
- [x] T034 Test edge cases from spec.md (malformed requests, API downtime simulation, empty results)
- [x] T035 [P] Run quickstart.md validation workflow
- [x] T036 [P] Update version number if ready for release (e.g., from 0.1.0 to 0.2.0)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Verification)**: No dependencies - start immediately to assess current state
- **Phase 2 (US1)**: Depends on Phase 1 verification - Test new IPEDS endpoints
- **Phase 3 (US2)**: Can run in parallel with Phase 2 - Independent regression testing
- **Phase 4 (US3)**: Can run in parallel with Phases 2-3 - Independent error testing
- **Phase 5 (US4)**: Depends on Phases 2-3 completing - Needs confirmed endpoint behavior
- **Phase 6 (US5)**: Can run in parallel with all phases - Documentation is independent
- **Phase 7 (Polish)**: Depends on all previous phases - Final integration

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories - Tests new endpoints independently
- **US2 (P1)**: No dependencies on other stories - Tests original endpoints independently
- **US3 (P2)**: No dependencies on other stories - Tests error handling independently
- **US4 (P3)**: Depends on US1/US2 confirming endpoints work - Needs stable validation
- **US5 (P2)**: No dependencies on other stories - Documentation is independent

### Parallel Opportunities

**Maximum Parallelism** (if team capacity allows):

```bash
# After Phase 1 verification, these can all run in parallel:

# Developer A: User Story 1 (new endpoints)
Task: T005-T011 (Test all new IPEDS endpoints in parallel)

# Developer B: User Story 2 (regression)
Task: T012-T016 (Test all original endpoints in parallel)

# Developer C: User Story 3 (error handling)
Task: T017-T020 (Test error scenarios in parallel)

# Developer D: User Story 5 (documentation)
Task: T026-T030 (Update all documentation in parallel)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Verification (current state)
2. Complete Phase 2: US1 - Test new IPEDS endpoints work
3. Complete Phase 3: US2 - Verify no regression in original endpoints
4. **STOP and VALIDATE**: Confirm core functionality works
5. Ready for deployment

### Full Feature Delivery

1. Phases 1-3: Core functionality verified (US1, US2) → MVP ready
2. Phase 4: Error handling verified (US3) → User experience improved
3. Phase 5: Test suite cleaned up (US4) → Technical debt removed
4. Phase 6: Documentation complete (US5) → Future-proofed
5. Phase 7: Final polish → Production ready

### Quick Win Path (If Already Complete)

Based on verification, the endpoints may already be fully expanded:

1. T001-T004: Verify current state (5 minutes)
2. T005-T016: Smoke test all endpoints (15 minutes)
3. T017-T020: Verify error handling (5 minutes)
4. T021-T025: Clean up test fixtures (10 minutes)
5. T026-T030: Update documentation (15 minutes)
6. **Total**: ~50 minutes to full completion

---

## Parallel Example: Testing All New Endpoints

```bash
# Launch all new IPEDS endpoint tests together (after T001-T004):
Task T005: "Test fall-enrollment endpoint"
Task T006: "Test institutional-characteristics endpoint"
Task T007: "Test admissions-enrollment endpoint"
Task T008: "Test completions-cip-2 endpoint"
Task T009: "Test enrollment endpoint"
Task T010: "Test outcome-measures endpoint"

# Launch all regression tests together:
Task T012: "Test schools/ccd/enrollment"
Task T013: "Test schools/ccd/directory"
Task T014: "Test school-districts/ccd/enrollment"
Task T015: "Test college-university/ipeds/directory"

# Launch all documentation updates together:
Task T026: "Update README.md"
Task T027: "Add endpoint list"
Task T028: "Document process"
Task T029: "Update CHANGELOG.md"
Task T030: "Add code comments"
```

---

## Success Criteria Mapping

| Success Criteria | Verified By | Status |
|-----------------|-------------|---------|
| SC-001: fall-enrollment returns data in < 2s | T005 | ✅ Complete |
| SC-002: All 11 IPEDS endpoints work | T005-T011 | ✅ Complete |
| SC-003: Invalid endpoints return validation errors | T017-T018 | ✅ Complete |
| SC-004: Zero code changes for new API endpoints | T026-T028 (documentation) | ✅ Complete |
| SC-005: 4 original endpoints still work | T012-T015 | ✅ Complete |
| SC-006: Test fixtures work without mocking | T021-T025 | ✅ Complete |
| SC-008: 90% of queries now succeed | T005-T011 (verify unblocked) | ✅ Complete |

---

## Notes

- **Current State**: endpoints.ts already has 16 endpoints - main work is verification and documentation
- **No Implementation Needed**: The endpoint expansion appears complete from Phase 6 work
- **Focus Areas**: Testing, verification, documentation, test fixture cleanup
- [P] tasks can run in parallel (different files, no dependencies)
- Each user story is independently testable
- Stop at any checkpoint to validate before proceeding
- Estimated total time: 50-90 minutes depending on test coverage depth
