# Tasks: Technical Debt Remediation and Architectural Improvements

**Input**: Design documents from `/specs/001-i-want-to/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/module-interfaces.md

**Tests**: ✅ Tests ARE included - User Story 5 (P5) explicitly requests testing infrastructure with 80%+ coverage (FR-022 through FR-027)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. This allows for incremental delivery where each story can be completed, tested, and demonstrated independently.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

## Path Conventions
- Single project structure: `src/` and `tests/` at repository root
- All paths relative to `/home/user/projects/edu_data_mcp_server/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling configuration

- [X] T001 [P] [Setup] Install dependencies: `npm install --save-dev vitest @vitest/ui zod lru-cache pino eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin`
- [X] T002 [P] [Setup] Create Vitest configuration file `vitest.config.ts` with coverage thresholds (80% lines, 80% functions, 75% branches)
- [X] T003 [P] [Setup] Create ESLint configuration `.eslintrc.json` with TypeScript recommended rules
- [X] T004 [P] [Setup] Create Prettier configuration `.prettierrc.json` with 2-space indent, single quotes
- [X] T005 [P] [Setup] Update `package.json` scripts: add `test`, `test:watch`, `test:coverage`, `lint`, `format`
- [X] T006 [P] [Setup] Create directory structure: `src/config/`, `src/models/`, `src/services/`, `src/handlers/`, `src/utils/`, `tests/unit/`, `tests/integration/`, `tests/fixtures/`

**Checkpoint**: Development environment ready with all tools configured

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core shared infrastructure that ALL user stories depend on. MUST complete before any user story work begins.

**⚠️ CRITICAL**: No user story implementation can start until this phase is complete

- [X] T007 [P] [Foundation] Create `src/models/types.ts` - Define all TypeScript interfaces (EducationDataRequest, SummaryDataRequest, EndpointMetadata, CacheEntry, ApiRequest, LogContext)
- [X] T008 [P] [Foundation] Create `src/config/constants.ts` - Define API_BASE_URL, cache TTLs (300000ms for responses, 3600000ms for metadata), limits (max limit: 10000), timeouts (30000ms default)
- [X] T009 [Foundation] Create `src/config/endpoints.ts` - Move endpoint metadata from current index.ts (schools/ccd/enrollment, school-districts/ccd/enrollment, college-university/ipeds/directory, etc.)
- [X] T010 [P] [Foundation] Create `src/utils/errors.ts` - Define custom error classes (ValidationError, ApiError) and error formatting utilities (formatErrorForClient, logErrorWithContext, isRetryableError)
- [X] T011 [P] [Foundation] Create `tests/fixtures/mock-responses.ts` - Mock API responses for testing
- [X] T012 [P] [Foundation] Create `tests/fixtures/test-data.ts` - Test input data (valid requests, invalid requests, edge cases)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel (if staffed) or sequentially by priority

---

## Phase 3: User Story 1 - Code Maintainability and Modularity (Priority: P1) 🎯 MVP

**Goal**: Transform monolithic 500-line single file into modular architecture with clear separation of concerns

**Independent Test**: Modify API client logic in one file without touching handlers or server setup. Verify new developer can understand module purposes within 15 minutes.

### Implementation for User Story 1

- [X] T013 [US1] Extract existing API HTTP logic from `src/index.ts` into `src/services/api-client.ts` - Implement buildUrl(), deduplication logic, axios calls (preserving exact behavior)
- [X] T014 [US1] Extract MCP tool handlers from `src/index.ts` into `src/handlers/tools.ts` - Move get_education_data and get_education_data_summary handlers
- [X] T015 [US1] Extract MCP resource handlers from `src/index.ts` into `src/handlers/resources.ts` - Move ListResources, ListResourceTemplates, ReadResource handlers
- [X] T016 [US1] Create `src/server.ts` - MCP server configuration and request handler wiring with dependency injection pattern
- [X] T017 [US1] Refactor `src/index.ts` - Slim down to pure entry point (just bootstrap server initialization, 20-30 lines)
- [X] T018 [US1] Verify modular architecture with inspector - Run `npm run inspector` to confirm tools still work identically
- [X] T019 [US1] Create module dependency documentation in `src/README.md` - Document which modules depend on which, import graph

**Checkpoint**: Monolith broken into modules. Each component has single responsibility. Zero behavior changes. SC-001 achieved (can modify one module without touching others).

---

## Phase 4: User Story 2 - Input Validation and Security Hardening (Priority: P2)

**Goal**: Validate and sanitize all inputs to prevent malicious requests from compromising the system

**Independent Test**: Send malicious inputs (SQL injection, XSS, excessive limits, missing parameters) and verify appropriate errors returned without crashes

**Dependencies**: Requires US1 (modular services) to inject validator into handlers

### Tests for User Story 2 (TDD - Write FIRST, ensure they FAIL)

- [X] T020 [P] [US2] Create `tests/unit/services/validator.test.ts` - Test all validation rules (required fields, types, ranges, regex patterns, sanitization)
- [X] T021 [P] [US2] Create security test cases in `tests/unit/services/validator.test.ts` - SQL injection attempts, XSS payloads, path traversal, control characters, excessive length (>100 chars)

### Implementation for User Story 2

- [X] T022 [US2] Create Zod schemas in `src/models/schemas.ts` - EducationDataRequestSchema and SummaryDataRequestSchema with all validation rules from data-model.md
- [X] T023 [US2] Implement `src/services/validator.ts` - validateEducationDataRequest(), validateSummaryDataRequest(), sanitizeString(), validateEndpoint() using Zod schemas
- [X] T024 [US2] Integrate validator into `src/handlers/tools.ts` - Add validation before API calls, catch ValidationError and format for MCP
- [X] T025 [US2] Add validation error handling in `src/utils/errors.ts` - Ensure errors include field name, expected format, sanitized received value
- [X] T026 [US2] Run validation tests - `npm test` validator.test.ts should now PASS (previously failed)

**Checkpoint**: 100% input validation. Malicious inputs rejected. SC-002 achieved (all malicious test cases rejected).

---

## Phase 5: User Story 3 - Error Handling and Observability (Priority: P3)

**Goal**: Comprehensive error handling and structured logging for production diagnosis and monitoring

**Independent Test**: Trigger network failures, API errors, invalid inputs - verify detailed logs produced and graceful error messages returned (no stack traces to client)

**Dependencies**: Requires US1 (modular services) and US2 (validation errors) to handle and log properly

### Tests for User Story 3 (TDD - Write FIRST, ensure they FAIL)

- [ ] T027 [P] [US3] Create `tests/unit/utils/errors.test.ts` - Test error formatting (client vs logged), error classification, retryable detection
- [ ] T028 [P] [US3] Create `tests/unit/utils/retry.test.ts` - Test exponential backoff calculation, jitter, max retries, retry predicate
- [ ] T029 [P] [US3] Create `tests/integration/api-client.integration.test.ts` - Test retry behavior with mock server (503, timeout, success on retry)

### Implementation for User Story 3

- [ ] T030 [US3] Implement `src/services/logger.ts` - Initialize pino with stderr output, JSON in production, pretty-print in dev, child() for context, redaction config
- [ ] T031 [US3] Implement `src/utils/retry.ts` - retry() function with exponential backoff, RetryConfig interface, calculateDelay() with jitter
- [ ] T032 [US3] Enhance `src/services/api-client.ts` - Add retry logic for 429/503/timeout, request timeout (30s), proper ApiError throwing with retryable flag
- [ ] T033 [US3] Add logging to all services - Import logger, create child loggers with context, log errors (FR-016, FR-029), log requests (FR-028)
- [ ] T034 [US3] Update `src/handlers/tools.ts` - Wrap with try/catch, log errors with context, call formatErrorForClient() before returning to MCP
- [ ] T035 [US3] Run error handling tests - `npm test` errors.test.ts and retry.test.ts should now PASS

**Checkpoint**: Resilient error handling. Retry logic active. Structured logs. SC-003 achieved (graceful degradation during API outages). SC-010 partially achieved (diagnostic logs with context).

---

## Phase 6: User Story 4 - Performance Optimization and Caching (Priority: P4)

**Goal**: Fast response times through intelligent caching with LRU eviction and TTL

**Independent Test**: Make identical requests repeatedly - verify sub-100ms cache hits, LRU eviction when full, TTL expiration

**Dependencies**: Requires US1 (modular api-client) to integrate cache layer

### Tests for User Story 4 (TDD - Write FIRST, ensure they FAIL)

- [ ] T036 [P] [US4] Create `tests/unit/services/cache.test.ts` - Test get/set/delete, TTL expiration, LRU eviction, stats tracking, concurrent access
- [ ] T037 [P] [US4] Create cache performance tests in `tests/integration/cache-performance.test.ts` - Verify <100ms cache hits, memory bounds with 1000 entries

### Implementation for User Story 4

- [ ] T038 [US4] Implement `src/services/cache.ts` - Wrap lru-cache, implement get<T>(), set<T>(), has(), delete(), clear(), getStats() with hit/miss tracking
- [ ] T039 [US4] Add cache key generation to `src/services/api-client.ts` - generateCacheKey() function (hash all request parameters)
- [ ] T040 [US4] Integrate cache into `src/services/api-client.ts` - Check cache before API call, store successful responses, implement promise coalescing for concurrent identical requests (FR-021)
- [ ] T041 [US4] Configure cache instances in `src/server.ts` - Create separate caches for endpoint metadata (1hr TTL, 100 max) and API responses (5min TTL, 1000 max)
- [ ] T042 [US4] Add cache hit logging - Log cache hits/misses with request ID in api-client
- [ ] T043 [US4] Run cache tests - `npm test` cache.test.ts should now PASS, verify performance benchmarks

**Checkpoint**: Caching active. SC-004 achieved (<100ms cache hits, 90%+ improvement). SC-009 partially achieved (concurrent request deduplication).

---

## Phase 7: User Story 5 - Testing Infrastructure and Quality Assurance (Priority: P5)

**Goal**: Automated tests, code quality tools, 80%+ coverage for critical paths

**Independent Test**: Run `npm test` - all tests execute in <30 seconds with coverage report. Run `npm run lint` - all quality checks pass.

**Dependencies**: Requires US1-US4 implemented to have code to test

### Tests for User Story 5 (Additional Coverage)

- [ ] T044 [P] [US5] Create `tests/unit/services/api-client.test.ts` - Test URL building, error mapping, deduplication, timeout handling
- [ ] T045 [P] [US5] Create `tests/unit/handlers/tools.test.ts` - Test tool handler validation→cache→API flow, error propagation
- [ ] T046 [P] [US5] Create `tests/unit/handlers/resources.test.ts` - Test resource listing, URI parsing, endpoint lookup
- [ ] T047 [P] [US5] Create `tests/integration/server.integration.test.ts` - End-to-end MCP tool calls, verify response format, test error scenarios

### Quality Assurance for User Story 5

- [ ] T048 [US5] Configure code coverage thresholds in `vitest.config.ts` - Set minimums: 80% lines, 80% functions, 75% branches (exclude src/config, tests)
- [ ] T049 [US5] Create pre-commit hooks with Husky + lint-staged - Auto-run lint and format on commit
- [ ] T050 [US5] Run full test suite with coverage - `npm run test:coverage` and verify ≥80% for critical paths (services/, handlers/, utils/)
- [ ] T051 [US5] Verify all quality gates - Run `npm run lint`, `npm run format:check`, `npx tsc --noEmit` - all should pass
- [ ] T052 [US5] Update `package.json` scripts - Ensure `test`, `test:watch`, `test:coverage`, `lint`, `format`, `typecheck` all work
- [ ] T053 [US5] Document testing workflow in quickstart.md - Add examples of running tests, TDD cycle, debugging tests

**Checkpoint**: Test infrastructure complete. SC-005 achieved (80%+ coverage). SC-008 achieved (quality gates pass). All 5 user stories independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements that affect multiple user stories or overall project quality

- [ ] T054 [P] [Polish] Update `CLAUDE.md` with final architecture decisions and development patterns
- [ ] T055 [P] [Polish] Create `src/config/README.md` documenting configuration options (cache TTL, timeouts, limits)
- [ ] T056 [P] [Polish] Add JSDoc comments to all public interfaces in services and handlers
- [ ] T057 [Polish] Performance optimization pass - Profile cache hit rates, optimize hot paths identified in logs
- [ ] T058 [Polish] Security audit - Review all error messages for sensitive data leakage, verify input sanitization completeness
- [ ] T059 [P] [Polish] Update main `README.md` with new architecture overview and contribution guide
- [ ] T060 [Polish] Final integration test - Run `npm run inspector`, test both tools with various inputs (valid, invalid, edge cases)
- [ ] T061 [Polish] Verify all 10 success criteria from spec.md - Create checklist and validate each SC-001 through SC-010

**Checkpoint**: Project complete, production-ready, all acceptance criteria met

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS all user stories)
    ↓
    ├─→ Phase 3: US1 (Modularity) ──────────────────────┐
    ├─→ Phase 4: US2 (Validation) [depends on US1] ─────┤
    ├─→ Phase 5: US3 (Error Handling) [depends on US1+US2]│
    ├─→ Phase 6: US4 (Caching) [depends on US1] ────────┤
    └─→ Phase 7: US5 (Testing) [depends on US1-US4] ────┘
            ↓
Phase 8: Polish (Cross-cutting)
```

### User Story Dependencies

- **US1 (Modularity)**: No dependencies on other user stories - Can start immediately after Foundation
- **US2 (Validation)**: DEPENDS on US1 (needs modular validator service)
- **US3 (Error Handling)**: DEPENDS on US1 (needs modular services) + US2 (handles validation errors)
- **US4 (Caching)**: DEPENDS on US1 (integrates with modular api-client)
- **US5 (Testing)**: DEPENDS on US1-US4 (tests the implemented code)

### Critical Path (Sequential MVP)

For solo developer or minimal viable product:
1. Phase 1 (Setup) → Phase 2 (Foundation) → **Phase 3 (US1 Modularity)**
2. Then add: Phase 4 (US2 Validation) → Phase 5 (US3 Errors) → Phase 6 (US4 Cache) → Phase 7 (US5 Tests)

### Parallel Opportunities (Multi-Developer Team)

After Foundation complete:
- **Developer A**: US1 (Modularity) - T013-T019
- **Developer B**: Can start US2 tests (T020-T021) while waiting for US1
- After US1 complete:
  - **Developer A**: US2 implementation (T022-T026)
  - **Developer B**: US3 tests (T027-T029)
  - **Developer C**: US4 tests (T036-T037)
- After US2 complete:
  - **Developer A**: US3 implementation (T030-T035)
  - **Developer B**: US4 implementation (T038-T043) [parallel, only depends on US1]

---

## Parallel Execution Examples

### Phase 1: Setup (All can run in parallel)
```bash
# Launch all setup tasks together:
Task: "Install dependencies: vitest, zod, lru-cache, pino..."
Task: "Create vitest.config.ts with coverage thresholds"
Task: "Create ESLint configuration .eslintrc.json"
Task: "Create Prettier configuration .prettierrc.json"
Task: "Update package.json scripts"
Task: "Create directory structure"
```

### Phase 2: Foundational
```bash
# Can run in parallel (different files):
Task: "Create src/models/types.ts" [P]
Task: "Create src/config/constants.ts" [P]
Task: "Create src/utils/errors.ts" [P]
Task: "Create tests/fixtures/mock-responses.ts" [P]
Task: "Create tests/fixtures/test-data.ts" [P]

# Then sequentially:
Task: "Create src/config/endpoints.ts" (may need types)
```

### User Story 2: Validation Tests (can run in parallel)
```bash
Task: "Create tests/unit/services/validator.test.ts - validation rules"
Task: "Create tests/unit/services/validator.test.ts - security test cases"
```

### User Story 5: Testing Infrastructure (can run in parallel)
```bash
Task: "Create tests/unit/services/api-client.test.ts" [P]
Task: "Create tests/unit/handlers/tools.test.ts" [P]
Task: "Create tests/unit/handlers/resources.test.ts" [P]
Task: "Create tests/integration/server.integration.test.ts" [P]
```

---

## Implementation Strategy

### MVP First (Phases 1-3: User Story 1 Only)

**Fastest path to working modular code**:
1. Complete Phase 1: Setup (T001-T006) - ~1 hour
2. Complete Phase 2: Foundational (T007-T012) - ~2 hours
3. Complete Phase 3: User Story 1 (T013-T019) - ~4 hours
4. **STOP and VALIDATE**: Run `npm run inspector` - verify tools work
5. **You now have**: Modular, maintainable codebase (SC-001 achieved)

**Total MVP time**: ~7 hours of focused work

### Incremental Delivery

**Week 1**: Foundation + US1 (Modularity)
- Day 1: Setup + Foundation → ~3 hours
- Day 2-3: US1 implementation → ~4 hours
- **Deliverable**: Modular codebase, easier maintenance

**Week 2**: US2 (Validation) + US3 (Error Handling)
- Day 1-2: US2 tests + implementation → ~6 hours
- Day 3-4: US3 tests + implementation → ~6 hours
- **Deliverable**: Secure, observable system

**Week 3**: US4 (Caching) + US5 (Testing)
- Day 1-2: US4 tests + implementation → ~5 hours
- Day 3-5: US5 comprehensive test suite → ~8 hours
- **Deliverable**: Production-ready with <100ms cache hits, 80%+ coverage

**Week 4**: Polish + Documentation
- Day 1-3: Polish tasks (T054-T061) → ~6 hours
- **Final Deliverable**: All 10 success criteria met, ready for deployment

### Parallel Team Strategy (3 Developers)

**Week 1**:
- All devs: Setup + Foundation together (~3 hours)
- Dev A: US1 Modularity (T013-T019)
- Dev B: Write US2 tests (T020-T021) + US3 tests (T027-T029)
- Dev C: Write US4 tests (T036-T037) + US5 tests (T044-T047)

**Week 2** (after US1 complete):
- Dev A: US2 implementation (T022-T026)
- Dev B: US3 implementation (T030-T035)
- Dev C: US4 implementation (T038-T043)

**Week 3**:
- All devs: US5 quality assurance (T048-T053) together
- Pair on integration testing and polish

**Total team time**: ~2-3 weeks vs 4 weeks solo

---

## Task Counts & Coverage

| Phase | User Story | Task Count | Test Tasks | Implementation Tasks |
|-------|-----------|-----------|------------|---------------------|
| 1 | Setup | 6 | 0 | 6 |
| 2 | Foundation | 6 | 0 | 6 |
| 3 | US1 Modularity (P1) | 7 | 0 | 7 |
| 4 | US2 Validation (P2) | 7 | 2 | 5 |
| 5 | US3 Error Handling (P3) | 9 | 3 | 6 |
| 6 | US4 Caching (P4) | 8 | 2 | 6 |
| 7 | US5 Testing (P5) | 10 | 4 | 6 |
| 8 | Polish | 8 | 0 | 8 |
| **TOTAL** | **5 stories** | **61 tasks** | **11 test tasks** | **50 impl tasks** |

### Test Coverage by User Story

- **US2 (Validation)**: 100% coverage of validation logic (T020-T021)
- **US3 (Error Handling)**: 100% coverage of error/retry logic (T027-T029)
- **US4 (Caching)**: 100% coverage of cache operations (T036-T037)
- **US5 (Testing)**: Comprehensive unit/integration tests (T044-T047)
- **Overall Target**: 80%+ coverage per FR-022 through FR-027

### Parallelization Opportunities

- **Phase 1**: 6/6 tasks can run in parallel (100%)
- **Phase 2**: 5/6 tasks can run in parallel (83%)
- **User Stories**: After Foundation, all 5 stories can start in parallel (with dependency management)
- **Overall**: ~40% of tasks marked [P] can run concurrently

---

## Notes

- **[P] marker**: Different files, no dependencies → safe for parallel execution
- **[Story] label**: Maps each task to specific user story (US1-US5) for traceability
- **TDD approach**: Tests written FIRST for US2-US5, must FAIL before implementation
- **Independent testing**: Each user story has explicit "Independent Test" criteria
- **Checkpoints**: Validate after each phase before proceeding
- **MVP scope**: Phases 1-3 (Setup + Foundation + US1) = minimal viable modular codebase
- **Incremental value**: Each completed user story adds independent value
- **Success criteria**: Task T061 validates all 10 SC from spec.md before marking complete

### Verification Commands

```bash
# After each phase:
npm run build                    # Verify TypeScript compiles
npm run inspector                # Verify MCP tools work
npm run test                     # Verify tests pass
npm run test:coverage            # Verify coverage thresholds
npm run lint                     # Verify code quality
npx tsc --noEmit                # Verify type safety
```

### Task Completion Criteria

Each task is complete when:
1. Code compiles (`npm run build` succeeds)
2. Tests pass (if task has associated tests)
3. Linting passes (`npm run lint` clean)
4. Changes committed to git (if using version control)
5. Acceptance criteria verified (per user story)
