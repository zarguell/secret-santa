# Architecture Research

**Domain:** Secret Santa Wishlist Feature (Cloudflare Workers + Durable Objects)
**Researched:** 2026-01-19
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser Layer                    │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ guest.html │  │ guest.js   │  │ style.css  │           │
│  │  (static)  │  │  (fetch)   │  │  (static)  │           │
│  └─────┬──────┘  └─────┬──────┘  └────────────┘           │
│        │                │                                   │
└────────┼────────────────┼───────────────────────────────────┘
         │                │
         │ HTTP GET/POST  │
         ↓                ↓
┌─────────────────────────────────────────────────────────────┐
│                  Cloudflare Worker Layer                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │              index.ts (Request Router)              │    │
│  │  • POST /api/parties                                │    │
│  │  • GET  /api/guest/:id/assignment                   │    │
│  │  • GET  /guest/:id (serve static HTML)              │    │
│  │  • PUT  /api/guest/:id/wishlist ← NEW               │    │
│  │  • GET  /api/guest/:id/wishlist ← NEW               │    │
│  └─────────────────────────────────────────────────────┘    │
└────────┼───────────────────────────────────────────────────┘
         │ (stub通信)
         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Durable Objects Layer                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Party Durable Object (Per Party)          │    │
│  │  • Stores: party data, assignments, guestLinks      │    │
│  │  • NEW: Stores: wishlists (guestId → wishlist)      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  DO Storage      │  │  KV Namespace    │                │
│  │  (party data)    │  │  (guest→party)   │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Client (guest.js)** | Fetch wishlist, render form, handle edit/save | Vanilla JS with fetch API |
| **Worker Router** | Route requests, validate guest IDs, proxy to DO | URL pattern matching in fetch handler |
| **Party DO** | Store party data + wishlists, enforce 500 char limit | Single storage key `wishlists` or per-guest keys |
| **KV Namespace** | Fast guest→party mapping (guestId → {partyId, guestName}) | Existing: `guest:${guestId}` keys |

## Recommended Project Structure

```
src/
├── index.ts           # Request router (add wishlist endpoints)
├── party.ts           # Party DO class (add wishlist methods)
├── types.ts           # TypeScript interfaces (add wishlist types)
├── kv.ts              # KV helpers (no changes needed)
└── utils.ts           # Assignment generation (no changes needed)

public/
├── guest.html         # Add wishlist form section
├── guest.js           # Add wishlist fetch/submit logic
├── style.css          # Add wishlist form styles
└── ... (other assets)

tests/
├── party.test.ts      # Add wishlist DO tests
├── api.test.ts        # Add wishlist endpoint tests
└── ... (other tests)
```

### Structure Rationale

- **index.ts:** Single entry point maintains existing routing pattern; wishlist endpoints follow same structure as `/api/guest/:id/assignment`
- **party.ts:** Durable Object already owns all party-scoped data; wishlists are guest-scoped but belong to a single party
- **types.ts:** Central type definitions prevent drift between DO and API layers
- **guest.js:** Client already fetches assignment; wishlist uses same API pattern

## Architectural Patterns

### Pattern 1: Single Storage Key vs. Per-Guest Keys

**What:** Two approaches for storing wishlists in DO storage:
1. **Single storage key:** Store all wishlists in one `wishlists` object
2. **Per-guest keys:** Store each wishlist as `wishlist:${guestId}`

**When to use:**
- **Single key:** When you frequently read all wishlists together (< 100 guests)
- **Per-guest keys:** When you need individual lookups and want to minimize read/write payload sizes

**Trade-offs:**
| Approach | Pros | Cons |
|----------|------|------|
| Single key | Atomic updates, simple to fetch all | Must read/write all wishlists for single update |
| Per-guest keys | Smaller payloads, targeted updates | More keys to manage, need list for all |

**Recommendation:** **Per-guest keys** because:
- Wishlists are independently edited (no need for atomic multi-guest updates)
- 500 char limit means small payloads
- Matches existing KV pattern (`guest:${guestId}`)
- Can use `storage.list()` with prefix to fetch all if needed

**Example:**
```typescript
// Party DO - per-guest key approach
async setWishlist(guestId: string, wishlist: string): Promise<void> {
  if (wishlist.length > 500) {
    throw new Error("Wishlist exceeds 500 character limit");
  }

  await this.ctx.storage.put(`wishlist:${guestId}`, {
    wishlist,
    updatedAt: new Date().toISOString(),
  });
}

async getWishlist(guestId: string): Promise<string | null> {
  const data = await this.ctx.storage.get<WishlistData>(`wishlist:${guestId}`);
  return data?.wishlist ?? null;
}

// Get all wishlists for a party (optional, for admin view)
async getAllWishlists(): Promise<Record<string, string>> {
  const list = await this.ctx.storage.list<WishlistData>({ prefix: "wishlist:" });
  const wishlists: Record<string, string> = {};

  for (const [key, value] of list) {
    const guestId = key.replace("wishlist:", "");
    wishlists[guestId] = value.wishlist;
  }

  return wishlists;
}
```

### Pattern 2: Guest ID Lookup via KV (Existing Pattern)

**What:** KV maps guest IDs to party IDs and guest names, DO stores all party data

**When to use:** When you have a global identifier that needs to resolve to a specific Durable Object instance

**Trade-offs:**
- **Pros:** Fast global lookups, separates routing from data storage
- **Cons:** Double lookup (KV → DO) for every request

**Example:**
```typescript
// Existing pattern (no changes needed)
const mapping = await getGuestMapping(env.GUEST_KV, guestId);
const partyStub = env.PARTY_DO.get(env.PARTY_DO.idFromString(mapping.partyId));
const wishlist = await partyStub.getWishlist(guestId);
```

### Pattern 3: Security via Guest ID Ownership

**What:** Guests can only edit their own wishlist; can view assigned recipient's wishlist

**When to use:** Simple access control without authentication

**Trade-offs:**
- **Pros:** No auth complexity, uses existing guest ID system
- **Cons:** Security depends on guest ID secrecy (same as assignment viewing)

**Implementation:**
```typescript
// Party DO - verify guest belongs to party
async setWishlist(guestId: string, guestName: string, wishlist: string): Promise<void> {
  const partyData = await this.ctx.storage.get<PartyData>("party");

  // Verify guest exists in this party
  if (!Object.entries(partyData.guestLinks).some(([, id]) => id === guestId)) {
    throw new Error("Guest not found in this party");
  }

  // Verify guest name matches (prevents guestId spoofing)
  const expectedGuestName = Object.entries(partyData.guestLinks).find(
    ([_, id]) => id === guestId
  )?.[0];

  if (expectedGuestName !== guestName) {
    throw new Error("Guest name mismatch");
  }

  await this.ctx.storage.put(`wishlist:${guestId}`, {
    wishlist: wishlist.slice(0, 500), // Enforce limit
    guestName,
    updatedAt: new Date().toISOString(),
  });
}
```

## Data Flow

### Request Flow

```
[Guest views own wishlist]
    ↓
GET /api/guest/:guestId/wishlist
    ↓
[index.ts] → Validate guestId format → KV lookup → Party DO stub
    ↓
[Party DO] → storage.get(`wishlist:${guestId}`) → Return wishlist or null
    ↓
[Response] ← { wishlist: string | null }
```

```
[Guest saves their wishlist]
    ↓
PUT /api/guest/:guestId/wishlist
    ↓
[index.ts] → Validate body { wishlist, guestName } → KV lookup → Party DO stub
    ↓
[Party DO] → Verify guest exists → storage.put(`wishlist:${guestId}`, data)
    ↓
[Response] ← { success: true }
```

```
[Guest views recipient's wishlist]
    ↓
GET /api/guest/:guestId/assignment (existing)
    ↓
[index.ts] → Return assignment + recipient's guestId
    ↓
[Client] → GET /api/guest/:recipientGuestId/wishlist
    ↓
[Party DO] → storage.get(`wishlist:${recipientGuestId}`)
    ↓
[Response] ← { wishlist: string | null }
```

### State Management

```
[Durable Object Storage]
┌──────────────────────────────────────┐
│ "party" → PartyData                  │
│ "assignments" → Record<name, name>   │
│ "guestLinks" → Record<name, guestId> │
│ "metadata" → { guestCount, ... }     │
│                                      │
│ "wishlist:${guestId1}" → WishlistData│
│ "wishlist:${guestId2}" → WishlistData│
│ "wishlist:${guestId3}" → WishlistData│
└──────────────────────────────────────┘
```

### Key Data Flows

1. **Create Party → Generate Guest Links:** Existing flow unchanged
2. **Guest Views Assignment → Fetch Recipient Wishlist:** New! Assignment response includes recipient guest ID, client makes second request
3. **Guest Edits Wishlist → Validate → Store:** New! PUT endpoint, DO validates guest exists

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k parties | Current architecture optimal. Single DO per party isolates data. |
| 1k-100k parties | No changes needed. DO storage handles ~100MB per DO. Wishlists at 500 chars × 50 guests = 25KB per party. |
| 100k+ parties | Consider DO migration policy for inactive parties. Current DO storage limit 128GB per object. |

### Scaling Priorities

1. **First bottleneck:** Durable Object concurrency limits (single thread per DO)
   - **Mitigation:** Wishlists are small reads/writes; 50 guests × few requests = negligible
   - **Why not a problem:** Single party has limited guests (max 50), low request volume

2. **Second bottleneck:** KV lookup on every request
   - **Mitigation:** KV is globally distributed, ~1ms reads
   - **Already addressed:** Current design uses KV for all guest requests, wishlist adds no new bottleneck

3. **Third concern:** Storage size
   - **Back-of-envelope:** 500 chars × 50 guests = 25KB per party
   - **DO limit:** 128GB → millions of parties per DO before hitting storage limits
   - **Conclusion:** Not a concern

## Anti-Patterns

### Anti-Pattern 1: Storing Wishlists in KV

**What people do:** Store wishlists as `wishlist:${guestId}` in KV namespace alongside guest mappings

**Why it's wrong:**
- KV is eventually consistent; wishlist edits may not appear immediately
- Party data in DO, wishlists in KV = split brain, harder to reason about
- Can't atomically fetch party + all wishlists for admin views
- Violates single responsibility: DO should own all party-scoped data

**Do this instead:** Store wishlists in the same Durable Object as the party data. DO provides strongly consistent storage and single-threaded execution guarantees.

### Anti-Pattern 2: Single Giant `wishlists` Object

**What people do:** Store all wishlists as one object: `{ "guestId1": "wishlist1", "guestId2": "wishlist2", ... }`

**Why it's wrong:**
- Editing one wishlist requires reading all wishlists (500 chars × 50 = 25KB payload)
- Higher risk of concurrent write conflicts
- Violates principle of minimal data access

**Do this instead:** Use per-guest keys (`wishlist:${guestId}`). Storage.get only reads the specific wishlist.

### Anti-Pattern 3: Client-Side Only Validation

**What people do:** Enforce 500 char limit only in the HTML/JS

**Why it's wrong:** Easy to bypass with curl/Postman; could fill DO storage with megabytes of data

**Do this instead:** Validate on both client (UX) and server (security). DO should enforce: `wishlist.slice(0, 500)` or throw error if exceeds limit.

### Anti-Pattern 4: Separate Durable Object for Wishlists

**What people do:** Create `WishlistDurableObject` separate from `PartyDurableObject`

**Why it's wrong:**
- Over-engineering; adds latency (two DO lookups instead of one)
- Wishlists have no lifecycle independent of party
- Complicates data consistency and deletion

**Do this instead:** Store wishlists in the Party DO. They're party-scoped data with same lifetime as the party.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| None | — | Pure Cloudflare Workers platform; no external APIs needed |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Worker ↔ Party DO | RPC via stub (`env.PARTY_DO.get(id).method()`) | Single DO instance per party ID |
| Worker ↔ KV | Direct (`env.GUEST_KV.get/put`) | Guest ID → Party ID lookup |
| Client ↔ Worker | HTTP (fetch API) | JSON requests/responses with CORS |

### New API Endpoints

```typescript
// GET /api/guest/:guestId/wishlist
// Response: { wishlist: string | null, guestName: string, updatedAt?: string }

// PUT /api/guest/:guestId/wishlist
// Request: { wishlist: string, guestName: string }
// Response: { success: true, wishlist: string, updatedAt: string }
```

## Recommended Build Order

### Phase 1: Durable Object Layer (Foundation)
1. Add `WishlistData` interface to `types.ts`
2. Add `setWishlist()` and `getWishlist()` methods to `Party` class
3. Add validation (500 char limit, guest exists in party)
4. Write unit tests for DO methods

**Why first:** Changes to core storage logic; everything else depends on this.

### Phase 2: Worker Router Layer (API)
1. Add `PUT /api/guest/:guestId/wishlist` endpoint in `index.ts`
2. Add `GET /api/guest/:guestId/wishlist` endpoint in `index.ts`
3. Wire up KV lookup → DO stub → method call
4. Write integration tests for API endpoints

**Why second:** Exposes DO functionality via HTTP; can test with curl before building UI.

### Phase 3: Client Layer (UI)
1. Add wishlist form section to `guest.html`
2. Add `loadWishlist()` and `saveWishlist()` functions to `guest.js`
3. Add styles for form elements to `style.css`
4. Test end-to-end with real DO storage

**Why third:** Depends on working API; UI is a thin client layer.

### Phase 4: Integration (Recipient Wishlist)
1. Modify `GET /api/guest/:guestId/assignment` to include `recipientGuestId`
2. Add "View Recipient's Wishlist" link/button in UI
3. Client fetches recipient wishlist using `recipientGuestId`

**Why last:** Builds on phases 1-3; adds value after basic wishlist works.

## Sources

**Confidence: HIGH** - All findings verified with official Cloudflare documentation.

- **Durable Object Storage API:** Official Cloudflare Workers documentation (HIGH confidence)
  - Confirms: `get`, `put`, `delete`, `list` operations with prefix support
  - Confirms: Single-threaded execution guarantees
  - Confirms: Strongly consistent storage (not eventually consistent like KV)

- **Existing Codebase:** Current Secret Santa implementation (HIGH confidence)
  - Confirms: Party DO pattern with per-party storage
  - Confirms: KV guest ID mapping pattern
  - Confirms: Existing API structure and routing

- **Cloudflare Blog - "Durable Objects GA"** (MEDIUM confidence - dated but fundamentals accurate)
  - Confirms: DO lifecycle management, scaling characteristics
  - Confirms: Single DO instance = single-threaded = consistent state

---
*Architecture research for: Secret Santa Wishlist Feature (v1.1)*
*Researched: 2026-01-19*
