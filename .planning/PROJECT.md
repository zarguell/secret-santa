# Secret Santa Application

## What This Is

A serverless Secret Santa application built on Cloudflare Workers. Party organizers create events and get shareable links for guests to view their gift recipient assignments. Features comprehensive test coverage, proper static file serving, and reliable edge deployment.

## Current State

**Version:** v1.0 MVP (shipped 2026-01-19)
**Architecture:** Cloudflare Workers + Durable Objects + KV
**Test Coverage:** 31 tests passing with Vitest
**Lines of Code:** 531 TypeScript

The application has been transformed from functional but untested to a robust, tested serverless application with proper static file serving and a reliable development workflow.

## Core Value

Every guest must be able to reliably view their Secret Santa assignment from their unique link.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Party creation — v1.0
- ✓ Guest assignment generation (no self-assignment) — v1.0
- ✓ Guest ID to party ID mapping via KV — v1.0
- ✓ Durable Object stateful party storage — v1.0
- ✓ Full test coverage (utils, API, Durable Objects) using Vitest — v1.0
- ✓ Static HTML serving for guest pages (inline workaround removed) — v1.0
- ✓ Single dev branch workflow for iterative development and deployment testing — v1.0

### Active

<!-- Current scope. Building toward these. -->

*No active requirements. Run `/gsd-new-milestone` to define v1.1 requirements.*

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Email notifications — v1 focuses on link-based access only
- Wish lists and gift tracking — out of scope for initial goals
- Party editing or guest management — out of scope for initial goals

## Context

**Shipped Implementation:**
- Single Cloudflare Worker handling all HTTP requests
- Durable Objects for stateful party storage
- KV namespace for fast guest ID lookups
- Static guest.html page served properly (inline workaround removed)
- 31 passing tests with Vitest and @cloudflare/vitest-pool-workers
- Dev branch deployment workflow for iterative development

**Known Issues:**
None — all v1.0 issues resolved

## Constraints

- **Platform**: Must remain on Cloudflare Workers — existing infrastructure and edge deployment
- **Workflow**: Single dev branch for iterative work before merging to main

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vitest for testing | Fast, modern, Cloudflare Workers compatible | ✓ Implemented with @cloudflare/vitest-pool-workers |
| Single dev branch | Simplify workflow while iterating on static file fix and tests | ✓ Implemented |
| Static HTML serving priority over feature additions | Core value is reliable guest assignment viewing, inline HTML is workaround | ✓ Implemented |

---
*Last updated: 2026-01-19 after v1.0 milestone*
