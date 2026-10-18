# Production Smoke Test

Run this after deploys that affect routing, auth, caching, search, admin flows, or Supabase schema.

Use the archive glossary in `CONTEXT.md`: a League owns Battles, and an Event is
a named collection of Battles within one League.

## Public Pages

- `/leagues` loads and lists only populated Leagues with their public Battle counts.
- Open a populated League card and confirm `/leagues/{slug}` identifies the
  selected League, shows its Battle count, and renders only that League's
  Battles and Events.
- On the scoped League page, apply at least one search, status, year, sort, or
  pagination filter. Confirm the URL pathname remains `/leagues/{slug}` (with
  any expected filter query parameters) and the resulting Battle list remains
  scoped to that League.
- Open a Battle from the scoped page. Confirm the Battle detail breadcrumb
  links to the selected League, and the deterministic fallback link returns to
  `/leagues/{slug}` when browser history is unavailable.
- Home page loads and search bar submits successfully.
- `/battles` loads, Event groups render, and pagination works.
- A Battle detail page loads transcript lines and YouTube embed behavior still works.
- `/emcees` loads, search/filter/pagination work, and a profile page renders battle history.
- `/random` still returns playable content.

## Search

- `/search?q=loonie` returns results.
- Result cards show line context, emcee data, and battle links.
- Search does not return a 429 or 500 under normal manual use.

## Auth

- Login page starts Google OAuth.
- Auth callback returns to a safe in-site path.
- Logged-in user state appears correctly in the UI.

## Admin And Moderation

- Superadmin can access `/admin`.
- Admin battles list loads.
- A non-destructive admin mutation works if the deployment touched admin APIs.
- Suggestions review list loads.
- Approve or reject flow still works if suggestion code changed.

## Caching And Runtime

- `/leagues` and a populated `/leagues/{slug}` return the expected public page
  after cache fill or an explicit Cloudflare purge. If an older HTML response
  is still cached, allow for the documented one-day Edge TTL before treating
  it as a regression.
- Repeat unauthenticated requests to both League routes and inspect the
  available Cloudflare cache status or response headers. Confirm the expected
  one-day Edge TTL and 24-hour application revalidation behavior.
- Public pages return expected content after deploy, not stale or empty output.
- Admin and auth pages are not cached as public content.
- No obvious middleware regressions or redirect loops.
- Cloudflare Worker logs do not show hot-path CPU spikes or repeated runtime errors.

## Data Integrity

- Battle status changes still persist correctly.
- Emcee and battle detail endpoints still exclude `excluded` content where expected.
- Recent schema changes do not break transcript display or admin review flows.
