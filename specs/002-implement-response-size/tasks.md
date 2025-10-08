# Tasks: Response Size Optimization and Pagination Controls

**Input**: Design documents from `/specs/002-implement-response-size/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pagination-api.yaml

**Tests**: Tests are included for this feature to validate critical pagination logic and token reduction goals.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Paths use existing modular structure: config, handlers, models, services, utils

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Update TypeScript configuration and add pagination constants

- [ ] T001 [P] Update `src/config/constants.ts` to change DEFAULT_LIMIT from 100 to 20
- [ ] T002 [P] Add TOKEN_LIMITS constants to `src/config/constants.ts` (CHARS_PER_TOKEN: 3, MAX_RESPONSE_TOKENS: 10000, WARNING_THRESHOLD_TOKENS: 8000)
- [ ] T003 [P] Create test fixtures directory `tests/fixtures/` if it doesn't exist

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions and validation schemas that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] [Foundation] Add `PaginationParams` interface to `src/models/types.ts` (page?, limit?, offset?)
- [ ] T005 [P] [Foundation] Add `PaginationMetadata` interface to `src/models/types.ts` (total_count, current_page, page_size, total_pages, has_more, next_page)
- [ ] T006 [P] [Foundation] Add `PaginatedResponse<T>` interface to `src/models/types.ts` (results: T[], pagination: PaginationMetadata)
- [ ] T007 [P] [Foundation] Add `FieldSelectionParams` interface to `src/models/types.ts` (fields?: string[])
- [ ] T008 [P] [Foundation] Add `TokenEstimate` interface to `src/models/types.ts` (estimated_tokens, character_count, exceeds_limit)
- [ ] T009 [P] [Foundation] Create `PaginationParamsSchema` in `src/models/schemas.ts` using zod with validation for page/offset mutual exclusivity
- [ ] T010 [P] [Foundation] Create `FieldSelectionSchema` in `src/models/schemas.ts` using zod
- [ ] T011 [P] [Foundation] Create `RequestParamsSchema` in `src/models/schemas.ts` combining pagination + field selection schemas
- [ ] T012 [Foundation] Update `EducationDataRequest` interface in `src/models/types.ts` to include page?, offset?, fields? parameters
- [ ] T013 [Foundation] Update `SummaryDataRequest` interface in `src/models/types.ts` to include page?, offset?, fields? parameters

**Checkpoint**: Foundation types ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Query Large Datasets Without Token Overflow (Priority: P1) 🎯 MVP

**Goal**: Enable AI agents to query large datasets without receiving 4.4M token responses. Default to 20 records per request with compact JSON formatting and token validation.

**Independent Test**: Make a query for school enrollment data filtered by state, verify response is under 10,000 tokens with 20 records and pagination metadata.

### Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T014 [P] [US1] Create `tests/fixtures/large-dataset.json` with mock API response containing 100+ school records
- [ ] T015 [P] [US1] Write unit test in `tests/unit/response-formatter.test.ts` for compact JSON formatting (no indentation)
- [ ] T016 [P] [US1] Write unit test in `tests/unit/response-formatter.test.ts` for token estimation with CHARS_PER_TOKEN ratio
- [ ] T017 [P] [US1] Write unit test in `tests/unit/response-formatter.test.ts` for pagination metadata calculation (total_count, current_page, has_more, next_page)
- [ ] T018 [P] [US1] Write integration test in `tests/integration/pagination-flow.test.ts` for default limit behavior (should return 20 records when limit not specified)
- [ ] T019 [P] [US1] Write integration test in `tests/integration/pagination-flow.test.ts` for token limit validation (should error when response exceeds MAX_RESPONSE_TOKENS)

### Implementation for User Story 1

- [ ] T020 [US1] Create `src/services/response-formatter.ts` with `calculatePaginationMetadata()` function
- [ ] T021 [US1] Implement `estimateTokens()` function in `src/services/response-formatter.ts` using character-based approximation (÷3)
- [ ] T022 [US1] Implement `formatPaginatedResponse()` function in `src/services/response-formatter.ts` to create PaginatedResponse structure
- [ ] T023 [US1] Implement `sliceApiPage()` helper in `src/services/response-formatter.ts` to extract user's requested page from API's 10K record chunks
- [ ] T024 [US1] Update `handleGetEducationData()` in `src/handlers/tools.ts` to use formatPaginatedResponse() and return compact JSON (remove null, 2 from JSON.stringify)
- [ ] T025 [US1] Update `handleGetEducationDataSummary()` in `src/handlers/tools.ts` to use formatPaginatedResponse() and return compact JSON
- [ ] T026 [US1] Add token validation logic to `src/handlers/tools.ts` before returning response (throw error if exceeds MAX_RESPONSE_TOKENS)
- [ ] T027 [US1] Add pagination-specific error types to `src/utils/errors.ts` (TokenLimitError, PaginationError)
- [ ] T028 [US1] Update TOOL_DEFINITIONS in `src/handlers/tools.ts` to add limit parameter with default: 20 and description

**Checkpoint**: At this point, User Story 1 should be fully functional - default 20 record limit, compact JSON, token validation, pagination metadata

---

## Phase 4: User Story 2 - Navigate Through Large Result Sets (Priority: P2)

**Goal**: Enable AI agents to navigate through multi-page results using page or offset parameters with clear pagination metadata.

**Independent Test**: Make an initial query returning page 1 with 20 results, then use pagination.next_page to request page 2, verify you receive the next 20 results.

### Tests for User Story 2

- [ ] T029 [P] [US2] Write unit test in `tests/unit/validator.test.ts` for page parameter validation (must be >= 1)
- [ ] T030 [P] [US2] Write unit test in `tests/unit/validator.test.ts` for offset parameter validation (must be >= 0)
- [ ] T031 [P] [US2] Write unit test in `tests/unit/validator.test.ts` for page/offset mutual exclusivity validation
- [ ] T032 [P] [US2] Write unit test in `tests/unit/validator.test.ts` for limit validation (must be between 1 and 1000)
- [ ] T033 [P] [US2] Write integration test in `tests/integration/pagination-flow.test.ts` for page-based navigation (request page 1, then page 2, verify correct records)
- [ ] T034 [P] [US2] Write integration test in `tests/integration/pagination-flow.test.ts` for offset-based navigation (request offset=0, then offset=20, verify correct records)
- [ ] T035 [P] [US2] Write integration test in `tests/integration/pagination-flow.test.ts` for out-of-range page request (should return empty results with metadata)

### Implementation for User Story 2

- [ ] T036 [P] [US2] Implement `validatePaginationParams()` function in `src/services/validator.ts` using PaginationParamsSchema
- [ ] T037 [US2] Add offset/page conversion logic to `src/services/validator.ts` (if page provided, calculate offset; if offset provided, calculate page)
- [ ] T038 [US2] Update `buildEducationDataUrl()` in `src/services/api-client.ts` to handle pagination parameters and determine which API page to fetch (API returns 10K records per page)
- [ ] T039 [US2] Update `buildSummaryDataUrl()` in `src/services/api-client.ts` to handle pagination parameters
- [ ] T040 [US2] Update `fetchEducationData()` in `src/services/api-client.ts` to use pagination-aware URL building
- [ ] T041 [US2] Update `fetchSummaryData()` in `src/services/api-client.ts` to use pagination-aware URL building
- [ ] T042 [US2] Update `handleGetEducationData()` in `src/handlers/tools.ts` to call validatePaginationParams() before fetching data
- [ ] T043 [US2] Update `handleGetEducationDataSummary()` in `src/handlers/tools.ts` to call validatePaginationParams() before fetching data
- [ ] T044 [US2] Update TOOL_DEFINITIONS in `src/handlers/tools.ts` to add page and offset parameters with descriptions and validation rules

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can paginate with page or offset parameters

---

## Phase 5: User Story 3 - Control Response Detail Level (Priority: P3)

**Goal**: Enable AI agents to request only specific fields to further reduce token usage (50%+ reduction possible).

**Independent Test**: Make a query with fields=['name', 'enrollment'], verify response contains only those two fields per record.

### Tests for User Story 3

- [ ] T045 [P] [US3] Write unit test in `tests/unit/response-formatter.test.ts` for field selection with valid fields (should filter records to only requested fields)
- [ ] T046 [P] [US3] Write unit test in `tests/unit/response-formatter.test.ts` for field selection with empty/omitted fields (should return all fields - backward compatible)
- [ ] T047 [P] [US3] Write unit test in `tests/unit/validator.test.ts` for invalid field name validation (should error with available fields list)
- [ ] T048 [P] [US3] Write integration test in `tests/integration/pagination-flow.test.ts` for field selection token savings (verify 50%+ reduction with 3 fields vs all fields)

### Implementation for User Story 3

- [ ] T049 [P] [US3] Implement `selectFields()` helper in `src/services/response-formatter.ts` for client-side field filtering
- [ ] T050 [P] [US3] Implement `validateFields()` function in `src/services/validator.ts` using dynamic validation against actual record structure
- [ ] T051 [US3] Update `formatPaginatedResponse()` in `src/services/response-formatter.ts` to apply field selection after pagination slicing
- [ ] T052 [US3] Update `handleGetEducationData()` in `src/handlers/tools.ts` to call validateFields() if fields parameter provided
- [ ] T053 [US3] Update `handleGetEducationDataSummary()` in `src/handlers/tools.ts` to call validateFields() if fields parameter provided
- [ ] T054 [US3] Update TOOL_DEFINITIONS in `src/handlers/tools.ts` to add fields parameter with array of strings type and description
- [ ] T055 [US3] Add FieldSelectionError to `src/utils/errors.ts` with helpful error message listing available fields

**Checkpoint**: All user stories should now be independently functional - full pagination + field selection capability

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, edge case handling, and validation across all user stories

- [ ] T056 [P] Update `src/handlers/tools.ts` TOOL_DEFINITIONS descriptions to document pagination capabilities, response size limits, and new default limit (20)
- [ ] T057 [P] Add edge case tests in `tests/unit/validator.test.ts` for limit=0, negative limit, negative page, negative offset
- [ ] T058 [P] Add integration test in `tests/integration/pagination-flow.test.ts` for very large limit (e.g., 1000 records) to verify token limit enforcement
- [ ] T059 [P] Update `README.md` with pagination examples and migration guide from v0.1.0 to v0.2.0
- [ ] T060 [P] Create `CHANGELOG.md` entry documenting breaking changes (default limit 100→20, response structure change)
- [ ] T061 [P] Add logging for pagination parameter warnings in `src/handlers/tools.ts` (e.g., when approaching token limits)
- [ ] T062 Verify all success criteria from spec.md:
  - SC-001: Query 1000 schools returns <10K tokens (was 4.4M)
  - SC-002: Default queries return exactly 20 records
  - SC-003: Can navigate 10K+ records via pagination
  - SC-004: Response time <3 seconds
  - SC-005: 100% of large queries stay <10K tokens
  - SC-007: Field selection achieves 50%+ reduction
- [ ] T063 Run quickstart.md validation - execute all examples to verify they work as documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - Delivers: Default 20 record limit, compact JSON, token validation, pagination metadata
  - Independent MVP: Yes - fully testable on its own

- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 but independently testable
  - Delivers: Page and offset navigation parameters
  - Dependencies: Uses types/schemas from Foundation, extends US1 response structure
  - Independent test: Can verify page navigation works correctly

- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Builds on US1/US2 but independently testable
  - Delivers: Field selection for token optimization
  - Dependencies: Uses pagination from US1/US2, applies filtering in response formatter
  - Independent test: Can verify field filtering reduces tokens

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Foundation types/schemas before validation logic
- Validation before API client changes
- API client before handler updates
- Response formatting logic before handler integration
- Tool definition updates last (user-facing changes)

### Parallel Opportunities

**Setup Phase**:
- T001, T002, T003 can all run in parallel

**Foundational Phase**:
- T004-T011 (all type/schema definitions) can run in parallel
- T012-T013 (interface updates) can run after T004-T011

**User Story 1 Tests**:
- T014-T019 can all run in parallel (different test files or independent test cases)

**User Story 1 Implementation**:
- T020-T023 (response-formatter.ts) are sequential (same file)
- T024-T028 can run after T020-T023 completes

**User Story 2 Tests**:
- T029-T035 can all run in parallel

**User Story 2 Implementation**:
- T036-T037 (validator.ts) are sequential
- T038-T041 (api-client.ts) are sequential but can run parallel to T036-T037
- T042-T044 must run after both validator and api-client are complete

**User Story 3 Tests**:
- T045-T048 can all run in parallel

**User Story 3 Implementation**:
- T049 (response-formatter.ts) can run in parallel with T050 (validator.ts)
- T051-T055 must run after T049-T050 complete

**Polish Phase**:
- T056-T061 can all run in parallel
- T062-T063 must run last (validation)

**Cross-User-Story Parallelization**:
- Once Foundational completes, US1, US2, and US3 can ALL start in parallel (different team members)
- Example: Developer A works on US1, Developer B on US2, Developer C on US3
- Each story is independently testable and deliverable

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Create tests/fixtures/large-dataset.json with mock data (T014)"
Task: "Write unit test for compact JSON formatting (T015)"
Task: "Write unit test for token estimation (T016)"
Task: "Write unit test for pagination metadata (T017)"
Task: "Write integration test for default limit (T018)"
Task: "Write integration test for token validation (T019)"

# After tests pass/fail appropriately, launch response-formatter implementation:
Task: "Create response-formatter.ts with calculatePaginationMetadata (T020)"
# Then sequential tasks T021-T023 in response-formatter.ts
# Then parallel tasks in handlers:
Task: "Update handleGetEducationData (T024)"
Task: "Update handleGetEducationDataSummary (T025)"
```

---

## Parallel Example: User Story 2

```bash
# All US2 tests in parallel:
Task: "Unit test page validation (T029)"
Task: "Unit test offset validation (T030)"
Task: "Unit test mutual exclusivity (T031)"
Task: "Unit test limit validation (T032)"
Task: "Integration test page navigation (T033)"
Task: "Integration test offset navigation (T034)"
Task: "Integration test out-of-range (T035)"

# Implementation - validator and api-client in parallel:
# Thread 1: validator.ts
Task: "Implement validatePaginationParams (T036)"
Task: "Add offset/page conversion (T037)"

# Thread 2: api-client.ts (parallel to validator)
Task: "Update buildEducationDataUrl (T038)"
Task: "Update buildSummaryDataUrl (T039)"
Task: "Update fetchEducationData (T040)"
Task: "Update fetchSummaryData (T041)"

# After both threads complete:
Task: "Update handleGetEducationData (T042)"
Task: "Update handleGetEducationDataSummary (T043)"
Task: "Update TOOL_DEFINITIONS (T044)"
```

---

## Parallel Example: All User Stories in Parallel (Team Strategy)

```bash
# After Foundation completes, split team:

# Developer A: User Story 1 (T014-T028)
- Writes tests T014-T019
- Implements response-formatter T020-T023
- Updates handlers T024-T028
- DELIVERS: Default 20 limit + token validation (MVP!)

# Developer B: User Story 2 (T029-T044) - PARALLEL to Developer A
- Writes tests T029-T035
- Implements validator T036-T037
- Updates api-client T038-T041
- Updates handlers T042-T044
- DELIVERS: Page/offset navigation

# Developer C: User Story 3 (T045-T055) - PARALLEL to A & B
- Writes tests T045-T048
- Implements field selection T049-T050
- Updates response-formatter T051
- Updates handlers T052-T054
- Adds error handling T055
- DELIVERS: Field selection optimization

# All stories integrate seamlessly via Foundation types/schemas
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T013) - CRITICAL
3. Complete Phase 3: User Story 1 (T014-T028)
4. **STOP and VALIDATE**: Test independently
   - Query with no parameters → 20 records returned
   - Response is compact JSON
   - Token count < 10K
   - Pagination metadata present
5. Deploy/demo if ready - **This alone fixes the 4.4M token issue!**

### Incremental Delivery

1. **Milestone 1**: Setup + Foundation → Type system ready
2. **Milestone 2**: Add US1 → Test → Deploy (MVP! 20 record default)
3. **Milestone 3**: Add US2 → Test → Deploy (pagination navigation)
4. **Milestone 4**: Add US3 → Test → Deploy (field selection)
5. **Milestone 5**: Polish → Final validation → v0.2.0 release
6. Each milestone adds value without breaking previous milestones

### Parallel Team Strategy

With 3 developers after Foundation completes:

1. **Week 1**: All complete Setup + Foundational together (T001-T013)
2. **Week 2**: Split into parallel tracks
   - Dev A: US1 (T014-T028) - **Highest priority, blocks nothing**
   - Dev B: US2 (T029-T044) - Can work independently
   - Dev C: US3 (T045-T055) - Can work independently
3. **Week 3**: Integration + Polish (T056-T063)
4. Each developer can demo their story independently

---

## Task Summary

- **Total Tasks**: 63
- **Setup Phase**: 3 tasks
- **Foundational Phase**: 10 tasks (BLOCKS all user stories)
- **User Story 1 (P1)**: 15 tasks (6 tests + 9 implementation)
- **User Story 2 (P2)**: 16 tasks (7 tests + 9 implementation)
- **User Story 3 (P3)**: 11 tasks (4 tests + 7 implementation)
- **Polish Phase**: 8 tasks

**Parallel Opportunities**: ~35 tasks can run in parallel (56% of total)

**Independent Test Criteria**:
- **US1**: Query returns 20 records by default, compact JSON, <10K tokens, pagination metadata present
- **US2**: Can navigate to page 2 using pagination.next_page from page 1 response, correct 20 records returned
- **US3**: Query with fields=['name','enrollment'] returns only those fields, 50%+ token reduction vs full records

**Suggested MVP Scope**: Complete through User Story 1 (Phase 1-3), validate independently, deploy. This alone reduces 4.4M → <10K tokens!

---

## Notes

- [P] tasks = different files or independent logic, no sequential dependencies
- [Story] label (US1, US2, US3) maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group of parallel tasks
- Stop at any checkpoint to validate story independently
- Breaking changes documented in CHANGELOG and tool descriptions
- Backward compatibility maintained (old queries still work, just get 20 records instead of 100)
