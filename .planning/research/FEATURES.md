# Feature Research: Wishlist Functionality

**Domain:** Secret Santa / Gift Exchange Application
**Researched:** 2026-01-19
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a Secret Santa wishlist feature. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| View own wishlist | Users need to see what they've listed to avoid duplicates | LOW | Read-only access to personal wishlist |
| Edit own wishlist | Users will want to update their wishlist as they think of items | LOW | Update endpoint, overwrites existing |
| View recipient's wishlist | Core Secret Santa value — knowing what your recipient wants | LOW | Read-only, accessed via assignment |
| Character limit display | Users need to know constraints before typing | LOW | Show "X/500 chars" counter |
| Empty state handling | Users need to know wishlist is empty vs loading | LOW | Show "No wishlist yet" message |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| ~~Structured items with prices~~ | Richer wishlist data, but adds complexity | HIGH | **DEFERRED** — Freeform text is simpler for v1.1 |
| ~~Wishlist item images~~ | Visual wishlist experience | HIGH | **DEFERRED** — Adds storage complexity |
| ~~Wishlist sharing via link~~ | Let users share wishlist outside Secret Santa context | MEDIUM | **DEFERRED** — Out of scope |
| Real-time wishlist updates | Instant feedback when recipient updates wishlist | MEDIUM | **DEFERRED** — Requires polling/WebSocket |
| Wishlist history | See what recipient added/removed over time | HIGH | **DEFERRED** — Requires versioning |
| Anonymous wishlist viewing | Let organizers see all wishlists without revealing assignments | MEDIUM | **DEFERRED** — Privacy complexity |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multiple wishlist sets | Users might want "work friends" vs "family" wishlists | Breaks simple one-wishlist-per-guest model, adds UI complexity | Single freeform text field lets users organize however they want |
| Wishlist item claiming | Prevents duplicate gifts from multiple Santas | Requires coordination system, undermines Secret Santa surprise | Freeform text lets recipient say "anything from this list" |
| Wishlist due dates | Force users to add wishlists by deadline | Adds email notification system, creates anxiety | Optional wishlist, no deadline pressure |
| Public wishlist directory | Let anyone browse wishlists | Privacy concern, not Secret Santa pattern | Only your assigned recipient sees your wishlist |
| Rich text/Markdown formatting | Users want to bold/color/highlight items | Adds parsing complexity, XSS risks | Plain text is simple and universal |

## Feature Dependencies

```
[Wishlist Storage]
    └──requires──> [Party Data Structure Extension]
                       └──requires──> [API Endpoints]
                                          └──requires──> [UI Forms]

[Guest Authentication] ──enhances──> [Wishlist Editing]

[Assignment Viewing] ──enables──> [Recipient Wishlist Viewing]
```

### Dependency Notes

- **Wishlist Storage requires Party Data Structure Extension**: `PartyData` interface needs a `wishlists: Record<string, string>` field mapping guest names to their wishlist text
- **API Endpoints requires Party Data Structure Extension**: Need `POST /api/guest/[id]/wishlist` for updates, `GET /api/guest/[id]/wishlist` for viewing own, and need to extend `/api/guest/[id]/assignment` to include recipient's wishlist
- **Guest Authentication enhances Wishlist Editing**: Currently security model is simple (anyone with guest link can view), but editing should maintain this — anyone with guest link can edit that guest's wishlist (simple for v1.1)
- **Assignment Viewing enables Recipient Wishlist Viewing**: When a guest views their assignment, they should automatically see their recipient's wishlist — extends existing `/api/guest/[id]/assignment` response

## MVP Definition

### Launch With (v1.1)

Minimum viable wishlist feature — what's needed to validate the concept.

- [ ] **Wishlist data structure** — Extend `PartyData` with `wishlists: Record<string, string>` field mapping guest names to freeform text (max 500 chars)
- [ ] **View own wishlist** — GET `/api/guest/[id]/wishlist` endpoint returns guest's current wishlist or empty string
- [ ] **Edit own wishlist** — POST `/api/guest/[id]/wishlist` endpoint accepts `{ wishlist: string }` and updates (validates ≤500 chars)
- [ ] **View recipient's wishlist** — Extend GET `/api/guest/[id]/assignment` response to include `recipientWishlist: string` field
- [ ] **UI form for editing** — Add textarea form to guest.html with character counter (shows current/500)
- [ ] **Display recipient wishlist** — Add section to guest.html showing recipient's wishlist (if non-empty)
- [ ] **Test coverage** — Unit tests for wishlist storage/retrieval, integration tests for API endpoints

**Why this is MVP:**
- Simple freeform text keeps complexity low
- Uses existing Durable Object storage pattern
- Leverages existing guest link security model
- No authentication overhead (anyone with link = owner)
- No rich data structures or images

### Add After Validation (v1.2+)

Features to add once core wishlist is working.

- [ ] **Wishlist last-modified timestamp** — Show when recipient last updated their wishlist
- [ ] **Wishlist analytics for organizer** — Let organizer see how many guests have added wishlists (without revealing wishlists or assignments)
- [ ] **Wishlist character count in assignment response** — Pre-populate UI character counter without extra fetch
- [ ] **Bulk wishlist import/export** — CSV upload for power users

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Structured wishlist items** — Individual items with prices, links, quantities, priorities
- [ ] **Wishlist images** — Let users add photos/links to items
- [ ] **Wishlist sharing** — Share wishlist link outside of Secret Santa context
- [ ] **Wishlist claiming system** — Coordinate multiple Santas to avoid duplicate gifts
- [ ] **Wishlist collaboration** — Let family members build wishlist together
- [ ] **Email notifications** — Notify when recipient updates wishlist
- [ ] **Real-time updates** — WebSocket/polling for instant wishlist changes

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| View recipient's wishlist | HIGH | LOW | **P1** |
| Edit own wishlist | HIGH | LOW | **P1** |
| Character limit enforcement | MEDIUM | LOW | **P1** |
| View own wishlist | MEDIUM | LOW | **P1** |
| Wishlist last-modified timestamp | LOW | LOW | P2 |
| Wishlist analytics (organizer view) | MEDIUM | MEDIUM | P2 |
| Character count pre-population | LOW | LOW | P2 |
| Structured items | HIGH | HIGH | P3 |
| Wishlist images | MEDIUM | HIGH | P3 |
| Wishlist sharing | LOW | MEDIUM | P3 |
| Wishlist claiming | HIGH | HIGH | P3 |
| Real-time updates | MEDIUM | HIGH | P3 |

**Priority key:**
- **P1**: Must have for v1.1 launch
- **P2**: Should have, add when possible (v1.2+)
- **P3**: Nice to have, future consideration (v2+)

## Competitor Feature Analysis

| Feature | Elfster / DrawNames / Typical | Our Approach (v1.1) | Rationale |
|---------|-------------------------------|---------------------|-----------|
| Wishlist format | Often structured items with links | Freeform text (500 chars) | Simpler implementation, flexible for users |
| Image support | Some allow images | No images | Reduces storage complexity, keeps DO state small |
| Wishlist claiming | Some have claiming system | No claiming | Preserves Secret Santa surprise, simpler model |
| Access control | Usually login-based | Guest link only | Aligns with v1.0 security model, no auth overhead |
| Wishlist visibility | Often public to party | Only recipient sees | Privacy-preserving, fits Secret Santa pattern |
| Character limits | Varies widely | 500 chars | Reasonable limit, fits DO storage constraints |

## v1.1 Implementation Scope

**Data Model Changes:**
```typescript
export interface PartyData {
  name: string;
  budget: string;
  criteria: string;
  guests: string[];
  assignments: Record<string, string>;
  createdAt: string;
  guestLinks: Record<string, string>;
  wishlists: Record<string, string>; // NEW: guestName -> wishlist text
}
```

**API Endpoints:**
1. `POST /api/guest/[guestId]/wishlist` — Update own wishlist
2. `GET /api/guest/[guestId]/wishlist` — View own wishlist
3. Extend `GET /api/guest/[guestId]/assignment` response to include `recipientWishlist`

**UI Changes:**
1. Add "My Wishlist" section to guest.html with textarea form
2. Add character counter (shows current length / 500)
3. Add "Recipient's Wishlist" section to assignment view
4. Handle empty states (no wishlist yet)

**Test Coverage:**
1. Unit tests for wishlist storage/retrieval in `party.test.ts`
2. API tests for wishlist endpoints in `api.test.ts`
3. Edge cases: empty wishlist, max length, Unicode characters

## Sources

**LOW Confidence (limited web sources available):**
- General domain knowledge of Secret Santa/gift exchange patterns
- Analysis of existing v1.0 codebase architecture
- Typical gift exchange platform patterns (Elfster, DrawNames)

**HIGH Confidence (verified):**
- Existing codebase: `/Users/zach/localcode/secret-santa/src/types.ts`
- Existing codebase: `/Users/zach/localcode/secret-santa/src/party.ts`
- Existing codebase: `/Users/zach/localcode/secret-santa/public/guest.html`
- v1.0 requirements: `.planning/milestones/v1.0-REQUIREMENTS.md`
- v1.1 goals: `.planning/PROJECT.md`

**Research Limitations:**
- Limited current web sources on specific Secret Santa wishlist features
- Competitor analysis based on general domain knowledge rather than current feature lists
- User feedback not yet available (v1.0 recently shipped)

**Confidence Level Rationale:**
- **MEDIUM overall** — Feature categorization based on standard Secret Santa patterns and existing codebase architecture, but lacking user validation or competitive analysis
- **HIGH on technical implementation** — Clear understanding of existing patterns and extension points
- **LOW on user priorities** — No user feedback data yet, prioritization based on assumptions
