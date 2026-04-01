# Supabase Migration Policy

## Source Of Truth

- New schema changes must go in `supabase/migrations/` as a new timestamped migration.
- Root-level files such as `supabase/migration_rbac.sql` and `supabase/migration_suggestions.sql` are legacy reference material, not the preferred place for new schema work.

## How To Add A Schema Change

1. Create a new timestamped SQL file in `supabase/migrations/`.
2. Keep the migration narrowly scoped to one logical database change.
3. Include backfill, index creation, policy updates, and RPC changes in the same migration when they are part of the same rollout.
4. If the migration changes app behavior, update route handlers, TS types, tests, and docs in the same change.

## How To Treat Legacy SQL Files

- Do not delete legacy root-level SQL files casually. They still document historical intent and may help when comparing old schema assumptions.
- Do not add new migrations there.
- If a legacy file contains logic that still matters, port it forward through a new timestamped migration instead of editing the old file in place.

## Review Checklist

- Does the migration preserve existing data or intentionally backfill it
- Does it affect RLS or service-role assumptions
- Does it require updates in Python pipeline code
- Does it require route-level validation or type changes
- Does it need smoke testing on search, battles, emcees, admin, or suggestions flows
