# Meilisearch Search Setup

This guide walks through the All3Rounds search migration from Supabase RPCs to Meilisearch without breaking the existing `/api/search` response shape.

## What This Repo Now Supports

- `/api/search` will use Meilisearch when `MEILISEARCH_HOST` and `MEILISEARCH_SEARCH_KEY` are set
- `/api/search` will fall back to the existing Supabase RPC search when Meilisearch is not configured or temporarily fails
- `pnpm search:index:meili` will build or refresh the `transcript_lines` Meilisearch index from Supabase

That means you can ship the runtime code first, index in the background, and cut over without changing the frontend page.

## 1. Run Meilisearch

Pick one:

- Meilisearch Cloud: create a project and copy its host URL plus API keys
- Self-host locally: run `docker run -it --rm -p 7700:7700 -e MEILI_MASTER_KEY=masterKey getmeili/meilisearch:latest`

If you self-host locally, your host is usually `http://127.0.0.1:7700`.

### Recommended local setup: persistent Docker Compose

This repo now includes [compose.meilisearch.yaml](/E:/dev/all3rounds/apps/compose.meilisearch.yaml), pinned to Meilisearch `v1.41.0`, and it keeps your data in a named Docker volume so stopping Docker Desktop or `pnpm dev` does not wipe the index.

Add a stable master key to your local [`.env`](/E:/dev/all3rounds/apps/.env):

```bash
MEILISEARCH_MASTER_KEY=replace-with-a-long-stable-local-master-key
```

Then start Meilisearch with:

```bash
pnpm meili:up
```

Useful follow-up commands:

```bash
pnpm meili:logs
pnpm meili:down
pnpm meili:restart
```

Why this is better than `docker run --rm`:

- the named Docker volume keeps your `transcript_lines` and `transcript_line_suggestions` indexes after restarts
- keeping the same `MEILISEARCH_MASTER_KEY` means your admin and search keys stay valid
- you only need to rerun `pnpm search:index:meili` when transcript data or index settings change

## 2. Add Environment Variables

Add these to your local `.env` or `.env.local`:

```bash
MEILISEARCH_HOST=http://127.0.0.1:7700
MEILISEARCH_MASTER_KEY=replace-with-a-long-stable-local-master-key
MEILISEARCH_SEARCH_KEY=your-search-key
MEILISEARCH_ADMIN_KEY=your-admin-key
MEILISEARCH_INDEX_UID=transcript_lines
MEILISEARCH_SUGGEST_INDEX_UID=transcript_line_suggestions
```

Notes:

- `MEILISEARCH_SEARCH_KEY` is what the Next.js app uses at request time
- `MEILISEARCH_ADMIN_KEY` is only for indexing and settings updates
- `MEILISEARCH_MASTER_KEY` is only for starting the local self-hosted Meilisearch container and managing keys
- `MEILISEARCH_INDEX_UID` is optional; the repo defaults to `transcript_lines`
- `MEILISEARCH_SUGGEST_INDEX_UID` is optional; the repo defaults to `transcript_line_suggestions`

You already need these Supabase vars for the sync script:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 3. Install Dependencies

If you have not already pulled the latest lockfile changes:

```bash
pnpm install
```

This repo now depends on the official `meilisearch` JavaScript client.

## 4. Build the Search Index

Run the sync script:

```bash
pnpm search:index:meili
```

What it does:

- creates the index if it does not exist
- applies repo-specific settings
- indexes transcript line documents in batches from Supabase
- auto-loads local `.env`, `.env.local`, and `.dev.vars.development` before reading env vars
- stores exact-match filter fields for `emcee:`, `battle:`, and `event:`
- paginates by line `id` instead of large SQL offsets, which is safer for bigger datasets
- generates Meilisearch synonyms from `emcees.name` plus `aka[]`
- adds ranking tie-breakers that prefer higher battle review status and newer events
- stores alias-aware emcee filter fields so merged or renamed emcees still resolve cleanly
- builds a second suggestion index from the most common transcript words and short phrases, ranked by line frequency
- filters out noisy stopword-heavy phrases when building suggestion candidates

Current index settings are tuned for the existing All3Rounds search behavior:

- `searchableAttributes`: transcript content first, then battle and emcee metadata
- `filterableAttributes`: exact-match and alias-aware filter fields used by the query parser
- `sortableAttributes`: `battle_event_date`, `battle_event_timestamp`, `id`
- `rankingRules`: keep Meilisearch defaults, then prefer reviewed and newer battles when relevance ties
- typo tolerance stays on for line text, but is disabled for exact filter fields
- facet search is enabled for future UI filters

## 5. Start the App

Run:

```bash
pnpm dev
```

Then test:

- `/search?q=bars`
- `/search?q=bars+emcee:loonie`
- `/search?q=battle:"Loonie vs Tipsy D"`
- `/search?q=event:"Isabuhay"`

If Meilisearch is configured, the route uses it automatically. If not, the route stays on Supabase RPC search.

## 6. Deploy to Cloudflare

Add these Worker secrets or vars in Cloudflare before relying on Meilisearch in production:

- `MEILISEARCH_HOST`
- `MEILISEARCH_SEARCH_KEY`
- `MEILISEARCH_INDEX_UID`
- `MEILISEARCH_SUGGEST_INDEX_UID`

Keep `MEILISEARCH_ADMIN_KEY` out of the public Worker unless you explicitly need indexing from the deployed runtime. For the current repo flow, that key is intended for local or CI indexing only.

## 7. How Query Behavior Maps

The existing parser still works:

- plain text searches hit transcript line `content`
- `emcee:` matches direct tagged emcees, speaker ids, and indexed aliases from merged names / `aka[]`
- `battle:` matches exact normalized battle titles
- `event:` matches exact normalized event names

The API still enriches hits with:

- battle participants
- previous and next transcript lines
- resolved emcee metadata

That enrichment still comes from Supabase so the frontend contract stays unchanged.

## 8. Recommended Rollout

1. Deploy the code with no Meilisearch env vars set
2. Build and inspect the index locally or in CI
3. Add production `MEILISEARCH_HOST` and `MEILISEARCH_SEARCH_KEY`
4. Smoke test `/api/search` and `/search`
5. Keep the Supabase fallback in place until you trust the Meilisearch setup

## 9. Known Gaps

- The sync script is a batch rebuild, not a live incremental indexer
- Deleted lines are not pruned automatically by the current script
- The indexed search text is intentionally limited to transcript `content` to preserve current behavior

## 10. Useful Reindex Knobs

If you hit a long-running sync or want a gentler batch size:

```bash
MEILISEARCH_SYNC_BATCH_SIZE=250 pnpm search:index:meili
```

If a run stops mid-way and you want to resume after a known line id:

```bash
MEILISEARCH_SYNC_START_AFTER_ID=437000 pnpm search:index:meili
```

Because Meilisearch uses `id` as the primary key, rerunning the script is safe. Existing documents are upserted.

If you change the suggestion-generation logic, rerun a full `pnpm search:index:meili` once so the `transcript_line_suggestions` index is rebuilt with the cleaner candidate set.

If you want live syncing next, the clean follow-up is an admin-only reindex endpoint or a Supabase webhook worker that upserts changed lines into Meilisearch.

