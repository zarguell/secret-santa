# Codebase Structure

**Analysis Date:** 2026-01-17

## Directory Layout

```
secret-santa/
├── src/                # TypeScript source code (Cloudflare Worker)
│   ├── index.ts        # Worker entry point with API routes
│   ├── party.ts        # Party Durable Object class
│   ├── types.ts        # TypeScript type definitions
│   ├── utils.ts        # Secret Santa assignment algorithm
│   └── kv.ts          # KV storage helper functions
├── public/            # Static assets served by Worker
│   ├── index.html      # Main party creation page
│   ├── style.css       # Festive styling with animations
│   ├── app.js          # Frontend logic for party creation
│   ├── guest.html      # Guest assignment page
│   └── guest.js       # Guest page logic
├── wrangler.toml      # Cloudflare Workers configuration
├── tsconfig.json      # TypeScript compiler configuration
├── package.json       # Project metadata and scripts
├── renovate.json      # Dependency automation config
└── README.md         # User documentation
```

## Directory Purposes

**src/**

- Purpose: All server-side TypeScript code
- Contains: Worker entry point, Durable Object class, types, utilities
- Key files: `index.ts` (API routes), `party.ts` (Party DO), `utils.ts` (assignment algorithm)
- Subdirectories: None (flat structure)

**public/**

- Purpose: Static assets served by Cloudflare Workers
- Contains: HTML pages, CSS, JavaScript, images
- Key files: `index.html` (main form), `app.js` (form logic), `style.css` (styling)
- Subdirectories: None (flat structure)

## Key File Locations

**Entry Points:**

- `src/index.ts:7` - Cloudflare Worker fetch handler (main entry point)
- `public/index.html` - Main UI for party creation
- `public/guest.html` - Guest assignment UI (also served inline from Worker)

**Configuration:**

- `wrangler.toml` - Cloudflare Workers config (bindings, assets, migrations)
- `tsconfig.json` - TypeScript compiler options
- `renovate.json` - Dependency update automation
- `package.json` - Project metadata and npm scripts

**Core Logic:**

- `src/party.ts` - Party Durable Object (stateful party management)
- `src/utils.ts` - Secret Santa assignment generation algorithm
- `src/kv.ts` - KV storage helpers (guest ID mappings)
- `src/types.ts` - TypeScript interfaces for PartyData, requests, responses

**Testing:**

- None (no test files or test directories)

**Documentation:**

- `README.md` - User-facing documentation with setup instructions

## Naming Conventions

**Files:**

- kebab-case for all TypeScript files (index.ts, party.ts, utils.ts)
- kebab-case for all static assets (index.html, app.js, style.css)
- PascalCase for class names (Party in `src/party.ts`)

**Directories:**

- kebab-case for all directories (src, public)
- Lowercase for all directory names

**Special Patterns:**

- No special patterns (simple flat structure)
- No barrel files (index.ts is entry point, not export barrel)

## Where to Add New Code

**New API Endpoint:**

- Primary code: Add route handler in `src/index.ts` (after existing routes)
- Types: Add request/response interfaces in `src/types.ts`
- Tests: No test framework available (manual testing only)

**New Durable Object Class:**

- Implementation: Create new file `src/{object-name}.ts`
- Export: Export class in `src/index.ts`
- Bindings: Add to `wrangler.toml` under `[[durable_objects.bindings]]`

**New Utility Function:**

- Implementation: Add to `src/utils.ts` or create new file `src/{name}.ts`
- Types: Add relevant interfaces to `src/types.ts`

**New Frontend Feature:**

- HTML: Add to `public/index.html` or create new page
- CSS: Add styles to `public/style.css`
- JavaScript: Add logic to `public/app.js` or create new file
- Assets: Place in `public/` directory

## Special Directories

**public/**

- Purpose: Static assets served by Cloudflare Workers
- Source: Configured in `wrangler.toml` under `[assets]` section
- Committed: Yes (source files, not build output)

---

_Structure analysis: 2026-01-17_
_Update when directory structure changes_
