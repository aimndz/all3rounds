import { revalidatePath, revalidateTag } from "next/cache";
import {
  buildPublicApiCacheKey,
  deletePublicApiCache,
} from "@/lib/public-api-cache";

export async function revalidateContributorLeaderboard(request?: Request) {
  revalidateTag("contributors", "max");
  revalidatePath("/contributors");
  revalidatePath("/contributors", "page");
  revalidatePath("/leaderboard");
  revalidatePath("/leaderboard", "page");
  revalidatePath("/api/leaderboard/contributors");

  if (!request) return;

  const cacheKey = buildPublicApiCacheKey(
    request,
    "/api/leaderboard/contributors",
    new URLSearchParams({ limit: "50" }),
  );
  await deletePublicApiCache(cacheKey);
}
