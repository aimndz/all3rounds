# Production Smoke Test

Run this after deploys that affect routing, auth, caching, search, admin flows, or Supabase schema.

## Public Pages

- Home page loads and search bar submits successfully.
- `/battles` loads, event groups render, and pagination works.
- A battle detail page loads transcript lines and YouTube embed behavior still works.
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

- Public pages return expected content after deploy, not stale or empty output.
- Admin and auth pages are not cached as public content.
- No obvious middleware regressions or redirect loops.
- Cloudflare Worker logs do not show hot-path CPU spikes or repeated runtime errors.

## Data Integrity

- Battle status changes still persist correctly.
- Emcee and battle detail endpoints still exclude `excluded` content where expected.
- Recent schema changes do not break transcript display or admin review flows.
