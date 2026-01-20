# Domain Pitfalls

**Domain:** Secret Santa wishlist feature (user-generated content in Cloudflare Workers)
**Researched:** 2025-01-19

## Critical Pitfalls

Mistakes that cause rewrites, major security issues, or data loss.

### Pitfall 1: Race Conditions in Wishlist Updates

**What goes wrong:**
Multiple concurrent requests to update a wishlist can cause data loss or corruption. In a serverless environment with async/await, two update operations can interleave, causing the second update to overwrite the first.

**Why it happens:**
JavaScript's async/await allows other requests to execute while waiting for I/O operations. Without proper synchronization, two users updating their wishlist simultaneously can interfere with each other.

**Consequences:**
- Lost wishlist items (one update overwrites another)
- Corrupted wishlist state
- Users frustrated that their changes disappear

**Prevention:**
- **Leverage Durable Object input gates** - Storage operations automatically block other events from being delivered
- **Use write coalescing** - Multiple writes without intervening `await` are atomic
- **Never rely solely on in-memory state** - Always persist to storage before confirming success

```typescript
// ❌ BAD: Race condition possible
async updateWishlist(guestId: string, items: string[]) {
  const current = await this.ctx.storage.get(`wishlist:${guestId}`);
  // Another request could modify here!
  await this.ctx.storage.put(`wishlist:${guestId}`, items);
}

// ✅ GOOD: Input gates prevent interleaving
async updateWishlist(guestId: string, items: string[]) {
  // Storage operations block other events automatically
  await this.ctx.storage.put(`wishlist:${guestId}`, items);
  // Response held by output gate until write completes
  return { success: true };
}
```

**Detection:**
- Wishlist changes mysteriously disappear
- Tests pass but production has data loss under load
- Multiple rapid updates cause inconsistent state

**Sources:**
- Cloudflare Durable Objects best practices (HIGH confidence)
- "Durable Objects: Easy, Fast, Correct — Choose Three" blog post (HIGH confidence)

---

### Pitfall 2: Input Validation Failures

**What goes wrong:**
Malicious or malformed input to wishlist endpoints causes application crashes, data corruption, or security vulnerabilities.

**Why it happens:**
Freeform text fields without proper validation allow:
- Excessive payload sizes (DoS)
- Control characters or non-printable characters
- Unicode normalization attacks
- HTML/script injection attempts

**Consequences:**
- Durable Object crashes or resets (uncaught exceptions)
- Storage quota exceeded
- XSS vulnerabilities if content is reflected improperly
- Data corruption from invalid UTF-8 sequences

**Prevention:**

1. **Length validation** - Enforce 500 character limit at API boundary
```typescript
if (wishlist.length > 500) {
  return new Response(
    JSON.stringify({ error: "Wishlist must be 500 characters or less" }),
    { status: 400 }
  );
}
```

2. **Character validation** - Reject control characters, normalize Unicode
```typescript
// Remove control characters except newline/tab
const sanitized = wishlist.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

// Normalize Unicode to prevent homograph attacks
const normalized = sanitized.normalize('NFC');
```

3. **Type validation** - Ensure input is string, not object/array
```typescript
if (typeof wishlist !== 'string') {
  return new Response(
    JSON.stringify({ error: "Wishlist must be a string" }),
    { status: 400 }
  );
}
```

4. **Structured error handling** - Never crash on bad input
```typescript
try {
  const result = await partyStub.updateWishlist(guestId, wishlist);
  return Response.json(result);
} catch (error) {
  // Log but don't expose internal errors
  console.error('Wishlist update error:', error);
  return new Response(
    JSON.stringify({ error: "Failed to update wishlist" }),
    { status: 500 }
  );
}
```

**Detection:**
- Uncaught exception errors in logs
- Sudden Durable Object resets
- Tests fail with unexpected input
- High memory usage or storage quota errors

**Sources:**
- OWASP Serverless Top 10 (MEDIUM confidence - general best practices)
- Cloudflare Workers error handling docs (HIGH confidence)

---

### Pitfall 3: Overloading Single Durable Object

**What goes wrong:**
All wishlist requests for a party route through one Durable Object, causing performance degradation and overload errors under load.

**Why it happens:**
Durable Objects are single-threaded. If all wishlist operations (view own, view recipient's, update) route through the party DO, concurrent requests queue up. With ~50 guests and multiple operations each, this creates significant load.

**Consequences:**
- `Error: Durable Object is overloaded. Too many requests queued.`
- `Error: Durable Object is overloaded. Requests queued for too long.`
- Latency increases dramatically under load
- Durable Object resets if queue limits exceeded

**Prevention:**

1. **Monitor request patterns** - Most parties have low concurrency (<10 simultaneous requests), but design for worst case
2. **Use fast operations** - Keep DO methods lightweight (<5ms ideal)
3. **Avoid external I/O in DO** - No fetch(), KV, or other slow operations during request handling
4. **Consider read-only replicas** - For viewing wishlists, could use cached data (future enhancement)

```typescript
// ❌ BAD: Slow operation in DO
async updateWishlist(guestId: string, items: string[]) {
  // This blocks all other requests to this DO!
  await fetch('https://external-api.com/notify', { ... });
  await this.ctx.storage.put(`wishlist:${guestId}`, items);
}

// ✅ GOOD: Fast DO operation
async updateWishlist(guestId: string, items: string[]) {
  // Storage write is coalesced and fast
  await this.ctx.storage.put(`wishlist:${guestId}`, items);
  // Return immediately, output gate ensures write completes
  return { success: true };
}
```

**Detection:**
- "Durable Object is overloaded" errors in logs
- Increasing response times under load
- Durable Object resets without code changes
- `wrangler tail` shows queued requests

**Sources:**
- Cloudflare Durable Objects troubleshooting (HIGH confidence)
- Durable Objects best practices (HIGH confidence)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or user confusion.

### Pitfall 4: Incorrect Authorization Checks

**What goes wrong:**
Guests can view or modify wishlists they shouldn't have access to, breaking the Secret Santa privacy model.

**Why it happens:**
API endpoints don't verify that the requesting guest has permission to access the requested wishlist.

**Consequences:**
- Privacy violations (guests see who has them before reveal)
- Data tampering (guests modify others' wishlists)
- User trust eroded

**Prevention:**

1. **Verify guest membership in party** - Check guest ID exists in party
2. **Enforce access rules** - Only view recipient's wishlist, not arbitrary guests
3. **Validate ownership for edits** - Only edit your own wishlist

```typescript
// ❌ BAD: No access control
async getWishlist(requestingGuestId: string, targetGuestId: string) {
  return await this.ctx.storage.get(`wishlist:${targetGuestId}`);
}

// ✅ GOOD: Proper authorization
async getWishlist(requestingGuestId: string, targetGuestId: string) {
  const party = await this.ctx.storage.get<PartyData>("party");

  // Verify requesting guest is in party
  if (!party.guestLinks.some(([_, id]) => id === requestingGuestId)) {
    throw new Error("Guest not found in party");
  }

  // Verify requesting guest has this target as their assignment
  const requestingGuestName = Object.entries(party.guestLinks)
    .find(([_, id]) => id === requestingGuestId)?.[0];

  if (party.assignments[requestingGuestName] !== targetGuestName) {
    throw new Error("Not authorized to view this wishlist");
  }

  return await this.ctx.storage.get(`wishlist:${targetGuestId}`);
}
```

**Detection:**
- Security audit reveals missing authorization
- Users report seeing unexpected data
- Tests don't cover authorization scenarios

**Sources:**
- OWASP Serverless Top 10 - Broken Access Control (MEDIUM confidence)
- General security best practices (HIGH confidence)

---

### Pitfall 5: Inefficient Storage Operations

**What goes wrong:**
Multiple small storage operations instead of batched operations cause poor performance and increased costs.

**Why it happens:**
Reading/writing each wishlist item separately instead of operating on the entire wishlist at once.

**Consequences:**
- Slower response times (multiple round trips to storage)
- Higher storage operation counts
- Increased likelihood of hitting rate limits

**Prevention:**

```typescript
// ❌ BAD: Multiple operations
async updateWishlistItems(guestId: string, items: string[]) {
  for (const item of items) {
    await this.ctx.storage.put(`wishlist:${guestId}:${item.id}`, item);
  }
}

// ✅ GOOD: Single operation
async updateWishlist(guestId: string, items: string[]) {
  // Store entire wishlist as single value
  await this.ctx.storage.put(`wishlist:${guestId}`, items);
}
```

**Detection:**
- Slow wishlist operations
- High operation counts in logs
- Multiple storage operations per request

**Sources:**
- Durable Objects storage best practices (HIGH confidence)

---

### Pitfall 6: Missing Migration Strategy

**What goes wrong:**
When wishlist feature is added, existing parties don't have wishlist storage initialized, causing errors.

**Why it happens:**
Code assumes wishlist keys exist but doesn't handle missing data gracefully.

**Consequences:**
- Errors when viewing wishlists for existing parties
- Inconsistent behavior between old and new parties
- Data loss if migrations fail

**Prevention:**

1. **Use optional chaining** - Handle missing wishlists gracefully
```typescript
const wishlist = await this.ctx.storage.get(`wishlist:${guestId}`) || "";
```

2. **Version your data** - Add schema version to track changes
```typescript
interface PartyData {
  version: number;  // Increment when schema changes
  // ... other fields
}
```

3. **Migrate in constructor** - Use `blockConcurrencyWhile` for safe migrations
```typescript
constructor(ctx: DurableObjectState, env: Env) {
  super(ctx, env);

  ctx.blockConcurrencyWhile(async () => {
    const version = (await this.ctx.storage.get<number>("version")) || 0;

    if (version < 1) {
      // Add wishlist support
      await this.ctx.storage.put("version", 1);
    }
  });
}
```

**Detection:**
- Errors when accessing wishlists on existing parties
- Tests fail with old data
- Version mismatches between code and data

**Sources:**
- Cloudflare Durable Objects migration best practices (HIGH confidence)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 7: Inadequate Error Messages

**What goes wrong:**
Users see generic errors when wishlist operations fail, making debugging difficult.

**Prevention:**
```typescript
// Return specific, actionable error messages
if (wishlist.length > 500) {
  return new Response(
    JSON.stringify({
      error: "Wishlist too long",
      message: "Your wishlist must be 500 characters or less. Please shorten it.",
      currentLength: wishlist.length,
      maxLength: 500
    }),
    { status: 400 }
  );
}
```

---

### Pitfall 8: Missing Test Coverage for Edge Cases

**What goes wrong:**
Edge cases like empty wishlists, special characters, or concurrent updates aren't tested.

**Prevention:**
- Test empty wishlist updates
- Test maximum length wishlist
- Test special characters and Unicode
- Test concurrent updates (if possible)
- Test missing wishlist (returns empty string, not error)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Data Model Design** | Inefficient storage layout | Store wishlist as single string per guest, not per-item |
| **API Design** | Missing authorization | Enforce "view own + view recipient's" access pattern |
| **Implementation** | Race conditions in updates | Rely on Durable Object input/output gates |
| **Testing** | Missing concurrency tests | Add tests for multiple simultaneous updates |
| **Migration** | Breaking existing parties | Use versioned schema and graceful fallbacks |
| **Deployment** | Overload under traffic | Monitor DO queue depth and response times |

---

## Implementation Checklist

Before deploying wishlist feature:

- [ ] All wishlist operations validate input (type, length, characters)
- [ ] Authorization checks prevent unauthorized access
- [ ] Storage operations use single write per update
- [ ] Error handling is comprehensive and specific
- [ ] Tests cover edge cases (empty, max length, special chars)
- [ ] Tests cover authorization scenarios
- [ ] Existing parties handle missing wishlist data gracefully
- [ ] No external I/O (fetch, KV) in Durable Object methods
- [ ] Monitoring configured for DO overload warnings
- [ ] Migration strategy documented and tested

---

## Sources

| Area | Confidence | Sources |
|------|------------|---------|
| Durable Objects behavior | HIGH | Official Cloudflare documentation, blog posts |
| Race conditions | HIGH | "Durable Objects: Easy, Fast, Correct" (2021) |
| Storage limits | HIGH | Workers KV limits documentation |
| Error handling | HIGH | Durable Objects error handling docs |
| Security practices | MEDIUM | OWASP Serverless Top 10, general best practices |
| Input validation | MEDIUM | OWASP guidelines, web security best practices |

**Confidence notes:**
- Durable Objects internals and behavior: HIGH confidence (official docs)
- Wishlist-specific implementation patterns: MEDIUM confidence (extrapolated from general patterns)
- Security best practices: MEDIUM confidence (general serverless security, not Cloudflare-specific)
