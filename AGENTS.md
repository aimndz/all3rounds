# All3Rounds Agent Guide

Use this file as the operating manual for changes in `all3rounds`. Keep it high-signal, repo-specific, and cheaper to maintain than debugging production regressions later.

## Project Snapshot

- All3Rounds is a Next.js 16 App Router app for Filipino battle rap transcripts, battles, emcees, search, random discovery, and admin/moderation workflows.
- Deployment target is Cloudflare Workers via OpenNext and Wrangler, not a generic Node host.
- Data is in Supabase.
- A separate Python `transcription-pipeline/` downloads FlipTop videos, runs WhisperX plus pyannote diarization, and loads battle data into Supabase.
- Use the `All3Rounds` name in new docs, comments, and user-facing strings.
- Supporting docs:
  - `docs/cloudflare-runbook.md`
  - `docs/supabase-migration-policy.md`
  - `docs/production-smoke-test.md`

## Core Constraints

- Optimize for free-tier or low-cost infrastructure. Prefer solutions that reduce Cloudflare Worker CPU, Supabase load and egress, Upstash requests, and third-party runtime usage.
- Treat staying under roughly `10 ms` Cloudflare Worker CPU on hot paths as a design goal.
- Prefer cache reuse, ISR, SQL-side filtering/aggregation, and RPCs over repeated request-time JS work.
- Do not add cookie/session work to public paths unless it is required.
- Public behavior, auth boundaries, cache behavior, and moderation permissions are more important than local refactors.

## Important Paths

- `src/app/`: pages, layouts, auth callback, and API routes
- `src/app/api/`: backend surface
- `src/app/battles/[id]/BattleClient.tsx`: transcript-heavy interactive page
- `src/components/`: shared UI and layout
- `src/features/`: feature-local hooks, components, and battle utilities
- `src/lib/`: auth, schemas, Supabase clients, route helpers, rate limiting, types
- `src/stores/`: Zustand auth state
- `supabase/migrations/`: source of truth for new schema changes
- `transcription-pipeline/`: separate Python workflow

Ignore generated or local-only output:

- `.next/`, `.open-next/`, `.wrangler/`, `node_modules/`, `venv/`, `transcription-pipeline/venv/`
- `.env*`, `.dev.vars*`

## Default Workflow

1. Read the nearest implementation first and match existing patterns before introducing new ones.
2. Identify the change type: public page, API route, admin/moderation flow, schema change, Cloudflare/deploy change, or Python pipeline change.
3. Make the smallest change that solves the task without broad cleanup.
4. Check the hot-path implications: cacheability, cookie access, auth/session work, DB round-trips, and JS-side reshaping.
5. Validate only what the change needs, but always validate something meaningful before declaring completion.
6. After a successful change, suggest a commit message.

## Architecture Rules

### Supabase

- Use `createPublicClient()` for cache-friendly server reads that should stay static or ISR-compatible.
- Use `createClient()` for request-scoped server work that depends on anon-key access and cookies.
- Use `createAdminClient()` only on the server after permission checks.
- Never move service-role access into client code.
- For new schema changes, follow `docs/supabase-migration-policy.md`.
- Prefer SQL filtering, aggregation, and RPCs over multiple sequential round-trips or large JS-side reshaping.

### Cloudflare, Caching, And Cost

- `src/middleware.ts` is CPU-sensitive. Public cacheable pages and APIs intentionally bypass Supabase session refresh there.
- Do not add auth/session refresh to public middleware paths without explicit need and a CPU-cost review.
- Preserve or intentionally change `Cache-Control` behavior. Do not drift it accidentally.
- `/battles`, `/emcees`, and detail pages use ISR-style patterns with `revalidate = 86400`.
- Search uses Supabase RPC (`search_fast`) to stay Cloudflare-safe.
- Preview and deploy scripts currently rely on `pnpm build:wp`; keep that flow working if build config changes.
- Cloudflare dashboard settings are not fully represented in the repo. Check `docs/cloudflare-runbook.md` and ask the user when needed.

### Route And Fetch Conventions

- Use `src/lib/api-utils.ts` by default for new route handlers when the route matches its parsing/response helpers.
- Use raw client-side `fetch` by default in hooks and components.
- Use `src/lib/api-client.ts` only when a repeated simple JSON CRUD pattern benefits from it.
- Do not mass-migrate existing fetch patterns during unrelated feature work.

## Change-Type Checklist

- `Docs-only`
  - Update the nearest source-of-truth doc.

- `Public page or server component`
  - Check cacheability, cookie access, and SEO metadata or JSON-LD if indexable.

- `API route`
  - Check auth, permissions, CSRF, `Cache-Control`, and rate limiting.
  - Prefer DB-side shaping over extra JS hot-path work.

- `Supabase schema`
  - Add a new timestamped migration under `supabase/migrations/`.
  - Review app types, routes, tests, and Python pipeline impact in the same change.

- `Cloudflare or deploy`
  - Update `docs/cloudflare-runbook.md`.
  - Check cache rules, auth bypass behavior, and worker CPU implications.

- `Search, list, or battle detail`
  - Treat as CPU-sensitive.
  - Avoid extra DB round-trips, redundant internal fetches, and repeated transforms.

- `Admin or moderation`
  - Preserve permission checks, edit history, review history, and no-store or bypass-cache behavior where expected.

## High-Risk Areas

- `src/middleware.ts`
- `src/app/api/search/route.ts`
- `src/app/api/battles/route.ts`
- `src/app/api/emcees/route.ts`
- `src/app/api/battles/[id]/route.ts`
- `src/app/api/lines/*.ts`
- `src/app/api/suggestions/*.ts`
- `src/app/login/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/layout.tsx` and JSON-LD / metadata-producing files
- `supabase/`
- `transcription-pipeline/`

## Commands

- Install: `pnpm install`
- Dev: `pnpm dev`
- Lint: `pnpm lint src`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- Coverage: `pnpm test:coverage`
- E2E: `pnpm test:e2e`
- Build: `pnpm build`
- Cloudflare build: `pnpm build:cf`
- Cloudflare webpack build: `pnpm build:wp`
- Dev preview: `pnpm preview:dev`
- Prod preview: `pnpm preview:prod`
- Dev deploy: `pnpm deploy:dev`
- Prod deploy: `pnpm deploy:prod`
- Python pipeline deps: `pip install -r requirements.txt`
- Python pipeline tests: `python -m pytest tests`

Known command gotchas:

- The repo is `pnpm`-first, but `playwright.config.ts` still starts the dev server with `npm run dev`.
- ESLint ignores `transcription-pipeline/**` and `supabase/**`.
- There is no checked-in CI workflow; local validation matters.

## Validation And Done When

Minimum expectation for app changes:

- Run the narrowest useful combination of:
  - `pnpm lint src`
  - `pnpm typecheck`
  - `pnpm test` when route, logic, or shared behavior changed

Also check manually when relevant:

- auth and permission boundaries
- CSRF on mutations
- cache headers and cache bypass behavior
- hot-path CPU risk from extra cookie reads, DB calls, or JS transforms
- rollout or backfill impact for schema changes
- required Cloudflare dashboard follow-up for deploy/config changes

Done when:

- the change is scoped to the task
- repo-specific constraints were preserved
- the relevant validation was run or clearly explained if blocked
- cache/auth/security behavior was reviewed where applicable
- any required docs were updated
- a commit message is suggested

## Repo-Specific Gotchas

- `battle_status` in SQL includes `excluded`, but some frontend TS unions still omit it.
- Keep imports pointing at `src/features/battles/utils/participant-grouping.ts`.
- `src/app/admin/layout.tsx` currently gates admin UI with `users:manage`, which effectively means superadmin-only access.
- The repo still contains legacy root-level Supabase SQL files; review them for context, but do not use them for new schema changes.
- Search, battle grouping, and event grouping logic are custom and somewhat duplicated between server routes and client hooks.
- The Python pipeline may not always have pytest installed locally even if tests exist.

## Never Do This

- Never add new schema changes to root-level `supabase/migration_*.sql` files.
- Never add auth/session refresh logic to public middleware paths without explicit need and CPU review.
- Never introduce a new always-on third-party runtime dependency without a strong project reason.
- Never reintroduce duplicate utility locations or parallel helper copies.
- Never mass-migrate raw `fetch`, API helper usage, or response styles during unrelated feature work.
- Never move service-role Supabase access into client code.
- Never weaken CSRF or permission checks on mutation routes for convenience.
- Never assume Cloudflare dashboard settings are fully represented in the repo.

## Commit Convention

- Follow the existing style: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Keep the subject focused on one logical change.
- After every successful code or doc change, suggest a commit message.
- If multiple files changed for the same concept, suggest one commit message covering that concept.
- If multiple files changed for different concepts, suggest a batch of commit messages grouped by concept instead of one broad commit.
- For grouped commit suggestions, also list which files belong to each suggested commit so the split is easy to stage.
- If one file contains mixed concerns, call that out and suggest either a cleanup split or the least-bad grouping.
