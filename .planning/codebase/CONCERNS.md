# Codebase Concerns

**Analysis Date:** 2026-01-17

## Tech Debt

**Inline HTML in Worker code:**

- Issue: Guest page HTML is hardcoded as template string in `src/index.ts:181`
- Why: Convenience for serving guest page without separate static file
- Impact: Difficult to maintain HTML/JS mixed in TypeScript, no syntax highlighting for HTML in .ts file
- Fix approach: Move guest page HTML to `public/guest.html` and serve it as static asset (file already exists at `public/guest.html`)

**Manual CORS headers:**

- Issue: CORS headers defined manually in every response in `src/index.ts:16`
- Why: Simplicity for small codebase
- Impact: Easy to miss CORS in new endpoints, code duplication
- Fix approach: Create helper function `corsHeaders()` to reuse across all responses

**Duplicate validation logic:**

- Issue: Guest validation duplicated between frontend (`public/app.js:22`) and backend (`src/index.ts:32`)
- Why: Separate validation layers for UX and security
- Impact: Validation rules must be kept in sync, potential for mismatch
- Fix approach: Consider backend-only validation to reduce duplication, or extract shared validation schema

## Known Bugs

**None**

- No known bugs reported in codebase
- TODO/FIXME comments: None found

## Security Considerations

**Guest links not truly secret:**

- Risk: UUIDs are unguessable but discoverable if KV ID is leaked
- Current mitigation: 36-character UUIDs provide ~122 bits of entropy
- Recommendations: Add rate limiting to prevent enumeration, consider adding optional password protection

**No authentication:**

- Risk: Anyone with guest link can view assignment, no revocation mechanism
- Current mitigation: Links are unguessable UUIDs
- Recommendations: Add ability to revoke/regenerate guest links, implement admin auth for party management

**KV namespace ID in version control:**

- Risk: `wrangler.toml:14` contains actual KV namespace ID (public but exposes infra details)
- Current mitigation: KV namespace IDs are public identifiers, not secrets
- Recommendations: Consider using environment variable for KV ID if rotating namespaces in future

**No rate limiting:**

- Risk: No protection against abuse (mass party creation, enumeration attacks)
- Current mitigation: None
- Recommendations: Implement rate limiting using Cloudflare's native API or Workers analytics-based limiting

**No input sanitization beyond validation:**

- Risk: Input validated but not sanitized before storage (XSS possible if guest names are redisplayed)
- Current mitigation: Guest names displayed in guest page but escaped via textContent in inline JS (`src/index.ts:267`)
- Recommendations: Add explicit HTML escaping utility function, sanitize all user input before storage

## Performance Bottlenecks

**None**

- Simple operations (no N+1 queries, no heavy computation)
- Assignment algorithm O(n) complexity with small n (max 50 guests)
- KV lookups are fast (single-key reads)

## Fragile Areas

**Guest page HTML in Worker:**

- File: `src/index.ts:181` (82 lines of HTML template string)
- Why fragile: No syntax highlighting, easy to introduce HTML errors, hard to maintain
- Common failures: Malformed HTML, unclosed tags, missing escaping
- Safe modification: Move HTML to `public/guest.html`, serve as static asset
- Test coverage: None (manual testing only)

**Error handling inconsistency:**

- File: `src/index.ts:297` (top-level try/catch), `src/party.ts:65` (DO error handling)
- Why fragile: Some errors throw, some return null, inconsistent patterns
- Common failures: Frontend may not display all error types correctly
- Safe modification: Standardize error handling (always throw with Error object, catch at boundary)
- Test coverage: No error path tests

**No automated tests:**

- File: Entire codebase
- Why fragile: Algorithm changes, refactorings, bug fixes can break functionality
- Common failures: Assignment algorithm edge cases, KV storage issues, validation logic
- Safe modification: Add test framework (Vitest), test critical paths first
- Test coverage: 0% (no tests at all)

## Scaling Limits

**Cloudflare Workers Free Tier:**

- Current capacity: 100,000 requests/day free, 10ms CPU time per request
- Limit: ~50 guests maximum (enforced in code, not platform limit)
- Symptoms at limit: Worker errors, rate limiting if exceeding daily quota
- Scaling path: Upgrade to Workers Paid ($5/mo) for higher limits

**Durable Objects Limits:**

- Current capacity: SQLite-based DOs with 128MB storage per DO
- Limit: Party data is small (<1KB per party), practical limit ~128,000 parties per DO
- Symptoms at limit: Storage write failures
- Scaling path: Each party gets its own DO (automatic), no scaling issue

**KV Limits:**

- Current capacity: 1GB storage, 1000 reads/second per namespace
- Limit: ~128,000 guest mappings per KV namespace
- Symptoms at limit: KV write/read failures, rate limiting
- Scaling path: Multiple KV namespaces (not needed for current scale)

## Dependencies at Risk

**None**

- All dependencies minimal and maintained (@cloudflare/workers-types, wrangler)
- No deprecated packages
- Renovate bot configured for automated updates

## Missing Critical Features

**Party editing/deletion:**

- Problem: Once created, parties cannot be modified or deleted
- Current workaround: Create new party with corrections
- Blocks: Cannot fix typos, remove guests, update budget/criteria
- Implementation complexity: Low (add PUT/DELETE endpoints to Party DO)

**Email notifications:**

- Problem: No email delivery of guest assignments
- Current workaround: Manual link sharing
- Blocks: Automatic distribution, reminders
- Implementation complexity: Medium (add email service integration like SendGrid)

**Exclusion rules:**

- Problem: Cannot specify "person X shouldn't buy for person Y"
- Current workaround: Regenerate until satisfied (manual)
- Blocks: Families/partners who shouldn't exchange gifts
- Implementation complexity: Medium (modify assignment algorithm with constraints)

**Admin dashboard:**

- Problem: No admin view to see all assignments for a party
- Current workaround: Check each guest link individually
- Blocks: Verification that all guests received links, overview view
- Implementation complexity: Medium (add admin endpoint with auth)

## Test Coverage Gaps

**No automated tests at all:**

- What's not tested: Assignment algorithm (`src/utils.ts`), KV helpers (`src/kv.ts`), Party DO (`src/party.ts`), API routes (`src/index.ts`), Frontend validation (`public/app.js`)
- Risk: Any code change can break functionality silently
- Priority: High
- Difficulty to test: Medium (need to set up test framework, mock Workers runtime)

**Assignment algorithm edge cases:**

- What's not tested: 2 guests (minimum), 50 guests (maximum), all identical names (blocked by validation), empty strings
- Risk: Algorithm may fail or produce incorrect assignments for edge cases
- Priority: High
- Difficulty to test: Low (pure function, easy to test)

**KV storage failures:**

- What's not tested: KV get returns null (not found), KV put fails (quota exceeded), concurrent KV writes
- Risk: Guest links may not work, no error recovery
- Priority: Medium
- Difficulty to test: Medium (need to mock KV namespace)

**Durable Object persistence:**

- What's not tested: Party state survives DO restart, multiple concurrent requests to same DO, storage capacity limits
- Risk: Data loss, race conditions
- Priority: Medium
- Difficulty to test: High (need Workers runtime emulation)

**API validation:**

- What's not tested: Invalid guest count (0, 1, 51), duplicate guest names, missing required fields, malformed JSON
- Risk: API may return 500 instead of 400, validation bypass possible
- Priority: High
- Difficulty to test: Low (simple request/response testing)

**Frontend validation:**

- What's not tested: Form submission with invalid data, API error handling, clipboard copy failures
- Risk: Poor UX, unexpected errors shown to users
- Priority: Low
- Difficulty to test: Medium (need DOM testing framework like Playwright)

---

_Concerns audit: 2026-01-17_
_Update as issues are fixed or new ones discovered_
