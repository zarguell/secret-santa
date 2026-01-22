# External Integrations

**Analysis Date:** 2026-01-17

## APIs & External Services

**None**

- No external API integrations
- No third-party services used
- All functionality runs on Cloudflare platform

## Data Storage

**Durable Objects (SQLite-based):**

- Cloudflare Durable Objects - Party data storage
  - Connection: Via PARTY_DO binding in `wrangler.toml:7`
  - Client: Native DurableObject API (no ORM)
  - Migrations: `new_sqlite_classes: ["Party"]` in `wrangler.toml:21`
  - Storage location: `src/party.ts` (Party class with `this.ctx.storage`)

**Workers KV:**

- Cloudflare Workers KV - Guest ID to party ID mappings
  - Connection: Via GUEST_KV binding in `wrangler.toml:13`
  - Client: Native KVNamespace API (no ORM)
  - Migrations: None (KV schemaless)
  - Storage location: `src/kv.ts` (KV helper functions)

**File Storage:**

- None (static assets served from `public/` directory via Workers Assets)

**Caching:**

- None (no caching layer beyond Workers edge caching)

## Authentication & Identity

**Auth Provider:**

- None (no user authentication)
- Party access via unguessable UUID links (security through obscurity)

**OAuth Integrations:**

- None

## Monitoring & Observability

**Error Tracking:**

- None (no Sentry, no error tracking service)
- Console.error only (local logs via `wrangler tail`)

**Analytics:**

- None (no analytics service)

**Logs:**

- Cloudflare Workers logs - stdout/stderr via `wrangler tail` command
- Integration: Built-in Workers logging
  - No log aggregation service
  - Logs available in real-time via `wrangler tail`
  - No persistent log storage

## CI/CD & Deployment

**Hosting:**

- Cloudflare Workers - Serverless edge deployment
  - Deployment: Manual via `wrangler deploy` command
  - Environment vars: None (all config in `wrangler.toml`)
  - No automatic deployment (manual trigger only)

**CI Pipeline:**

- None (no GitHub Actions, no CI/CD automation)
- Renovate bot configured for dependency updates (via `renovate.json`)

## Environment Configuration

**Development:**

- Required env bindings: PARTY_DO, GUEST_KV (configured in `wrangler.toml`)
- Secrets location: `wrangler.toml` (KV namespace ID is public, not secret)
- Mock/stub services: `wrangler dev` provides local Workers runtime with DO/KV emulation

**Staging:**

- No staging environment (single production deployment)

**Production:**

- Secrets management: `wrangler.toml` (KV ID in version control)
- Failover/redundancy: Handled automatically by Cloudflare Workers global distribution

## Webhooks & Callbacks

**Incoming:**

- None

**Outgoing:**

- None

---

_Integration audit: 2026-01-17_
_Update when adding/removing external services_

**Note:** This codebase is self-contained on Cloudflare platform with no external service dependencies. All storage (Durable Objects, KV) and compute (Workers) run within Cloudflare's infrastructure.
