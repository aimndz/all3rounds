# Cloudflare Runbook

This document captures Cloudflare configuration that is not fully represented in source control. Keep it current whenever dashboard settings, bindings, routes, or caching rules change.

## Deployment Model

- Runtime: Cloudflare Workers via OpenNext
- Worker entry: `.open-next/worker.js`
- Config file: `wrangler.json`
- Build path currently used for preview and deploy: `pnpm build:wp`

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
- Any additional Worker secrets: `TODO`

Known development worker secrets observed:

- `DATABASE_URL`
- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_TOKEN`
- `UPSTASH_REDIS_REST_URL`

Known production worker secrets observed:

- `DATABASE_URL`
- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
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

- Not in use
- No Turnstile widgets currently configured

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

## Change Checklist

When changing Cloudflare-related behavior:

- Confirm `wrangler.json` still matches dashboard reality.
- Confirm bindings and secret names are unchanged or documented here.
- Confirm cache behavior for public pages and APIs.
- Confirm auth/admin paths are not accidentally cached.
- Confirm the change does not add unnecessary middleware CPU.
- If any dashboard-only step is required, note it in the task handoff or commit message.
