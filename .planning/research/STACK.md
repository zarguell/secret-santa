# Stack Research

**Domain:** Secret Santa Wishlist Feature (Cloudflare Workers)
**Researched:** 2026-01-19
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology                                         | Version | Purpose          | Why Recommended                                                                                                                                                          |
| -------------------------------------------------- | ------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cloudflare Workers (SQLite-backed Durable Objects) | Latest  | Wishlist storage | Already configured in wrangler.toml (`new_sqlite_classes`), supports synchronous KV API for simple string storage, zero-latency access, automatic point-in-time recovery |
| TypeScript                                         | ^5.x    | Type safety      | Already in use, provides compile-time safety for wishlist data structures                                                                                                |
| Vitest                                             | ^3.2.0  | Testing          | Already configured with @cloudflare/vitest-pool-workers, supports Durable Object testing                                                                                 |

### Data Storage Approach

**Storage location:** Durable Object's party instance (not KV)

**Why:** Wishlists are party-scoped data, not global lookup data. Each party has 2-50 guests, so wishlists naturally belong with the party state in the Durable Object. KV is already used for guest ID → party ID lookups, which is the correct pattern for that use case.

**Storage mechanism:** Asynchronous KV API (`ctx.storage.put/get/delete`)

**Why:**

- Simple key-value pairs perfectly fit the "guest ID → wishlist text" data model
- Existing party code already uses this pattern (assignments, guestLinks, party metadata)
- No need for SQL tables for flat string data
- Automatic atomic writes with write coalescing
- Backwards compatible if you ever migrate from SQLite storage

**Data structure:**

```typescript
// Key: guest ID (UUID string)
// Value: wishlist text (string, max ~500 chars)

await this.ctx.storage.put(`wishlist:${guestId}`, wishlistText);
```

**Key prefix pattern:** `wishlist:` prefix keeps wishlists separate from other party data and allows using `list({ prefix: 'wishlist:' })` if needed for debugging.

### HTTP API Design

**Pattern:** RESTful endpoints following existing convention

**Proposed endpoints:**
| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/guest/:guestId/wishlist` | GET | Get own wishlist | `{ wishlist: string \| null }` |
| `/api/guest/:guestId/wishlist` | PUT | Update own wishlist | `{ success: boolean }` |
| `/api/guest/:guestId/recipient/wishlist` | GET | Get recipient's wishlist | `{ recipientName: string, wishlist: string \| null }` |

**Authentication:** Guest ID in URL path (no additional auth needed)

- Already validates guest ID format and existence in KV
- Guest can only view their own assignment and recipient's wishlist
- Security model: "Anyone with the link can see it" (as per existing party details)

### Supporting Libraries

| Library     | Version | Purpose          | When to Use                                       |
| ----------- | ------- | ---------------- | ------------------------------------------------- |
| None needed | -       | Wishlist storage | Built-in Durable Object storage API is sufficient |

### Development Tools

| Tool                                    | Purpose                  | Notes                                             |
| --------------------------------------- | ------------------------ | ------------------------------------------------- |
| wrangler ^4.0.0                         | Deployment and local dev | Already configured, supports SQLite-backed DOs    |
| @cloudflare/vitest-pool-workers ^0.12.4 | Durable Object testing   | Already configured, provides `env` for DO testing |

## Installation

```bash
# No new packages needed!
# Stack uses existing dependencies:

# Dev dependencies (already installed)
npm install -D @cloudflare/vitest-pool-workers@^0.12.4
npm install -D @cloudflare/workers-types@^4.20241112.0
npm install -D vitest@^3.2.0
npm install -D wrangler@^4.0.0
```

## Alternatives Considered

| Recommended                   | Alternative                            | When to Use Alternative                                                                                                                                                           |
| ----------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DO KV storage (`ctx.storage`) | SQLite tables (`ctx.storage.sql.exec`) | Use SQLite if wishlists need querying (e.g., "find all parties with wishlists containing 'legos'"). For current scope (simple get/set by guest ID), KV is simpler and sufficient. |
| DO storage                    | KV namespace                           | Use KV namespace only if data needs global access across all parties. Wishlists are party-scoped, so DO storage is correct.                                                       |
| Guest-scoped DOs              | Single party DO                        | Use guest-scoped DOs if each guest needs independent state unrelated to their party. Overkill for simple wishlists attached to party.                                             |

## What NOT to Use

| Avoid                                  | Why                                                                                                    | Use Instead                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --- | ------------------------------------- |
| Separate KV namespace for wishlists    | Adds complexity and cost. Wishlists are party-scoped, not global. No need for namespace-level lookups. | Store wishlists in party Durable Object using `ctx.storage`            |
| SQL tables for simple wishlist strings | Over-engineering for flat string data. SQL adds schema complexity, query overhead, and learning curve. | Use KV API: `ctx.storage.put(\`wishlist:${guestId}\`, text)`           |
| External database (D1, R2, etc.)       | Breaks single-platform constraint. Adds network latency and separate deployment.                       | Built-in DO storage is co-located with code, zero-latency              |
| JWT/session-based authentication       | Violates simple security model. Existing app uses "whoever has the link can see it" pattern.           | Continue using guest ID in URL path (validated via existing KV lookup) |
| Additional frontend framework          | Current app serves static HTML with vanilla JavaScript. Adding React/Vue is unnecessary complexity.    | Extend existing vanilla JS in guest.js                                 |
| Form validation library                | Wishlist is simple text (max 500 chars). Adding Zod/Yup adds weight for minimal value.                 | Manual validation: `if (typeof text !== 'string'                       |     | text.length > 500) throw new Error()` |

## Stack Patterns by Variant

**If wishlists need more than ~500 chars per guest:**

- Use KV storage with larger value limits (SQLite-backed DOs support larger values than legacy KV DOs)
- Consider max size: SQLite-backed DOs support values up to 128MB per key (vs legacy's 1.5MB)

**If wishlists need structured data (multiple items, links, etc.):**

- Store as JSON: `await this.ctx.storage.put(\`wishlist:${guestId}\`, JSON.stringify(items))`
- Parse on read: `JSON.parse(await this.ctx.storage.get(\`wishlist:${guestId}\`))`

**If you need to query wishlists across parties:**

- This is a fundamental scope change (wishlists become global data)
- Consider: Add separate D1 database for global wishlist search
- Or: Add indexing DO that tracks which parties have wishlists matching criteria

**If you need real-time wishlist updates (multiple guests editing simultaneously):**

- Current model doesn't require this (each guest edits only their own wishlist)
- If needed: Use WebSocket Hibernation API in Durable Object to broadcast updates

## Version Compatibility

| Package A                               | Compatible With                         | Notes                                                                        |
| --------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| wrangler ^4.0.0                         | SQLite-backed Durable Objects           | wrangler.toml already uses `new_sqlite_classes = ["Party"]` which is correct |
| @cloudflare/vitest-pool-workers ^0.12.4 | Durable Object testing                  | Already configured in vitest.config.ts, works with SQLite-backed DOs         |
| TypeScript ^5.x                         | @cloudflare/workers-types ^4.20241112.0 | Workers types provide Env interface, DurableObject stub types                |

## Implementation Pattern

**Add to `src/party.ts`:**

```typescript
// Get wishlist for a guest
async getWishlist(guestId: string): Promise<string | null> {
  return await this.ctx.storage.get(`wishlist:${guestId}`) ?? null;
}

// Update wishlist for a guest
async updateWishlist(guestId: string, wishlist: string): Promise<void> {
  // Validation
  if (typeof wishlist !== 'string') {
    throw new Error('Wishlist must be a string');
  }
  if (wishlist.length > 500) {
    throw new Error('Wishlist must be 500 characters or less');
  }

  await this.ctx.storage.put(`wishlist:${guestId}`, wishlist);
}

// Get recipient's wishlist (for assignment viewing)
async getRecipientWishlist(guestId: string): Promise<{
  recipientName: string;
  wishlist: string | null;
} | null> {
  const partyData = await this.ctx.storage.get<PartyData>('party');
  if (!partyData) throw new Error('Party not found');

  // Find guest name from guestId
  const guestName = Object.entries(partyData.guestLinks).find(
    ([_, id]) => id === guestId,
  )?.[0];
  if (!guestName) throw new Error('Invalid guest link');

  // Get recipient
  const recipientName = partyData.assignments[guestName];
  const recipientId = partyData.guestLinks[recipientName];

  // Get recipient's wishlist
  const wishlist = await this.ctx.storage.get(`wishlist:${recipientId}`) ?? null;

  return { recipientName, wishlist };
}
```

**Add to `src/types.ts`:**

```typescript
export interface WishlistRequest {
  wishlist: string;
}

export interface WishlistResponse {
  wishlist: string | null;
}

export interface RecipientWishlistResponse {
  recipientName: string;
  wishlist: string | null;
}
```

**Add to `src/index.ts`:**

New route handlers following existing pattern (CORS, validation, error handling).

## Storage Backend Verification

Current `wrangler.toml` uses SQLite-backed Durable Objects:

```toml
[[migrations]]
tag = "v1"
new_sqlite_classes = ["Party"]
```

This is **correct** for wishlist storage:

- Supports both synchronous and asynchronous KV API
- Automatic point-in-time recovery (last 30 days)
- Better performance than legacy KV-backed DOs
- Larger value limits (128MB per key vs 1.5MB legacy)

**No migration needed** - the party DO is already SQLite-backed.

## Billing Implications

Storage operations in Durable Objects are **not** billed separately from DO usage:

- DO requests and duration are billed (already incurring costs)
- KV storage within DO is included in DO storage limits
- SQL queries (rows read/written) are billed separately, but **NOT** used for KV API
- SQLite storage usage is billed, but wishlist strings are tiny (~500 bytes per guest)

**Estimated cost impact:** Negligible. A party with 50 guests, each with a 500-char wishlist = ~25KB total storage.

## Sources

- [Cloudflare Durable Objects Storage API (SQLite-backed)](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/) — Storage operations, KV API usage
- [Cloudflare Durable Objects State API](https://developers.cloudflare.com/durable-objects/api/state/) — DurableObjectState interface
- [Zero-latency SQLite storage in every Durable Object blog](https://blog.cloudflare.com/sqlite-in-durable-objects/) — Architecture benefits, synchronous vs async API, output gates
- [Durable Objects: Easy, Fast, Correct - Choose Three blog](https://blog.cloudflare.com/durable-objects-easy-fast-correct-choose-three/) — Storage patterns, transaction guarantees
- [Cloudflare Workers Durable Objects Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) — Billing for storage operations

---

_Stack research for: Secret Santa Wishlist Feature (Cloudflare Workers)_
_Researched: 2026-01-19_
