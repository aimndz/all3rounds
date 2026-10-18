import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { invalidatePublicApiCache } from "../public-api-cache";
import { revalidateBattleDiscovery } from "@/lib/revalidation";

vi.mock("../public-api-cache", () => ({
  invalidatePublicApiCache: vi.fn().mockResolvedValue(undefined),
}));

describe("revalidateBattleDiscovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes the chooser, all-Leagues directory, and affected League pages", async () => {
    await revalidateBattleDiscovery(["FlipTop", "motus", "motus"]);

    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/battles");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/api/battles");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/leagues");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/leagues/fliptop");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/leagues/motus");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledTimes(5);
    expect(invalidatePublicApiCache).toHaveBeenCalledWith("/api/battles");
  });
});
