# Quickstart Guide: Contributing to Technical Debt Remediation

**Feature**: Technical Debt Remediation and Architectural Improvements
**Branch**: `001-i-want-to`
**Date**: 2025-10-07

## Overview

This guide helps developers get started with contributing to the technical debt remediation effort. Follow these steps to understand the architecture, set up your environment, and make your first contribution.

## Prerequisites

- Node.js 18+ installed
- npm 9+ installed
- Git configured
- VS Code (recommended) or your preferred editor
- Familiarity with TypeScript and MCP protocol basics

## Quick Start (5 minutes)

### 1. Clone and Setup

```bash
# If not already cloned
cd edu_data_mcp_server

# Checkout the feature branch
git checkout 001-i-want-to

# Install dependencies
npm install

# Build the project
npm run build

# Verify build works
npm run inspector
```

### 2. Understand Current State

**Current Architecture** (BEFORE refactoring):
- Single file: `src/index.ts` (~500 lines)
- No modularization
- No input validation
- No caching
- No tests
- Basic error handling (only HTTP error codes)

**Target Architecture** (AFTER refactoring):
- Modular structure (see `plan.md` for full directory tree)
- Separation of concerns (handlers, services, models, utils)
- Comprehensive validation with Zod
- LRU caching with TTL
- 80%+ test coverage
- Production-ready error handling and logging

### 3. Read the Documentation (15 minutes)

Required reading (in order):
1. `spec.md` - Feature requirements and success criteria
2. `plan.md` - Implementation plan and technical context
3. `research.md` - Technology decisions and best practices
4. `data-model.md` - Core entities and validation rules
5. `contracts/module-interfaces.md` - Module contracts and integration patterns
6. This file - Development workflow

## Development Workflow

### Phase-Based Implementation

This refactoring follows a **phased approach** to minimize risk:

#### Phase 1: Foundation (Modularization)
**Goal**: Extract code into modules without changing behavior

Tasks:
1. Create directory structure (`src/config/`, `src/models/`, etc.)
2. Extract types to `src/models/types.ts`
3. Extract constants to `src/config/constants.ts`
4. Extract endpoint metadata to `src/config/endpoints.ts`
5. Verify: `npm run build` succeeds, `npm run inspector` still works

**Success Criteria**: Code compiles, inspector works, no new functionality

#### Phase 2: Services Layer
**Goal**: Extract business logic into testable services

Tasks:
1. Create `src/services/logger.ts` (upgrade from console.log)
2. Create `src/services/api-client.ts` (extract HTTP logic from index.ts)
3. Create `src/services/cache.ts` (new LRU cache implementation)
4. Create `src/services/validator.ts` (new Zod validation)
5. Update `src/index.ts` to use new services

**Success Criteria**: All services have unit tests, inspector still works

#### Phase 3: Handlers Layer
**Goal**: Separate MCP protocol handling from business logic

Tasks:
1. Create `src/handlers/tools.ts` (extract tool handlers)
2. Create `src/handlers/resources.ts` (extract resource handlers)
3. Create `src/server.ts` (MCP server config and wiring)
4. Slim down `src/index.ts` to just initialization

**Success Criteria**: Handlers have integration tests, clear dependency injection

#### Phase 4: Enhanced Features (TDD)
**Goal**: Add missing features with test-first approach

Tasks:
1. Input validation (write tests first, then implement)
2. Caching (write tests first, then implement)
3. Retry logic (write tests first, then implement)
4. Enhanced error handling (write tests first, then implement)

**Success Criteria**: 80%+ test coverage, all acceptance scenarios pass

### Test-Driven Development (TDD) Workflow

For Phase 4 and beyond, follow strict TDD:

```bash
# 1. Write failing test
cat > tests/unit/services/validator.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { Validator } from '../../../src/services/validator';

describe('Validator', () => {
  it('should reject limit > 10000', () => {
    const validator = new Validator();
    expect(() => {
      validator.validateEducationDataRequest({ limit: 50000 });
    }).toThrow('limit must not exceed 10000');
  });
});
EOF

# 2. Run test (should fail)
npm test -- validator.test.ts

# 3. Implement just enough to pass
# Edit src/services/validator.ts

# 4. Run test again (should pass)
npm test -- validator.test.ts

# 5. Refactor if needed
# 6. Repeat
```

## Running Tests

### Install Test Dependencies (First Time)

```bash
npm install --save-dev vitest @vitest/ui @types/node
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- validator.test.ts

# Run tests in watch mode (TDD)
npm test -- --watch

# Run tests with UI (browser-based)
npm test -- --ui

# Run with coverage
npm test -- --coverage
```

### Coverage Thresholds

Configure in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
      exclude: [
        'src/config/**',
        '**/*.test.ts',
        'build/**'
      ]
    }
  }
});
```

## Code Quality

### Linting

```bash
# Install ESLint (first time)
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Run linter
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Formatting

```bash
# Install Prettier (first time)
npm install --save-dev prettier

# Check formatting
npm run format:check

# Auto-format
npm run format
```

### Type Checking

```bash
# Type check without building
npx tsc --noEmit
```

## Common Tasks

### Adding a New Validation Rule

1. **Write test** in `tests/unit/services/validator.test.ts`:
   ```typescript
   it('should reject malicious SQL injection in filter', () => {
     expect(() => {
       validator.validateEducationDataRequest({
         level: 'schools',
         source: 'ccd',
         topic: 'enrollment',
         filters: { year: "'; DROP TABLE students--" }
       });
     }).toThrow('Invalid filter value');
   });
   ```

2. **Update schema** in `src/models/schemas.ts`:
   ```typescript
   const filterValueSchema = z.union([
     z.string().regex(/^[a-zA-Z0-9\s,.-]+$/),  // Whitelist safe characters
     z.number(),
     z.array(z.string().regex(/^[a-zA-Z0-9\s,.-]+$/)),
     z.array(z.number())
   ]);
   ```

3. **Run test** to verify it passes

### Adding a New Service

1. **Define interface** in `contracts/module-interfaces.md`
2. **Create implementation** in `src/services/new-service.ts`
3. **Write unit tests** in `tests/unit/services/new-service.test.ts`
4. **Wire to handlers** in `src/server.ts` via dependency injection
5. **Document** in this quickstart guide

### Debugging

#### Debug MCP Server

```bash
# Run with debug logging
DEBUG=* npm start

# Run with inspector for interactive testing
npm run inspector
```

#### Debug Tests

```bash
# Run single test with debug output
npm test -- validator.test.ts --reporter=verbose

# Use VS Code debugger
# Add breakpoint in test file, press F5, select "Vitest" configuration
```

#### Check Cache Behavior

```typescript
// Add temporary logging in handler
logger.debug('Cache stats', this.cache.getStats());

// After some requests, check hit rate
// Should be >70% for repeated queries
```

## Acceptance Criteria Checklist

Before marking a phase complete, verify:

### Phase 1 (Modularity)
- [ ] Code organized into `config/`, `models/`, `services/`, `handlers/`, `utils/`
- [ ] Each module has single responsibility
- [ ] `npm run build` succeeds
- [ ] `npm run inspector` works (no behavior change)
- [ ] Can locate and modify specific functionality in one file

### Phase 2 (Security)
- [ ] All inputs validated with Zod schemas
- [ ] String inputs sanitized (no control chars, max length)
- [ ] Malicious inputs rejected with clear error messages
- [ ] No stack traces exposed to clients
- [ ] 100% of validation test cases pass

### Phase 3 (Error Handling)
- [ ] All error types handled: validation, network, API, unexpected
- [ ] Retry logic for transient failures (429, 503, timeout)
- [ ] Structured logging with context (request ID, params, duration)
- [ ] Health check endpoint available
- [ ] Errors logged with timestamp and context

### Phase 4 (Performance)
- [ ] Cache implemented with LRU + TTL
- [ ] Cache hit < 100ms response time
- [ ] Cache eviction prevents memory growth
- [ ] Concurrent identical requests deduplicated
- [ ] 90%+ improvement for cached vs uncached requests

### Phase 5 (Testing)
- [ ] 80%+ overall test coverage
- [ ] 90%+ coverage for critical paths (validation, API, errors)
- [ ] Unit tests for all services
- [ ] Integration tests for end-to-end flows
- [ ] All tests run in <30 seconds
- [ ] CI pipeline configured (if applicable)

## Troubleshooting

### Build Fails After Refactoring

```bash
# Check for circular dependencies
npx madge --circular src/

# Check TypeScript errors
npx tsc --noEmit

# Clear build cache
rm -rf build/
npm run build
```

### Tests Fail After Refactoring

```bash
# Check if mocks are outdated
# Update mocks to match new interfaces

# Check if integration tests need real API
# Use mock server or feature flags for testing
```

### Inspector Doesn't Show New Features

```bash
# Rebuild
npm run build

# Check if handler is registered in server.ts
# Verify MCP server config includes new tools
```

## Resources

### Internal Documentation
- [Feature Spec](./spec.md) - Requirements and success criteria
- [Implementation Plan](./plan.md) - Architecture and phases
- [Research](./research.md) - Technology decisions
- [Data Model](./data-model.md) - Entity definitions
- [Module Contracts](./contracts/module-interfaces.md) - Interface definitions

### External Resources
- [MCP Documentation](https://modelcontextprotocol.io)
- [Vitest Guide](https://vitest.dev/guide/)
- [Zod Documentation](https://zod.dev)
- [Pino Logger](https://getpino.io)
- [lru-cache](https://github.com/isaacs/node-lru-cache)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Getting Help
- Check existing code comments
- Review test files for usage examples
- Ask in project discussions (if applicable)
- Refer to research.md for "why" behind technology choices

## Next Steps

1. ✅ Read this quickstart guide
2. ✅ Read feature specification and plan
3. ⏭️ Check current project status (which phase is in progress?)
4. ⏭️ Pick a task from `tasks.md` (when generated by `/speckit.tasks`)
5. ⏭️ Write tests first (TDD)
6. ⏭️ Implement feature
7. ⏭️ Verify acceptance criteria
8. ⏭️ Submit PR (if using git workflow)

Happy coding! 🚀
