# Project Research Summary

**Project:** Secret Santa Wishlist Feature (v1.1)
**Domain:** Cloudflare Workers + Durable Objects (Serverless Application)
**Researched:** 2026-01-19
**Confidence:** HIGH

## Executive Summary

This is a serverless web application enhancement — adding wishlist functionality to an existing Secret Santa platform built on Cloudflare Workers and Durable Objects. Research shows this type of feature is best implemented using the existing Durable Object storage pattern with per-guest key-value storage, avoiding unnecessary complexity like separate databases or authentication systems.

The recommended approach extends the current architecture: store wishlists as party-scoped data within each Party Durable Object using the asynchronous KV API (`ctx.storage.put/get`). This maintains strong consistency, leverages existing security patterns (guest ID in URL), and keeps data co-located with party state. Wishlists should be freeform text (max 500 characters), accessed via three RESTful endpoints following existing API conventions. No new dependencies or infrastructure are required — the feature uses the existing TypeScript, Vitest, and Wrangler setup.

Key risks are well-understood and mitigable. Race conditions are prevented by Durable Object's input/output gates (automatic blocking of concurrent events). Input validation failures are avoided by enforcing the 500-character limit at both client and server boundaries. Durable Object overload is unlikely given the small request volume (~50 guests × few operations), but is mitigated by keeping operations lightweight and avoiding external I/O within DO methods. The most significant gap is lack of user validation — feature prioritization assumes standard Secret Santa patterns without feedback data from v1.0 users.

## Key Findings

### Recommended Stack

**No new dependencies required** — the wishlist feature extends the existing Cloudflare Workers + Durable Objects platform. The current stack (TypeScript ^5.x, Vitest ^3.2.0, Wrangler ^4.0.0, SQLite-backed Durable Objects) is optimal for this use case.

**Core technologies:**
- **Durable Object storage (asynchronous KV API)** — Party-scoped wishlist storage with zero-latency access, automatic point-in-time recovery, and strong consistency guarantees
- **TypeScript ^5.x** — Type safety for wishlist data structures and request/response interfaces
- **Vitest ^3.2.0 with @cloudflare/vitest-pool-workers** — Durable Object testing with environment mocking (already configured)

**Storage approach:** Per-guest keys (`wishlist:${guestId}`) in Party DO using `ctx.storage.put/get`. This is simpler than SQL tables for flat string data and provides atomic writes with write coalescing. The `wishlist:` prefix keeps data organized and allows using `list({ prefix: 'wishlist:' })` for debugging if needed.

### Expected Features

**Must have (table stakes) — what users expect in a Secret Santa wishlist:**
- **View own wishlist** — Users need to see what they've listed to avoid duplicates
- **Edit own wishlist** — Users will want to update their wishlist as they think of items
- **View recipient's wishlist** — Core Secret Santa value — knowing what your recipient wants
- **Character limit display** — Users need to know constraints before typing (X/500 chars)
- **Empty state handling** — Users need to know wishlist is empty vs loading

**Should have (competitive) — deferred to v1.2+:**
- **Wishlist last-modified timestamp** — Show when recipient last updated their wishlist
- **Wishlist analytics for organizer** — Let organizer see how many guests have added wishlists (without revealing wishlists or assignments)
- **Character count pre-population** — Avoid extra fetch by including count in assignment response

**Defer (v2+) — not essential for launch:**
- **Structured items with prices** — Richer wishlist data, but adds complexity (HIGH effort)
- **Wishlist item images** — Adds storage complexity, out of scope for v1.1
- **Wishlist sharing via link** — Out of scope, not part of Secret Santa pattern
- **Real-time wishlist updates** — Requires polling/WebSocket, overkill for v1.1
- **Wishlist history** — Requires versioning, not user-requested yet

**Anti-features to avoid:**
- **Multiple wishlist sets** — Breaks simple one-wishlist-per-guest model; freeform text lets users organize however they want
- **Wishlist item claiming** — Undermines Secret Santa surprise, adds coordination complexity
- **Rich text/Markdown formatting** — Adds parsing complexity and XSS risks; plain text is universal
- **Public wishlist directory** — Privacy concern; only your assigned recipient should see your wishlist

### Architecture Approach

Wishlist functionality extends the existing three-layer architecture without requiring new components. The **Client Layer** (`guest.html`/`guest.js`) fetches and displays wishlists using vanilla JavaScript with the fetch API. The **Worker Router Layer** (`index.ts`) routes wishlist requests to the appropriate Party Durable Object via KV lookup, following existing RESTful patterns. The **Durable Object Layer** (`party.ts`) stores wishlists as per-guest keys in the same DO that contains party data, assignments, and guest links.

**Major components:**
1. **Party Durable Object** — Stores party data + wishlists, enforces 500 char limit, validates guest membership, provides `getWishlist()` and `setWishlist()` methods
2. **Worker Router** — Routes `PUT /api/guest/:id/wishlist` and `GET /api/guest/:id/wishlist`, validates guest IDs via KV lookup, proxies to DO stub
3. **KV Namespace** — Fast guest→party mapping (guestId → partyId + guestName) — existing pattern, no changes needed
4. **Client (guest.js)** — Fetches wishlist on load, handles form submission, displays recipient's wishlist

**Key architectural patterns:**
- **Per-guest keys over single object** — Smaller payloads, targeted updates; matches existing KV pattern (`guest:${guestId}`)
- **Security via guest ID ownership** — Anyone with guest link can edit that wishlist (simple for v1.1); only view recipient's wishlist via assignment
- **No separate wishlist DO** — Wishlists have no lifecycle independent of party; storing in Party DO avoids latency and consistency issues

### Critical Pitfalls

**Top 5 pitfalls from research with prevention strategies:**

1. **Race conditions in wishlist updates** — Leverage Durable Object input gates (automatic blocking of concurrent events during storage operations). Never rely on in-memory state; always persist to storage before confirming success.

2. **Input validation failures** — Enforce 500 character limit at API boundary, validate type (string only), sanitize control characters, normalize Unicode, and provide structured error handling (never crash on bad input).

3. **Overloading single Durable Object** — Keep DO methods lightweight (<5ms ideal), avoid external I/O (fetch, KV) during request handling. Unlikely to be an issue given small request volume, but monitor for "Durable Object is overloaded" errors.

4. **Incorrect authorization checks** — Verify guest membership in party, enforce "view own + view recipient's" access pattern, validate ownership for edits. Prevents privacy violations and data tampering.

5. **Missing migration strategy** — Use optional chaining for missing wishlists (`|| ""`), version data schema, use `blockConcurrencyWhile` for safe migrations. Ensures existing parties handle missing wishlist data gracefully.

## Implications for Roadmap

Based on combined research, the wishlist feature should be delivered in 4 phases following dependency order and architectural patterns.

### Phase 1: Durable Object Storage Layer
**Rationale:** Foundation layer — all other components depend on storage operations. Changes to core DO logic must happen before API or UI work. This phase validates the per-guest key storage pattern and ensures no breaking changes to existing party data.

**Delivers:** Working wishlist storage in Party DO with validation and test coverage
**Addresses:**
- View own wishlist (P1)
- Edit own wishlist (P1)
- Character limit enforcement (P1)

**Avoids:**
- Pitfall 1 (race conditions) — Uses DO input gates automatically
- Pitfall 2 (input validation failures) — Validates type, length, characters in DO methods
- Pitfall 6 (missing migration strategy) — Uses optional chaining for missing data

**Implementation:**
- Add `WishlistData` interface to `types.ts`
- Add `setWishlist()` and `getWishlist()` methods to `Party` class
- Add validation (500 char limit, guest exists in party)
- Write unit tests for DO methods

### Phase 2: API Endpoint Layer
**Rationale:** Exposes DO functionality via HTTP following existing RESTful patterns. Can test with curl before building UI. Depends on Phase 1 storage layer. This phase validates the security model (guest ID ownership) before UI is built.

**Delivers:** Working wishlist API endpoints with CORS, validation, and error handling
**Uses:** TypeScript types, KV lookup pattern, DO stub communication
**Implements:** Worker router pattern (existing component extension)

**Addresses:**
- Same P1 features as Phase 1 (now accessible via HTTP)

**Avoids:**
- Pitfall 4 (incorrect authorization) — Enforces access control in API layer
- Pitfall 5 (inefficient storage) — Single storage operation per request

**Implementation:**
- Add `PUT /api/guest/:guestId/wishlist` endpoint in `index.ts`
- Add `GET /api/guest/:guestId/wishlist` endpoint in `index.ts`
- Wire up KV lookup → DO stub → method call
- Write integration tests for API endpoints

### Phase 3: Client UI Layer
**Rationale:** Thin client layer that consumes the API. Depends on working endpoints from Phase 2. User-facing value is delivered here. This phase can be iterated quickly once API is stable.

**Delivers:** Working wishlist form and display in guest.html
**Uses:** Vanilla JS fetch API, existing UI patterns
**Implements:** Client layer (existing component extension)

**Addresses:**
- View own wishlist (P1)
- Edit own wishlist (P1)
- Character limit display (P1)
- Empty state handling (P1)

**Implementation:**
- Add wishlist form section to `guest.html` (textarea + character counter)
- Add `loadWishlist()` and `saveWishlist()` functions to `guest.js`
- Add styles for form elements to `style.css`
- Test end-to-end with real DO storage

### Phase 4: Recipient Wishlist Integration
**Rationale:** Builds on Phases 1-3 to deliver the "view recipient's wishlist" feature. Adds value after basic wishlist works. Requires extending the existing assignment response, so kept separate to avoid scope creep in earlier phases.

**Delivers:** Recipient's wishlist visible in assignment view
**Uses:** Existing assignment endpoint, guest ID from assignment response
**Implements:** Client-side fetch of recipient wishlist using `recipientGuestId`

**Addresses:**
- View recipient's wishlist (P1)

**Implementation:**
- Modify `GET /api/guest/:guestId/assignment` to include `recipientGuestId`
- Add "View Recipient's Wishlist" section in UI
- Client fetches recipient wishlist using `recipientGuestId`
- Test end-to-end: guest views assignment → sees recipient's wishlist

### Phase Ordering Rationale

The 4-phase structure follows architectural dependencies:
- **Storage → API → UI** order ensures each layer is validated before building dependent layers
- **Recipient viewing deferred to Phase 4** because it extends the existing assignment endpoint; keeping it separate reduces scope in earlier phases
- **Grouping by component** (DO → API → Client) aligns with testing strategy and minimizes integration complexity
- **Phases avoid critical pitfalls** by design: Phase 1 validates storage pattern before scale, Phase 2 implements authorization before exposure

**Feature grouping rationale:**
- **Phases 1-3 deliver "own wishlist" features** (view, edit, character limit) — core P1 functionality
- **Phase 4 delivers "recipient wishlist" feature** — P1 but dependent on assignment viewing working correctly
- **P2 features deferred** to future releases to validate core functionality first

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (Recipient Wishlist Integration)** — Moderate flag: Need to verify that extending assignment response doesn't break existing client code. Well-documented pattern (extend API response), but requires careful backward compatibility check during planning.

**Phases with standard patterns (skip /gsd-research-phase):**
- **Phase 1 (Storage Layer)** — Well-documented: Durable Object storage API is thoroughly documented. Pattern matches existing `assignments` storage.
- **Phase 2 (API Layer)** — Well-documented: RESTful endpoint pattern matches existing `/api/guest/:id/assignment`. Standard fetch/validate/proxy pattern.
- **Phase 3 (Client Layer)** — Well-documented: Vanilla JS fetch API, HTML forms, character counters are standard web development.

**No research phases required** — All patterns are established in the existing codebase. The `/gsd-research-phase` command is not needed for any phase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified with official Cloudflare documentation. Existing `wrangler.toml` confirms SQLite-backed DOs. No new dependencies needed. |
| Features | MEDIUM | Table stakes features based on standard Secret Santa patterns, but lacking user validation data (v1.0 recently shipped). Prioritization assumes typical gift exchange expectations without feedback from actual users. |
| Architecture | HIGH | All findings verified with official Cloudflare documentation. Existing codebase confirms Party DO pattern, KV guest ID mapping, and RESTful API structure. Recommended approach matches established patterns. |
| Pitfalls | HIGH | Durable Object behavior and race conditions verified with official docs and blog posts. Input validation and security based on OWASP guidelines (established best practices). |

**Overall confidence:** HIGH

### Gaps to Address

**Feature validation gap (low risk):**
- **Gap:** User feedback not yet available from v1.0. Feature prioritization based on assumed Secret Santa patterns rather than actual user requests.
- **How to handle:** Monitor v1.0 user feedback for wishlist-related requests. P2 features (timestamps, analytics) can be re-prioritized if users request different enhancements.

**Authorization edge case (low risk):**
- **Gap:** Research assumes "anyone with guest link can edit that wishlist" security model, but doesn't verify if this aligns with v1.0 security expectations.
- **How to handle:** During Phase 2 planning, verify v1.0 security model by reviewing existing guest link behavior. Ensure wishlist editing matches the same pattern (simple URL-based access, no additional auth).

**Recipient wishlist access pattern (medium risk):**
- **Gap:** Research recommends "view recipient's wishlist" but doesn't verify if assignment response should include recipient wishlist directly or if client should fetch separately.
- **How to handle:** During Phase 4 planning, prototype both approaches: (1) extend assignment response, (2) client fetches separately. Evaluate based on performance (extra request vs payload size). Recommendation is client-side fetch to keep assignment response lightweight.

## Sources

### Primary (HIGH confidence)

**Official Cloudflare Documentation:**
- [Durable Objects Storage API (SQLite-backed)](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/) — Storage operations, KV API usage, input/output gates
- [Durable Objects State API](https://developers.cloudflare.com/durable-objects/api/state/) — DurableObjectState interface, storage guarantees
- [Cloudflare Workers Durable Objects Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) — Billing for storage operations

**Cloudflare Blog Posts:**
- [Zero-latency SQLite storage in every Durable Object](https://blog.cloudflare.com/sqlite-in-durable-objects/) — Architecture benefits, synchronous vs async API, output gates
- [Durable Objects: Easy, Fast, Correct - Choose Three](https://blog.cloudflare.com/durable-objects-easy-fast-correct-choose-three/) — Storage patterns, transaction guarantees, race condition prevention

**Existing Codebase:**
- `src/types.ts` — Current PartyData interface and type definitions
- `src/party.ts` — Party Durable Object implementation, existing storage patterns
- `src/index.ts` — Current API routing structure
- `public/guest.html` — Existing UI patterns and form structure
- `wrangler.toml` — SQLite-backed DO configuration confirmed

### Secondary (MEDIUM confidence)

**Project Documentation:**
- `.planning/milestones/v1.0-REQUIREMENTS.md` — Existing feature set and security model
- `.planning/PROJECT.md` — v1.1 goals and wishlist feature requirements

**Security Best Practices:**
- OWASP Serverless Top 10 — General serverless security patterns (not Cloudflare-specific)
- Web security best practices — Input validation, XSS prevention (standard patterns)

### Tertiary (LOW confidence)

**Domain Knowledge:**
- General Secret Santa / gift exchange platform patterns (Elfster, DrawNames) — Competitor analysis based on general domain knowledge rather than current feature lists
- Typical user expectations for wishlist features — Based on common patterns, not user research or feedback data

---
*Research completed: 2026-01-19*
*Ready for roadmap: yes*
