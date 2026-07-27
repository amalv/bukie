import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 320, height: 1000, categoryColumns: 2 },
  { name: "tablet", width: 768, height: 1100, categoryColumns: 3 },
  { name: "desktop", width: 1440, height: 1200, categoryColumns: 5 },
] as const;

test.describe("Explainable homepage discovery", () => {
  test("ships meaningful section content and canonical links in server HTML", async ({
    page,
    request,
  }) => {
    const response = await request.get("/");
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain("Browse by Category");
    expect(html).toContain("New Arrivals");
    expect(html).toContain("All Books");
    expect(html).toContain("not publication recency or popularity");
    expect(html).toContain('href="/?category=classics"');
    expect(html).toContain('href="/?sort=added"');

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const headings = await page
      .locator("h1, h2")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()));
    expect(headings.slice(0, 4)).toEqual([
      "Discover Your Next Great Read",
      "Browse by Category",
      "New Arrivals",
      "All Books",
    ]);
    await expect(
      page.locator('[data-testid="new-arrivals-list"]:not([aria-hidden])'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="book-list"]:not([aria-hidden])'),
    ).toBeVisible();
  });

  test("category discovery continues into the canonical filtered URL", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Classics books" }).click();
    await expect(page).toHaveURL("/?category=classics");
    await expect(page.getByText(/Active filters: Category: Classics/)).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Filtered Books" }),
    ).toBeVisible();
    await expect(page.getByTestId("category-list")).toHaveCount(0);
  });

  test("category links are keyboard reachable with a visible focus indicator", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const categoryLink = page.getByRole("link", { name: "Classics books" });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (
        await categoryLink.evaluate(
          (link) => link === document.activeElement,
        )
      ) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(categoryLink).toBeFocused();
    const focus = await categoryLink.evaluate((link) => {
      const style = getComputedStyle(link);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });
    expect(focus.outlineStyle).not.toBe("none");
    expect(Number.parseFloat(focus.outlineWidth)).toBeGreaterThanOrEqual(2);
  });

  for (const viewport of viewports) {
    test(`${viewport.name} keeps category discovery responsive without overflow`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("link", { name: "Classics books" }),
      ).toBeVisible();
      const categories = page.getByTestId("category-list").getByRole("listitem");
      const firstRowCount = await categories.evaluateAll((nodes) => {
        const firstTop = Math.round(nodes[0].getBoundingClientRect().top);
        return nodes.filter(
          (node) => Math.round(node.getBoundingClientRect().top) === firstTop,
        ).length;
      });
      expect(firstRowCount).toBe(viewport.categoryColumns);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    });
  }

  test("reduced motion removes the introduced category transition", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const categoryLink = page.getByRole("link", { name: "Classics books" });
    await expect(categoryLink).toHaveCSS("transition-duration", "0s");
    await expect(categoryLink).toHaveCSS("transform", "none");
  });

  test("an empty category URL explains the result and offers recovery", async ({
    page,
  }) => {
    await page.goto("/?category=missing-category", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText("0 of 0 books shown")).toBeVisible();
    await expect(
      page.getByText("No books match the active search and filters."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Reset all filters" }).click();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { level: 2, name: "Browse by Category" }),
    ).toBeVisible();
  });
});
