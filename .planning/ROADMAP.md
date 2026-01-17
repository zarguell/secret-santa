# Roadmap: Secret Santa Application

## Overview

Transform the current Secret Santa application from a functional but untested system with workarounds into a robust, tested, and properly structured serverless application. The journey establishes comprehensive test coverage, fixes the static file serving architecture, and creates a reliable development workflow for iterative improvements.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Testing Foundation** - Set up Vitest and write comprehensive tests
- [ ] **Phase 2: Static File Serving** - Fix HTML serving to remove inline workaround
- [ ] **Phase 3: Development Workflow** - Establish dev branch deployment workflow

## Phase Details

### Phase 1: Testing Foundation
**Goal**: Establish comprehensive test coverage for all code paths
**Depends on**: Nothing (first phase)
**Research**: Likely (Vitest + Cloudflare Workers integration, Durable Objects testing patterns)
**Research topics**: Vitest configuration for Workers, testing utilities, DO mocking/stubbing approaches
**Plans**: 3 plans

Plans:
- [ ] 01-01: Set up Vitest with Cloudflare Workers compatibility
- [ ] 01-02: Write tests for utility functions and API endpoints
- [ ] 01-03: Write tests for Durable Objects behavior

### Phase 2: Static File Serving
**Goal**: Implement proper static HTML serving, removing inline workaround
**Depends on**: Phase 1 (tests validate the fix works)
**Research**: Unlikely (internal Cloudflare Workers configuration)
**Plans**: 1 plan

Plans:
- [ ] 02-01: Implement static file serving for guest pages

### Phase 3: Development Workflow
**Goal**: Establish and test single dev branch workflow for iterative development
**Depends on**: Phase 2 (core functionality stable)
**Research**: Unlikely (standard git workflow and deployment patterns)
**Plans**: 1 plan

Plans:
- [ ] 03-01: Implement and validate dev branch deployment workflow

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Testing Foundation | 0/3 | Not started | - |
| 2. Static File Serving | 0/1 | Not started | - |
| 3. Development Workflow | 0/1 | Not started | - |
