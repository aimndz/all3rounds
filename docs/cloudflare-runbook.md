# Cloudflare Runbook

This document captures Cloudflare configuration that is not fully represented in source control. Keep it current whenever dashboard settings, bindings, routes, or caching rules change.

## Deployment Model

- Runtime: Cloudflare Workers via OpenNext
- Worker entry: `.open-next/worker.js`
- Config file: `wrangler.json`
- Build path currently used for preview and deploy: `pnpm build:wp`

## D1 Migrations And Recovery

Run the commands below from `apps/`. D1 schema history lives in `migrations/`,
and Wrangler records successful filenames in each database's `d1_migrations` table.

### Build-local Versus Remote Dev

`pnpm build:wp` applies migrations with `--local` before Next/OpenNext compilation.
That prepares the build machine's local D1 database; it does not migrate the
deployed Worker database. A migration error during this step does not establish
that remote dev D1 is broken. Clearing build caches cannot fix conflicting SQL.

Remote development uses `all3rounds-dev` in the `development_remote` environment.
Inspect and migrate it explicitly, independently of a successful local build.
Production is a separate database and is outside this dev recovery procedure.

### Duplicate Annotation Columns In 0010

`0009_annotations.sql` already creates `start_text_offset`, `end_text_offset`, and
`selected_text`. The original `0010_annotation_text_targets.sql` tried to add the
same columns again, causing `duplicate column name: start_text_offset` even on a
fresh database. The repaired `0010` selects those columns with `LIMIT 0`: it
validates their presence without changing data. The migration name and `0009`
remain unchanged, so databases stopped after `0009` can resume normally.

See [the repair decision](adr/0001-validate-existing-annotation-text-targets.md).
Wrangler retains earlier successful migrations when a later migration fails;
see [Cloudflare's migration behavior](https://developers.cloudflare.com/d1/wrangler-commands/#d1-migrations-apply).

1. Check out the corrected commit and verify locally:

   ```sh
   pnpm exec vitest run src/db/__tests__/migrations.test.ts
   pnpm typecheck
   pnpm build:wp
   ```

   The integration tests use temporary local databases, not the app's `.wrangler`
   state or remote bindings. Retry the dev dashboard build with the corrected
   commit. Do not reset a database or remove its migration history.

2. Before any remote dev change, inspect schema and history:

   ```sh
   pnpm exec wrangler d1 execute all3rounds-dev --env development_remote --remote --command "PRAGMA table_info(annotation_line_ranges); SELECT name FROM d1_migrations ORDER BY id;" --json
   pnpm exec wrangler d1 migrations list all3rounds-dev --env development_remote --remote
   ```

   Confirm `0009` is recorded and the three target columns exist, with types
   `INTEGER`, `INTEGER`, and `TEXT` respectively. If the schema or ledger is
   missing or inconsistent, stop and investigate; do not mark migrations applied
   manually. If `0010` is already recorded, do not replay it. Any other pending
   changes need their own rollout review.

3. If `0010` is pending and the schema matches, review the pending list before
   running `pnpm db:migrate:dev`. This command applies **all** pending migrations,
   not only `0010`; this repair's regression coverage includes `0011` and `0012`.
   Capture a dev backup before applying:

   ```sh
   pnpm exec wrangler d1 export all3rounds-dev --env development_remote --remote --output .wrangler/dev-before-0010.sql
   pnpm db:migrate:dev
   ```

   Keep that backup local and out of commits. Recheck the migration list and
   schema afterward. A second apply should report no migrations to apply.

4. After the dev Worker rebuild succeeds, verify an existing annotation still
   displays its selected text and create a test annotation targeting selected
   transcript text. Confirm its selection survives a page reload.

If `0010` now reports a missing column, its validation is exposing a schema that
does not match this repository's `0009`. Stop for explicit schema reconciliation;
do not suppress the failure or delete existing data.

## Workers And Environments

Known Worker names from `wrangler.json`:

- Production: `all3rounds`
- Development: `all3rounds-dev`

Known vars from `wrangler.json`:

- `APP_ENV=production` for production
- `APP_ENV=development` for development

Known bindings from `wrangler.json`:

- `ASSETS`: static asset directory `.open-next/assets`
- `IMAGES`: Cloudflare Images binding in both `development` and `production`
- `NEXT_INC_CACHE_R2_BUCKET`: OpenNext incremental cache bucket
  - Production bucket: `all3rounds-opennext-cache`
  - Development bucket: `all3rounds-dev-opennext-cache`
- `WORKER_SELF_REFERENCE`: self-service binding used by OpenNext cache revalidation
- `NEXT_CACHE_DO_QUEUE`: Durable Object queue used by OpenNext time-based revalidation

## Dashboard-Only Settings To Record

Fill these in from the Cloudflare dashboard. Do not guess.

### Routes

Production routes:

- `*all3rounds.com/sitemap.xml`
- `*all3rounds.com/robots.txt`
- `*all3rounds.com/favicon.ico`
- `*all3rounds.com/manifest.webmanifest`

Development routes:

- No custom zone routes shown for `all3rounds-dev`

### Custom Domains

Production domains:

- `all3rounds.com`
- `www.all3rounds.com`

Preview or staging domains:

- Production workers.dev hostname is configured
- Production preview URLs are enabled
- Development workers.dev hostname is configured
- Development preview URLs are enabled

### Secrets

Record names only, never values.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_GA_ID`
- `TURNSTILE_SECRET_KEY`
- Any additional Worker secrets: `TODO`

Known development worker secrets observed:

- `DATABASE_URL`
- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY`
- `UPSTASH_REDIS_REST_TOKEN`
- `UPSTASH_REDIS_REST_URL`

Known production worker secrets observed:

- `DATABASE_URL`
- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY`
- `UPSTASH_REDIS_REST_TOKEN`
- `UPSTASH_REDIS_REST_URL`

### Images

- Hosted Images storage:
  - Not available on current plan
  - Current usage shown: `0` images delivered
- Image transformations:
  - Zone `all3rounds.com`: `Disabled`
- Implication:
  - The worker has an `IMAGES` binding configured, but Cloudflare Images hosted storage is not currently in active use and image transformations are disabled for the zone.

### Cache Rules

Dashboard cache rules currently configured:

1. `Admin & Private Data (Bypass)`
   Match:
   `URI Path contains /admin`
   `URI Path contains /api/admin`
   `URI Path contains /api/me`
   `URI Path starts with /reviews`
   `URI Path starts with /api/suggestions`
   Action: `Bypass cache`

2. `Authentication (Bypass)`
   Match:
   `URI Path contains /auth`
   `URI Path contains /login`
   Action: `Bypass cache`

3. `Live Processing (Bypass)`
   Match:
   `URI Path contains /api/pool-status`
   `URI Path contains /api/battles/batch-status`
   Action: `Bypass cache`

4. `Battle Event Mutations (Bypass)`
   Match:
   `URI Path contains /api/battles/event-`
   Action: `Bypass cache`

5. `Search & Rate Limiter`
   Match:
   `URI Path starts with /api/search`
   Action: `Eligible for cache, Edge TTL`

6. `The Home Page (1 Hour)`
   Match:
   `URI Path equals /`
   Action: `Eligible for cache, Edge TTL`

7. `Static Legal Pages (1 Month)`
   Match:
   `URI Path is in /privacy-policy, /terms-of-service`
   Action: `Eligible for cache, Edge TTL`

8. `Main Lists (1 Day)`
   Match:
   `URI Path is in /battles, /emcees`
   `URI Path starts with /battles`
   `URI Path starts with /emcees`
   Action: `Eligible for cache, Edge TTL`

9. `Battles/Emcee Data (1 Hour)`
   Match:
   `URI Path starts with /api/battles`
   `URI Path starts with /api/emcees`
   Action: `Eligible for cache, Edge TTL`

10. `The Random Hit (1 Minute)`
    Match:
    `URI Path contains /api/lines/random`
    Action: `Eligible for cache, Edge TTL`

Cache response rules:

- None currently configured

Bypass rules for auth/admin/API paths are covered by rules 1 through 4 above.

OpenNext cache implementation:

- `open-next.config.ts` uses R2 incremental cache with `long-lived` regional cache.
- Deploy and preview scripts use `opennextjs-cloudflare deploy/preview` so the OpenNext cache can be populated during deployment.
- Before deploying a new environment, ensure the matching R2 bucket exists:
  - `wrangler r2 bucket create all3rounds-opennext-cache`
  - `wrangler r2 bucket create all3rounds-dev-opennext-cache`
- Authenticated requests should not receive public page cache headers from middleware.
- `/api/battles` and `/api/emcees` use Workers Cache API response caching for public, unauthenticated GET requests.
  - Check `X-A3R-Cache: MISS` on first regional request and `X-A3R-Cache: HIT` on subsequent matching requests.
  - Requests with `Cookie` or `Authorization` bypass this cache.

### Security

- Security settings toggled on:
  - New application security dashboard
  - Bot fight mode
  - Browser integrity check
  - Cloudflare managed ruleset
  - Continuous script monitoring
  - Email Address Obfuscation
  - Endpoint discovery
  - Hotlink Protection
  - HTTP DDoS attack protection
  - Network-layer DDoS attack protection
  - Replace insecure JavaScript libraries
  - Schema validation
  - SSL/TLS DDoS attack protection

WAF rules:

- Custom rule `Block bot scans`
  - Action: `Block`
  - Full expression:
    - `(http.request.uri.path contains ".php") or (http.request.uri.path contains ".env") or (http.request.uri.path contains "wp-") or (http.request.uri.path contains ".git") or (http.request.uri.path contains ".sh") or (http.request.uri.path contains "pentaho") or (http.request.uri.path contains ".jsp") or (http.request.uri.path contains "artemis") or (http.request.uri.path contains "SystemManager")`

Bot fight or bot management settings:

- `Bot fight mode` enabled

Rate limiting rules outside the app:

- Rule `All3Rounds Rate limit`
  - Match expression: `(http.request.uri.path wildcard r"/api/*")`
  - Counting characteristic: `IP`
  - Action: `Block`
  - Placement order: `First`
  - Exact threshold and duration are intentionally omitted from the committed runbook

Turnstile usage:

- Used by the public feedback dialog.
- Widget mode: Managed
- Client env var: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- Worker secret: `TURNSTILE_SECRET_KEY`
- Required CSP allowlist: `https://challenges.cloudflare.com` in `script-src`, `frame-src`, and `connect-src`

### Observability

- Worker logs destination:
  - Viewed in Cloudflare dashboard `Workers & Pages` / `Observability`
  - Current event stream includes invocation logs and request URLs
- Cloudflare Analytics / Insights enabled: yes in app and Wrangler
- Alerting or error tracking:
  - No dedicated alerting system confirmed
  - No external error tracking confirmed

## Repo-Backed Performance Constraints

- Optimize hot paths for Cloudflare Worker free-tier CPU constraints.
- Treat middleware, search, battle detail routes, and list APIs as CPU-sensitive.
- Avoid adding cookie reads or auth/session refresh to public paths unless necessary.
- Favor cache headers, ISR, SQL-side filtering, and RPCs over extra request-time JS work.
- Workers KV search candidate caching has been removed to avoid high-cardinality write pressure on the free KV tier.

## Change Checklist

When changing Cloudflare-related behavior:

- Confirm `wrangler.json` still matches dashboard reality.
- Confirm bindings and secret names are unchanged or documented here.
- Confirm cache behavior for public pages and APIs.
- Confirm auth/admin paths are not accidentally cached.
- Confirm the change does not add unnecessary middleware CPU.
- If any dashboard-only step is required, note it in the task handoff or commit message.
