# League-first public browsing

**Status:** accepted

All3Rounds uses `/leagues` and `/leagues/{slug}` as the public browsing hierarchy because a Battle belongs to one League and visitors need a stable way to choose that context. The existing `/battles` directory remains an all-Leagues compatibility entry point, filtered `/battles?league={slug}` URLs permanently redirect to the matching League route while preserving supported filters, `/battles/{uuid}` legacy redirects remain valid, and canonical Battle detail URLs stay at `/battles/{league}/{battleSlug}`.

League presentation metadata is kept in the typed application registry instead of a new League table. This keeps the initial catalog small, makes ingestion reject content that has no known public metadata, and avoids a migration/admin workflow; the tradeoff is that adding or changing a League requires a code change and deployment.
