# Secret Santa Application

## What This Is

A serverless Secret Santa application built on Cloudflare Workers. Party organizers create events and get shareable links for guests to view their gift recipient assignments. Currently uses inline HTML as a workaround for static file serving issues.

## Core Value

Every guest must be able to reliably view their Secret Santa assignment from their unique link.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Party creation — existing
- ✓ Guest assignment generation (no self-assignment) — existing
- ✓ Guest ID to party ID mapping via KV — existing
- ✓ Durable Object stateful party storage — existing

### Active

<!-- Current scope. Building toward these. -->

- [x] Full test coverage (utils, API, Durable Objects) using Vitest — 31 tests passing
- [ ] Fix static HTML serving for guest pages (remove inline HTML workaround)
- [ ] Single dev branch workflow for iterative development and deployment testing

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Email notifications — v1 focuses on link-based access only
- Wish lists and gift tracking — out of scope for initial goals
- Party editing or guest management — out of scope for initial goals

## Context

**Existing Implementation:**
- Single Cloudflare Worker handling all HTTP requests
- Durable Objects for stateful party storage
- KV namespace for fast guest ID lookups
- Guest assignment viewing uses inline HTML workaround (src/index.ts:181) due to static file serving issues

**Known Issues:**
- Static guest.html page not being served properly from Cloudflare Workers
- No test coverage currently exists
- All code paths need validation

## Constraints

- **Platform**: Must remain on Cloudflare Workers — existing infrastructure and edge deployment
- **Workflow**: Single dev branch for iterative work before merging to main

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vitest for testing | Fast, modern, Cloudflare Workers compatible | ✓ Implemented with @cloudflare/vitest-pool-workers |
| Single dev branch | Simplify workflow while iterating on static file fix and tests | — Pending |
| Static HTML serving priority over feature additions | Core value is reliable guest assignment viewing, inline HTML is workaround | — Pending |

---
*Last updated: 2026-01-17 after initialization*
