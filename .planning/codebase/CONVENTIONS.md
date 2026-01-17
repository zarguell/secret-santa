# Coding Conventions

**Analysis Date:** 2026-01-17

## Naming Patterns

**Files:**

- kebab-case for all files (index.ts, party.ts, utils.ts)
- TypeScript files: .ts extension
- JavaScript files: .js extension (frontend)

**Functions:**

- camelCase for all functions (generateAssignments, storeGuestMappings, getGuestMapping)
- Async functions: No special prefix (just `async function`)
- Handlers: Named based on action (createParty, getGuestAssignment)

**Variables:**

- camelCase for variables (guestId, partyData, guestLinks)
- UPPER_SNAKE_CASE not used (no constants defined)
- No underscore prefix (no private members)

**Types:**

- PascalCase for interfaces (PartyData, CreatePartyRequest, AssignmentResponse)
- PascalCase for classes (Party)
- PascalCase for types in interfaces (GuestMapping)

## Code Style

**Formatting:**

- No explicit formatting tool (no .prettierrc, no .eslintrc)
- Indentation: 2 spaces (observed in all files)
- Line length: Not enforced (some lines > 80 chars)
- Quotes: Single quotes for strings in TypeScript, double quotes in HTML/JS
- Semicolons: Required (present on all statements)

**Linting:**

- No linting tool configured
- No ESLint or other linter in dependencies
- TypeScript strict mode enabled in `tsconfig.json`

## Import Organization

**Order:**

1. External Cloudflare imports (`import { DurableObject } from "cloudflare:workers"`)
2. Internal module imports (`import { Party } from "./party"`)
3. Type imports mixed with regular imports (no separation)

**Grouping:**

- Blank lines between import groups
- No explicit sorting (appears alphabetical within groups)

**Path Aliases:**

- None used (all relative imports like `./party`, `./types`)

## Error Handling

**Patterns:**

- Throw Error objects with descriptive messages
- Try/catch at API level (Worker fetch handler in `src/index.ts:26`)
- Return HTTP status codes for errors (400, 404, 500)
- Console.error for logging errors

**Error Types:**

- Throw on invalid input (guest count < 2, duplicate names)
- Throw on not found (party not found, guest link not found)
- Log error before returning 500 response
- No custom Error classes (use built-in Error)

**Frontend Error Handling:**

- Alert user with error message in `public/app.js:24`
- Try/catch for API calls
- Show error on page for guest assignments

## Logging

**Framework:**

- console.error for error logging in `src/index.ts:298`
- No structured logging framework

**Patterns:**

- Log errors at Worker level only
- No logging in Durable Objects or utility functions
- No info/debug logging (only errors)

## Comments

**When to Comment:**

- Minimal comments in code
- Most logic is self-explanatory
- Section headers in `src/index.ts` (e.g., "CREATE PARTY ENDPOINT")

**JSDoc/TSDoc:**

- Not used (no function documentation comments)
- TypeScript interfaces self-documenting

**TODO Comments:**

- None found in codebase

## Function Design

**Size:**

- Most functions under 30 lines
- Assignment algorithm in `src/utils.ts` (34 lines) is longest function
- No functions over 50 lines

**Parameters:**

- Destructured objects for multiple parameters (e.g., `{ guestId, guestName }` in `src/kv.ts:5`)
- Object parameters for complex inputs (CreatePartyRequest in `src/index.ts:29`)
- Max 3 parameters per function (observed in all functions)

**Return Values:**

- Explicit returns (no implicit undefined returns)
- Return objects for complex results (e.g., `{ partyId, guestUrls, guestMappings }` in `src/party.ts:9`)

## Module Design

**Exports:**

- Named exports for functions and classes (export function, export class)
- Default export for Worker in `src/index.ts:7`
- No barrel files (index.ts is entry point, not export barrel)

**Imports:**

- Named imports from modules (import { Party } from "./party")
- Relative imports only (no absolute paths or aliases)

---

_Convention analysis: 2026-01-17_
_Update when patterns change_
