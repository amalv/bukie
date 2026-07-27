import { expect, test } from "@playwright/test";

test.describe("Normalized catalog browsing", () => {
  test("homepage exposes only supported discovery sections", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "All" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /New Arrivals/ }),
    ).toBeVisible();
    await expect(page.getByText("Top Rated")).toHaveCount(0);
    await expect(page.getByText("Trending Now")).toHaveCount(0);
  });

  test("search pagination keeps work IDs unique", async ({ page }) => {
    await page.goto("/?q=the", { waitUntil: "domcontentloaded" });
    const links = page.getByRole("link", { name: /view details for/i });
    await expect(links.first()).toBeVisible();
    const before = await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    );
    const more = page.getByRole("button", { name: "Load More Books" });
    if (await more.isVisible()) {
      await more.click();
      await expect
        .poll(async () => links.count())
        .toBeGreaterThan(before.length);
    }
    const after = await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    );
    expect(new Set(after).size).toBe(after.length);
  });

  test("card navigation loads stored normalized detail without ratings", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const first = page
      .getByRole("link", { name: /view details for/i })
      .first();
    const href = await first.getAttribute("href");
    expect(href).toMatch(/^\/books\/[0-9a-f-]{36}$/);
    await first.click();
    await expect(page).toHaveURL(/\/books\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/rating/i)).toHaveCount(0);
  });
});
