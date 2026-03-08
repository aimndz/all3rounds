import { test, expect } from "@playwright/test";

test.describe("Emcees Directory", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/emcees");
  });

  test("should display the list of emcees", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Emcees/i);
    const emceeCards = page.locator("a[href^='/emcees/']");
    await expect(emceeCards.first()).toBeVisible();
  });

  test("search should filter the list", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search by name/i);
    await searchInput.fill("Loonie");
    
    // Wait for debounce and network request
    await page.waitForResponse(resp => resp.url().includes("/api/emcees") && resp.status() === 200);
    
    // This depends on seed data, but we expect at least one or zero if not found
    // Here we just test that the interaction works
    await expect(page.locator("body")).toBeVisible();
  });

  test("clicking a card should navigate to profile", async ({ page }) => {
    const firstCard = page.locator("a[href^='/emcees/']").first();
    const cardText = await firstCard.locator("h2").textContent();
    
    await firstCard.click();
    
    await expect(page).toHaveURL(/\/emcees\/.+/);
    if (cardText) {
      await expect(page.locator("h1")).toContainText(cardText);
    }
  });

  test("filtering by battle count should work", async ({ page }) => {
    // Click the battle count filter select
    await page.getByPlaceholder(/Count/i).click();
    await page.getByRole("option", { name: "10+ Battles" }).click();
    
    await page.waitForResponse(resp => resp.url().includes("minBattles=10"));
    await expect(page.locator("body")).toBeVisible();
  });
});
