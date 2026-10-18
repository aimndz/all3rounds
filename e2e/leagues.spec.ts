import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectBattleLinksScopedToLeague(
  page: Page,
  links: Locator,
  leagueSlug: string,
) {
  const hrefs = await links.evaluateAll((elements) =>
    elements
      .map((element) => element.getAttribute("href"))
      .filter((href): href is string => Boolean(href)),
  );

  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of new Set(hrefs)) {
    expect(new URL(href, page.url()).pathname.split("/")[2]).toBe(leagueSlug);
  }
}

test.describe("League browsing journey", () => {
  test("keeps the selected League through filtering and Battle return navigation", async ({
    browser,
    page,
  }) => {
    await page.goto("/leagues");

    const leagueLink = page.locator('a[href^="/leagues/"]').first();
    await expect(leagueLink).toBeVisible();

    const leagueHref = await leagueLink.getAttribute("href");
    const leagueName = (await leagueLink.locator("h2").textContent())?.trim();
    expect(leagueHref).toMatch(/^\/leagues\/[^/?]+$/);
    expect(leagueName).toBeTruthy();

    const leagueSlug = leagueHref!.split("/")[2];
    await leagueLink.click();
    await expect(page).toHaveURL(new RegExp(`/leagues/${leagueSlug}$`));
    await expect(
      page.getByRole("heading", { name: `${leagueName} Battles` }),
    ).toBeVisible();

    const battleLinks = page.locator('a[href^="/battles/"]');
    await expect(battleLinks.first()).toBeVisible();
    await expectBattleLinksScopedToLeague(page, battleLinks, leagueSlug);

    const firstBattleLink = battleLinks.first();
    const battleHref = await firstBattleLink.getAttribute("href");
    const battleTitle = await firstBattleLink
      .locator("img")
      .getAttribute("alt");
    expect(battleHref).toMatch(/^\/battles\/[^/]+\/[^/]+$/);
    expect(battleTitle).toBeTruthy();

    const filteredResponse = page.waitForResponse((response) => {
      if (!response.url().includes("/api/battles?")) return false;
      const params = new URL(response.url()).searchParams;
      return (
        params.get("league") === leagueSlug &&
        params.get("q") === battleTitle &&
        response.ok()
      );
    });
    await page
      .getByPlaceholder("Search battles or events...")
      .first()
      .fill(battleTitle!);
    await filteredResponse;
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/leagues/${leagueSlug}`);
    await expect
      .poll(() => new URL(page.url()).searchParams.get("q"))
      .toBe(battleTitle);

    const filteredBattleLinks = page.locator('a[href^="/battles/"]');
    await expect(filteredBattleLinks.first()).toBeVisible();
    await expect(filteredBattleLinks.first().locator("img")).toHaveAttribute(
      "alt",
      battleTitle!,
    );
    await expectBattleLinksScopedToLeague(
      page,
      filteredBattleLinks,
      leagueSlug,
    );

    await firstBattleLink.click();
    await expect(page).toHaveURL(new RegExp("/battles/[^/]+/[^/]+$"));
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb).toBeVisible();
    await expect(
      breadcrumb.getByRole("link", { name: leagueName! }),
    ).toHaveAttribute("href", `/leagues/${leagueSlug}`);

    const directPage = await browser.newPage();
    await directPage.goto(new URL(battleHref!, page.url()).toString());
    await expect(
      directPage.getByRole("button", { name: `Back to ${leagueName}` }),
    ).toBeVisible();
    await directPage
      .getByRole("button", { name: `Back to ${leagueName}` })
      .click();
    await expect(directPage).toHaveURL(new RegExp(`/leagues/${leagueSlug}$`));
    await directPage.close();
  });
});
