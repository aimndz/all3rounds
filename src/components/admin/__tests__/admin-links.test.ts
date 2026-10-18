import { describe, expect, it } from "vitest";
import { adminLinks } from "../admin-links";

describe("admin navigation", () => {
  it("keeps the Battles management link", () => {
    expect(adminLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/admin/battles", label: "Battles" }),
      ]),
    );
  });
});
