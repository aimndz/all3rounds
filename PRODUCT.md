# All3Rounds Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are Filipino battle rap fans finding remembered lines, revisiting battles, and exploring emcees. Finding lines and revisiting battles are the recommended priorities accepted during initialization.

Community contributors and reviewers help improve transcript accuracy. Administrators manage archive content, feedback, and permissions.

## Product Purpose

Make Filipino battle rap easier to discover, revisit, and understand through searchable transcripts, video-synced lines, battle records, and emcee profiles. Success means helping a fan find a line and reach its battle context, while making community corrections straightforward.

## Positioning

All3Rounds is a community-driven Filipino battle rap archive. Its search and transcription layer connects individual lines to official battle videos, battle history, and emcee records. Current content is centered on FlipTop; expansion to other leagues is an existing stated intention, not a promise of current coverage.

## Operating Context

- Visitors search transcript lines, browse battles and emcees, or use random discovery.
- Battle pages pair transcripts with embedded official YouTube videos. All3Rounds does not host the battle videos.
- Transcripts begin as AI-generated drafts and are improved through community review and corrections.
- Contribution, review, and administration workflows have authentication and permission boundaries that future design work must preserve.
- The application lives in `apps/` relative to the surrounding workspace. Run application commands from this directory.

## Capabilities and Constraints

- Existing surfaces include home, search, battle directories and details, emcee directories and profiles, random discovery, reviews, login, and administration.
- Existing stack: Next.js App Router, React, TypeScript, Tailwind CSS, and Cloudflare Workers via OpenNext. Development uses `pnpm dev`; Cloudflare preview and deployment use the existing `pnpm build:wp` flow.
- Preserve public browsing, cache behavior, moderation permissions, and transcript context.
- Favor low-cost infrastructure, cache reuse, and efficient database queries. Keep hot public paths inexpensive; the repository documents roughly 10 ms of Worker CPU as a design goal, not a measured guarantee.
- Current code uses Cloudflare D1 compatibility clients and Better Auth. Older repository documentation still describes Supabase; consult the current implementation before making data or authentication changes.
- Transcript drafts can contain errors. Do not present unreviewed text as authoritative or erase review/correction status.
- Language/localization priorities, product-specific accessibility requirements, and detailed editorial accuracy standards remain open decisions.

## Brand Commitments

- Use the name All3Rounds and its existing description, "The Filipino Battle Rap Archive."
- Preserve the community-driven purpose and independent educational positioning.
- Existing FAQ states that All3Rounds is not affiliated with, endorsed by, or sponsored by FlipTop or other battle rap leagues.
- Retain existing logos and factual copy unless a later request authorizes changes. Detailed voice rules remain undecided.

## Evidence on Hand

- `README.md`: product overview and feature descriptions; technical details may lag current code.
- `src/components/home/HomeFaq.tsx`: transcript creation, contribution, official video embeds, independence, and intended league expansion.
- `src/app/page.tsx` and `src/app/layout.tsx`: current product description and discoverable workflows.
- `public/logo/`: existing All3Rounds identity assets.
- `AGENTS.md`: operating constraints and change conventions; data/authentication descriptions require checking against current implementation.
- Do not invent archive counts, accuracy rates, testimonials, endorsements, or other proof claims. Use actual data when available.

## Product Principles

1. Help fans move from a remembered line to its source battle and surrounding context.
2. Preserve the connection to official creators through their video embeds.
3. Make transcript accuracy a visible, collaborative process.
4. Keep public discovery accessible and efficient within low-cost infrastructure.
5. Preserve factual content and contribution permissions when improving the interface.
