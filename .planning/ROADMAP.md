# Roadmap: Secret Santa v1.1 Wishlist Feature

**Milestone:** v1.1 Wishlist Feature
**Created:** 2026-01-19
**Phases:** 4 (Storage → API → UI → Recipient Integration)
**Depth:** Quick
**Plans:** 4 total (04-01, 05-01, 06-01, 07-01)

## Overview

This roadmap delivers wishlist functionality for the Secret Santa application, enabling guests to create and manage wishlists (max 500 characters) and view their assigned recipient's wishlist. The feature extends the existing Cloudflare Workers + Durable Objects architecture without new infrastructure, following the established three-layer pattern (Storage → API → UI).

Phases follow architectural dependencies: storage foundation first, then API exposure, then user interface, and finally recipient wishlist integration. Each phase delivers complete, testable functionality before proceeding to the next.

## Phases

### Phase 4 - Durable Object Storage Layer

**Status:** ✓ Complete (2026-01-20)

**Goal:** Party Durable Objects can store and retrieve per-guest wishlists with validation.

**Dependencies:** None (extends existing Party DO)

**Requirements:**
- STOR-01: Party Durable Object stores wishlists using `wishlists: Record<string, string>` field
- STOR-02: System uses per-guest storage key pattern `wishlist:{guestId}` for individual wishlists
- STOR-03: System enforces 500 character limit on wishlist text
- STOR-04: System handles empty wishlist state (no wishlist set)
- TEST-01: Unit tests cover wishlist storage and retrieval in Party Durable Object

**Success Criteria:**
1. Party Durable Object stores wishlist text for a guest ID and retrieves it correctly
2. System rejects wishlist updates exceeding 500 characters with clear error
3. System returns empty string when no wishlist exists for a guest (not null/undefined)
4. Unit tests verify storage/retrieval, validation, and empty state handling

**Plans:** 1 plan in 1 wave

**Plan List:**
- [x] 04-01-PLAN.md — Add wishlist types, DO methods (setWishlist/getWishlist), and comprehensive unit tests

**Deliverables:**
- `setWishlist(guestId, text)` and `getWishlist(guestId)` methods in Party class
- Validation logic (500 char limit, guest exists in party)
- Unit tests for all DO wishlist methods (10 test cases)

---

### Phase 5 - API Endpoint Layer

**Status:** ✓ Complete (2026-01-20)

**Goal:** HTTP API exposes wishlist functionality with validation and security.

**Dependencies:** Phase 4 (storage layer)

**Requirements:**
- API-01: PUT /api/guest/:guestId/wishlist updates guest's wishlist with validation
- API-02: GET /api/guest/:guestId/wishlist returns guest's current wishlist or empty string
- API-03: GET /api/guest/:guestId/assignment response includes recipientWishlist field
- API-04: API validates input (sanitizes, enforces 500 char limit)
- TEST-02: Integration tests cover wishlist API endpoints

**Success Criteria:**
1. Client can PUT wishlist text and receive 200 OK on success
2. Client can GET wishlist text and receive current content or empty string
3. API returns 400 Bad Request for invalid input (non-string, exceeds 500 chars)
4. API validates guest ID exists in party before processing request
5. Integration tests verify endpoints handle valid and invalid requests

**Plans:** 1 plan in 1 wave

**Plan List:**
- [x] 05-01-PLAN.md — Implement PUT/GET /api/guest/:guestId/wishlist endpoints, extend assignment response, add integration tests

**Deliverables:**
- `PUT /api/guest/:guestId/wishlist` endpoint in `index.ts`
- `GET /api/guest/:guestId/wishlist` endpoint in `index.ts`
- KV lookup → DO stub → method call wiring
- Input validation and error handling
- Integration tests for all endpoints

---

### Phase 6 - Client UI Layer

**Status:** ◆ In Progress (Gap Closure - 2 gaps found)

**Goal:** Guest page displays wishlist form with real-time character counter and load/save functionality.

**Dependencies:** Phase 5 (API endpoints)

**Requirements:**
- UI-01: Guest page displays "My Wishlist" section with textarea form
- UI-02: Character counter displays current length / 500 as user types
- UI-03: Guest page loads and displays guest's current wishlist on page load

**Success Criteria:**
1. Guest sees "My Wishlist" section with textarea and character counter when loading their link
2. Character counter updates in real-time as user types (X/500)
3. Page loads and displays user's current wishlist text on initialization
4. Save button sends PUT request to API and shows success/error feedback
5. UI handles empty wishlist state (no error, displays empty textarea)

**Plans:** 2 plans (1 complete, 1 gap closure)

**Plan List:**
- [x] 06-01-PLAN.md — Add wishlist UI to guest.html, load/save functions to guest.js, and CSS styles to style.css
- [ ] 06-02-PLAN.md — Fix API integration mismatches (send JSON body, parse JSON response)

**Deliverables:**
- Wishlist form section in `guest.html` (textarea + character counter + save button)
- `loadWishlist()`, `saveWishlist()`, and `updateCounter()` functions in `guest.js`
- Character counter event listener with color warning
- Error handling and user feedback (3-second auto-clear)
- CSS styles for form elements matching existing card patterns
- JSON request/response format matching backend API contract

---

### Phase 7 - Recipient Wishlist Integration

**Goal:** Guests can view their assigned recipient's wishlist on the assignment page.

**Dependencies:** Phase 6 (client UI layer)

**Requirements:**
- UI-04: Assignment view displays "Recipient's Wishlist" section
- UI-05: UI handles empty wishlist state (no wishlist set message)

**Success Criteria:**
1. Assignment page includes "Recipient's Wishlist" section below assignment details
2. Section displays recipient's wishlist text if set
3. Section shows "No wishlist set" message if recipient hasn't created one
4. Client fetches recipient wishlist using recipientGuestId from assignment response
5. End-to-end test verifies: guest views assignment → sees recipient's wishlist (or empty state)

**Deliverables:**
- Modify `GET /api/guest/:guestId/assignment` to include `recipientGuestId` in response
- Add "Recipient's Wishlist" section in `guest.html`
- Client-side fetch of recipient wishlist using `recipientGuestId`
- Empty state handling and messaging
- End-to-end test

---

## Progress

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 4 | Durable Object Storage Layer | Complete | 100% |
| 5 | API Endpoint Layer | Complete | 100% |
| 6 | Client UI Layer | Complete | 100% |
| 7 | Recipient Wishlist Integration | Not Started | 0% |

**Overall Milestone Progress:** 75% (3/4 phases complete)

## Notes

**Starting phase number:** 4 (continuing from v1.0 milestone)

**Depth calibration:** "Quick" depth applied — 4 phases follow natural architectural boundaries (Storage → API → UI → Recipient). No artificial compression needed as phases are already minimal and coherent.

**Research alignment:** All phases align with research recommendations from `research/SUMMARY.md`. No research phases needed — all patterns are established in existing codebase.

**Testing strategy:** Tests are embedded within phases (unit tests in Phase 4, integration tests in Phase 5, edge case tests in Phase 6) to ensure each layer is validated before building dependent layers.

**Key architectural decisions:**
- Per-guest keys (`wishlist:${guestId}`) in Party DO — simpler than SQL for flat string data
- Security via guest ID ownership — anyone with link can edit (matches v1.0 pattern)
- Client-side fetch for recipient wishlist — keeps assignment response lightweight

**Avoided pitfalls:**
- Race conditions: Durable Object input gates handle automatically
- Input validation failures: Enforced at API boundary
- DO overload: Lightweight operations, no external I/O
- Authorization: Guest membership verified in party
- Migration: Optional chaining for missing data

---
*Roadmap created: 2026-01-19*
*Phase 4 completed: 2026-01-20*
*Phase 5 completed: 2026-01-20*
*Phase 6 completed: 2026-01-20*
*Next phase: 7 - Recipient Wishlist Integration*
