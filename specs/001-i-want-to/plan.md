# Implementation Plan: Technical Debt Remediation and Architectural Improvements

**Branch**: `001-i-want-to` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-i-want-to/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This plan addresses technical debt in the Education Data MCP Server by transforming the current monolithic 500-line single-file architecture into a modular, tested, and production-ready system. The primary objective is to establish a clean architecture foundation (P1) that enables systematic implementation of security hardening (P2), comprehensive error handling (P3), performance optimization (P4), and automated testing (P5). The technical approach follows industry-standard separation of concerns: decompose the monolith into independent modules (API client, validators, handlers, cache, logger), establish clear contracts between modules, implement defense-in-depth security through input validation and sanitization, and build comprehensive test coverage with unit, integration, and contract testing.

## Technical Context

**Language/Version**: TypeScript 5.3.3 with Node.js (ES2022 target, Node16 modules)
**Primary Dependencies**: @modelcontextprotocol/sdk 0.6.0, axios 1.8.4, lru-cache (caching), zod (validation), pino (logging)
**Storage**: In-memory caching (LRU cache for API responses and endpoint metadata)
**Testing**: Vitest with c8 coverage, unit tests (70%), integration tests (25%), contract tests (5%)
**Target Platform**: Node.js server (stdio transport for MCP protocol)
**Project Type**: Single project (library/CLI hybrid - MCP server with stdio interface)
**Performance Goals**: <100ms cache hit response time, <2s cold API request, handle 100 concurrent requests
**Constraints**: <200ms p95 for cached requests, graceful degradation during API outages, zero data loss on cache eviction
**Scale/Scope**: Single MCP server instance, 2 MCP tools (get_education_data, get_education_data_summary), ~1500 lines final codebase (after refactoring from current 500 lines)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - No constitution file exists yet for this project. This feature will establish the architectural foundation and best practices that should inform a future constitution.

**Note**: The constitution template at `.specify/memory/constitution.md` is currently a placeholder. After completing this technical debt remediation, we should create a project-specific constitution documenting:
- Core architectural principles (modularity, testability, observability)
- Testing requirements (TDD approach, coverage thresholds)
- Security standards (input validation, error handling)
- Performance expectations (caching strategy, response time SLAs)

**Phase 1 Re-check**: ✅ PASS - Design artifacts created (research.md, data-model.md, contracts/module-interfaces.md, quickstart.md). The proposed architecture follows industry best practices:
- ✅ **Modularity**: Clear separation of concerns (config, models, services, handlers, utils)
- ✅ **Testability**: All modules have defined interfaces enabling unit testing
- ✅ **Single Responsibility**: Each module has one cohesive purpose
- ✅ **Dependency Management**: Clean dependency graph (no circular dependencies)
- ✅ **Observability**: Structured logging with pino, request tracking
- ✅ **Security**: Defense-in-depth with validation, sanitization, error handling
- ✅ **Performance**: Caching strategy with TTL and LRU eviction

These principles should form the basis of a future project constitution.

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
├── index.ts                    # Entry point - server initialization and startup
├── server.ts                   # MCP server configuration and request handler wiring
├── config/
│   ├── constants.ts           # API URLs, cache TTLs, limits, timeouts
│   └── endpoints.ts           # Endpoint metadata (levels, sources, topics, years)
├── models/
│   ├── types.ts               # TypeScript interfaces and types
│   └── schemas.ts             # Validation schemas (Zod or similar)
├── services/
│   ├── api-client.ts          # Education Data API client with retry logic
│   ├── cache.ts               # LRU cache implementation
│   ├── validator.ts           # Input validation and sanitization
│   └── logger.ts              # Structured logging with context
├── handlers/
│   ├── tools.ts               # MCP tool request handlers
│   └── resources.ts           # MCP resource request handlers
└── utils/
    ├── errors.ts              # Custom error classes and error formatting
    └── retry.ts               # Exponential backoff retry logic

tests/
├── unit/
│   ├── services/
│   │   ├── validator.test.ts
│   │   ├── cache.test.ts
│   │   └── api-client.test.ts
│   ├── handlers/
│   │   ├── tools.test.ts
│   │   └── resources.test.ts
│   └── utils/
│       ├── errors.test.ts
│       └── retry.test.ts
├── integration/
│   ├── api-client.integration.test.ts
│   └── server.integration.test.ts
└── fixtures/
    ├── mock-responses.ts
    └── test-data.ts

build/                          # Compiled JavaScript output (gitignored)
```

**Structure Decision**: Single project structure selected. This is a standalone MCP server (not a web app or mobile app), so we use the standard single-project layout with clear separation of concerns:
- `src/config/` - Configuration and static data
- `src/models/` - Type definitions and validation schemas
- `src/services/` - Core business logic (API client, cache, validation, logging)
- `src/handlers/` - MCP protocol handlers (tools and resources)
- `src/utils/` - Cross-cutting utilities (errors, retry logic)
- `tests/` - Comprehensive test suite organized by test type

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**Status**: N/A - No constitution violations. This feature establishes architectural best practices rather than deviating from them.

## Planning Phase Complete

### Generated Artifacts

✅ **Phase 0: Research** (`research.md`)
- Resolved all NEEDS CLARIFICATION items from Technical Context
- Selected Vitest for testing framework
- Selected Zod for input validation
- Selected lru-cache for caching
- Selected pino for structured logging
- Documented error handling patterns, retry strategy, and modularization approach

✅ **Phase 1: Design** 
- **Data Model** (`data-model.md`): 10 core entities with validation rules and state transitions
- **Module Contracts** (`contracts/module-interfaces.md`): 8 clearly defined service and utility interfaces
- **Quickstart Guide** (`quickstart.md`): Developer onboarding and contribution workflow

✅ **Agent Context Update**
- Updated `CLAUDE.md` with technology decisions (TypeScript, Vitest, Zod, lru-cache, pino)
- Preserved existing Archon workflow rules
- Added project-specific technical context

### Architecture Summary

**Modular Structure**:
- 5 directories: `config/`, `models/`, `services/`, `handlers/`, `utils/`
- 14 source files (vs 1 monolithic file currently)
- Clear dependency graph: utils/models → services → handlers → server → index

**Technology Stack**:
- **Language**: TypeScript 5.3.3, Node.js (ES2022, ESM)
- **Framework**: MCP SDK 0.6.0
- **HTTP Client**: axios 1.8.4
- **Validation**: Zod (runtime type safety)
- **Caching**: lru-cache (LRU eviction + TTL)
- **Logging**: pino (structured JSON logs)
- **Testing**: Vitest (unit, integration, contract tests)
- **Quality**: ESLint + Prettier + TypeScript strict mode

**Key Design Decisions**:
1. **Strangler Fig Pattern**: Incremental refactoring in 4 phases to minimize risk
2. **Test-Driven Development**: All new features (validation, caching, retry) implemented test-first
3. **Dependency Injection**: Services injected into handlers for testability
4. **Defense in Depth**: Multiple layers of security (validation, sanitization, error handling)
5. **Observability First**: Structured logging, request tracking, cache metrics

### Success Metrics Alignment

| Success Criterion | Design Support |
|-------------------|----------------|
| SC-001: Modularity (zero changes outside target module) | ✅ Clear module boundaries with defined interfaces |
| SC-002: 100% input validation | ✅ Zod schemas for all inputs, sanitization functions |
| SC-003: Graceful error handling | ✅ Custom error hierarchy, retry logic, circuit breaker pattern |
| SC-004: <100ms cache hits | ✅ In-memory LRU cache with TTL, concurrent request deduplication |
| SC-005: 80% test coverage | ✅ Vitest with c8 coverage, 3-tier test pyramid (unit/integration/contract) |
| SC-006: 15-minute onboarding | ✅ Comprehensive quickstart guide with phase-by-phase workflow |
| SC-007: Clear error messages | ✅ Error formatting utilities, sanitized client-facing messages |
| SC-008: 100% quality gate pass | ✅ ESLint, Prettier, TypeScript strict mode in pre-commit hooks |
| SC-009: 100 concurrent requests | ✅ Promise coalescing, LRU cache, async/await throughout |
| SC-010: 50% faster diagnosis | ✅ Structured logging with context, request IDs, performance metrics |

### Next Steps

1. **Run `/speckit.tasks`** to generate dependency-ordered task breakdown
2. **Start with Phase 1** (Modularity): Extract types, constants, endpoints
3. **Follow TDD workflow** from Phase 2 onward
4. **Track progress** using Archon task management (per CLAUDE.md)
5. **Verify acceptance criteria** after each phase

### File Locations

- **Plan**: `/home/user/projects/edu_data_mcp_server/specs/001-i-want-to/plan.md` (this file)
- **Research**: `/home/user/projects/edu_data_mcp_server/specs/001-i-want-to/research.md`
- **Data Model**: `/home/user/projects/edu_data_mcp_server/specs/001-i-want-to/data-model.md`
- **Contracts**: `/home/user/projects/edu_data_mcp_server/specs/001-i-want-to/contracts/module-interfaces.md`
- **Quickstart**: `/home/user/projects/edu_data_mcp_server/specs/001-i-want-to/quickstart.md`
- **Branch**: `001-i-want-to`

**Status**: ✅ Planning complete. Ready for task generation and implementation.
