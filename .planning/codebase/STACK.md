# Technology Stack

**Analysis Date:** 2026-01-17

## Languages

**Primary:**

- TypeScript - All application code (server-side Worker and Durable Objects)

**Secondary:**

- JavaScript - Frontend client-side code in `public/` directory
- HTML - Static markup in `public/` directory
- CSS - Styling in `public/style.css`
- TOML - Configuration in `wrangler.toml`

## Runtime

**Environment:**

- Cloudflare Workers runtime (edge computing platform)
- Compatibility date: 2025-11-21
- Node.js compatibility enabled via `nodejs_compat` flag

**Package Manager:**

- npm (implied by `package.json` and `wrangler` usage)
- Lockfile: None (minimal dependencies, no package-lock.json)

## Frameworks

**Core:**

- Cloudflare Workers - Serverless compute platform
- Durable Objects - Stateful storage for party data
- Workers KV - Key-value storage for guest ID mappings

**Testing:**

- None (no testing framework configured)

**Build/Dev:**

- Wrangler CLI 4.0 - Cloudflare Workers deployment tool
- TypeScript compiler (via tsc, configured in `tsconfig.json`)

## Key Dependencies

**Critical:**

- @cloudflare/workers-types 4.20241112.0 - TypeScript type definitions for Cloudflare Workers API
- wrangler 4.0 - Development and deployment tool for Cloudflare Workers

**Infrastructure:**

- Cloudflare built-in APIs (no npm packages):
  - DurableObject (via `import { DurableObject } from "cloudflare:workers"`)
  - KVNamespace (via Env binding)
  - fetch API (Web standard)
  - crypto.randomUUID() (Web Crypto API)

## Configuration

**Environment:**

- Configuration via `wrangler.toml` file
- Environment bindings defined: `PARTY_DO` (DurableObjectNamespace), `GUEST_KV` (KVNamespace)
- No environment variables required (all config in TOML)

**Build:**

- `tsconfig.json` - TypeScript compiler options (ES2022 target, strict mode)
- `wrangler.toml` - Cloudflare Workers configuration (assets, bindings, migrations)
- `renovate.json` - Dependency update automation configuration

## Platform Requirements

**Development:**

- Node.js 18+ (required for Wrangler CLI)
- Wrangler CLI installed
- Cloudflare account with Workers access
- Any OS with Node.js support

**Production:**

- Cloudflare Workers platform
- No server management required
- Global edge deployment automatically handled by Cloudflare

---

_Stack analysis: 2026-01-17_
_Update after major dependency changes_
