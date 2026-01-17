# Architecture

**Analysis Date:** 2026-01-17

## Pattern Overview

**Overall:** Serverless Edge Application with Durable Objects

**Key Characteristics:**
- Single Cloudflare Worker handling all HTTP requests
- Durable Object per party for stateful storage
- KV namespace for fast guest ID lookups
- Stateless API endpoints (state in DO storage)
- Global edge deployment

## Layers

**API Layer:**
- Purpose: Handle HTTP requests and responses
- Contains: Route handlers in `src/index.ts` (POST /api/parties, GET /api/guest/:id/assignment, GET /guest/:id)
- Depends on: Durable Object layer (PARTY_DO), KV storage (GUEST_KV)
- Used by: Browser clients (HTML/JS in `public/`)

**Business Logic Layer:**
- Purpose: Party creation and Secret Santa assignment logic
- Contains: `Party` Durable Object class in `src/party.ts`, assignment algorithm in `src/utils.ts`
- Depends on: Storage layer (Durable Object SQLite storage)
- Used by: API layer

**Storage Layer:**
- Purpose: Persistent data storage across requests
- Contains: Durable Object SQLite storage (party data), KV namespace (guest mappings)
- Depends on: Cloudflare Workers runtime
- Used by: Business logic layer, API layer

**Utility Layer:**
- Purpose: Shared helpers and type definitions
- Contains: `src/kv.ts` (KV helpers), `src/types.ts` (TypeScript interfaces), `src/utils.ts` (assignment algorithm)
- Depends on: Cloudflare Workers APIs (KVNamespace, crypto)
- Used by: API layer, Business logic layer

## Data Flow

**Party Creation Flow:**

1. User submits form on `public/index.html` → `public/app.js`
2. Frontend sends POST request to `/api/parties` in `src/index.ts:28`
3. API validates input (guest count, uniqueness)
4. API creates new Party Durable Object instance via `env.PARTY_DO.newUniqueId()`
5. Party DO generates Secret Santa assignments via `generateAssignments()` in `src/utils.ts:1`
6. Party DO persists party data to Durable Object storage
7. API stores guest ID mappings in KV namespace via `storeGuestMappings()` in `src/kv.ts:3`
8. API returns partyId and guest URLs to frontend
9. Frontend displays guest links on page

**Guest Assignment View Flow:**

1. Guest opens link (e.g., `/guest/uuid`) → `src/index.ts:158`
2. API validates guest ID format (36-char UUID)
3. API looks up guest mapping in KV via `getGuestMapping()` in `src/kv.ts:17`
4. API retrieves Party Durable Object using `env.PARTY_DO.idFromString()`
5. Party DO fetches assignment from storage in `src/party.ts:57`
6. API returns guest name, recipient, and party details as JSON
7. Frontend (inline HTML in `src/index.ts:181`) displays assignment to guest

**State Management:**
- Party data: Stored in Durable Object SQLite storage (one DO per party)
- Guest mappings: Stored in KV namespace for fast lookup (guest:uuid → partyId)
- No in-memory state between requests (stateless Worker)
- Each Durable Object maintains state in memory for the party's lifetime

## Key Abstractions

**Durable Object (Party):**
- Purpose: Encapsulate party state and assignment logic
- Location: `src/party.ts:5`
- Methods: `createParty()`, `getGuestAssignment()`, `assignGift()`, `getParty()`
- Pattern: One DO instance per party, accessed via unique ID

**API Routes:**
- Purpose: HTTP request/response handling
- Location: `src/index.ts:7` (exported Worker fetch handler)
- Pattern: If/else chain matching pathname + method
- Examples: `/api/parties` (POST), `/api/guest/:id/assignment` (GET)

**Assignment Generator:**
- Purpose: Random Secret Santa pairings without self-assignment
- Location: `src/utils.ts:1`
- Pattern: Fisher-Yates shuffle + neighbor swap to prevent self-assignment
- Returns: `Record<string, string>` mapping guest → recipient

**KV Storage Helpers:**
- Purpose: Guest ID to party ID lookups
- Location: `src/kv.ts`
- Functions: `storeGuestMappings()`, `getGuestMapping()`
- Pattern: Key format `guest:{uuid}` → JSON `{ partyId, guestName }`

## Entry Points

**Worker Entry:**
- Location: `src/index.ts:7` (exported default object with `fetch` method)
- Triggers: HTTP requests to deployed Worker
- Responsibilities: Route requests, validate input, call DOs/KV, return responses

**Durable Object Entry:**
- Location: `src/party.ts:5` (exported Party class)
- Triggers: When Party DO is accessed via `env.PARTY_DO.get(id)`
- Responsibilities: Manage party state, handle storage operations

**Frontend Entry:**
- Location: `public/index.html` (main party creation page), `public/guest.html` (guest assignment page)
- Triggers: Browser navigation to root or `/guest/:uuid` routes
- Responsibilities: User interface, API calls, display results

## Error Handling

**Strategy:** Try/catch at Worker level, return appropriate HTTP status codes

**Patterns:**
- API validation errors: Return 400 with JSON error message (e.g., "Party name and at least 2 guests required" in `src/index.ts:33`)
- Not found errors: Return 404 (e.g., "Guest link not found" in `src/index.ts:130`)
- DO errors: Throw Error, caught by try/catch, return 500 with error message in `src/index.ts:148`
- Frontend errors: Alert user with error message in `public/app.js:24`

## Cross-Cutting Concerns

**Logging:**
- Console.error for Worker errors in `src/index.ts:298`
- No structured logging

**Validation:**
- Input validation at API boundary (guest count, uniqueness in `src/index.ts:32`)
- Frontend validation in `public/app.js:22` (duplicate check)
- Guest ID format validation (36-char UUID check in `src/index.ts:120`)

**CORS:**
- CORS headers added to all responses in `src/index.ts:16`
- OPTIONS method handled for preflight requests in `src/index.ts:22`

---

*Architecture analysis: 2026-01-17*
*Update when major patterns change*
