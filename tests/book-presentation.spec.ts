import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, columns: 2, compactCoverWidth: 88 },
  { width: 768, columns: 3, compactCoverWidth: 96 },
  { width: 1024, columns: 4, compactCoverWidth: 96 },
  { width: 1440, columns: 6, compactCoverWidth: 96 },
] as const;

test.describe("Book presentation", () => {
  test("grid cards match the selected responsive density without overflow", async ({
    page,
  }) => {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: 1000 });
      await page.goto("/?section=all", { waitUntil: "domcontentloaded" });

      const list = page.locator(
        '[data-testid="book-list"][data-presentation="grid"]',
      );
      await expect(list).toBeVisible();

      const items = list.getByRole("listitem");
      await expect(items.first()).toBeVisible();
      const firstRowCount = await items.evaluateAll((nodes) => {
        const firstTop = Math.round(nodes[0].getBoundingClientRect().top);
        return nodes.filter(
          (node) => Math.round(node.getBoundingClientRect().top) === firstTop,
        ).length;
      });

      expect(firstRowCount).toBe(viewport.columns);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);

      const cards = items.locator("article");
      await expect(cards.first()).toBeVisible();
      expect(
        await cards.evaluateAll((nodes) =>
          nodes.every(
            (node) =>
              node.querySelectorAll(
                'a[aria-label^="View details for"]',
              ).length === 1,
          ),
        ),
      ).toBe(true);
    }
  });

  test("search uses one-column compact rows at every selected viewport", async ({
    page,
  }) => {
    await page.goto("/?section=all", { waitUntil: "domcontentloaded" });
    const accessibleName = await page
      .getByRole("link", { name: /view details for/i })
      .first()
      .getAttribute("aria-label");
    const title = accessibleName?.replace(/^View details for /, "");
    expect(title).toBeTruthy();

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: 1000 });
      await page.goto(`/?q=${encodeURIComponent(title ?? "")}`, {
        waitUntil: "domcontentloaded",
      });

      const list = page.locator(
        '[data-testid="book-list"][data-presentation="compact"]',
      );
      await expect(list).toBeVisible();
      const cards = list.locator('article[data-presentation="compact"]');
      await expect(cards.first()).toBeVisible();

      const tops = await cards.evaluateAll((nodes) =>
        nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
      );
      expect(new Set(tops).size).toBe(tops.length);

      const cover = cards.first().locator(":scope > div").first();
      await expect(cover).toHaveCSS(
        "width",
        `${viewport.compactCoverWidth}px`,
      );
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
  });

  test("keyboard focus outlines the full card and reduced motion removes movement", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.goto("/?section=all", { waitUntil: "domcontentloaded" });

    const firstLink = page
      .getByRole("link", { name: /view details for/i })
      .first();
    await expect(firstLink).toBeVisible();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (await firstLink.evaluate((link) => link === document.activeElement)) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(firstLink).toBeFocused();

    const focusStyle = await firstLink.evaluate((link) => {
      const style = getComputedStyle(link, "::after");
      return {
        outlineOffset: style.outlineOffset,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });
    expect(focusStyle).toEqual({
      outlineOffset: "2px",
      outlineStyle: "solid",
      outlineWidth: "2px",
    });

    const card = firstLink.locator("xpath=ancestor::article");
    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(cardBox?.x ?? 0).toBeGreaterThanOrEqual(4);
    expect((cardBox?.x ?? 0) + (cardBox?.width ?? 0)).toBeLessThanOrEqual(316);

    await card.hover();
    await expect(card).toHaveCSS("transform", "none");
    await expect(card.locator("img")).toHaveCSS("transform", "none");
  });

  test("the cover area activates the card's single detail link", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.goto("/?section=all", { waitUntil: "domcontentloaded" });

    const firstLink = page
      .getByRole("link", { name: /view details for/i })
      .first();
    const card = firstLink.locator("xpath=ancestor::article");
    const coverBox = await card.locator(":scope > div").first().boundingBox();
    expect(coverBox).not.toBeNull();

    await Promise.all([
      page.waitForURL(/\/books\/[^/]+$/),
      page.mouse.click(
        (coverBox?.x ?? 0) + (coverBox?.width ?? 0) / 2,
        (coverBox?.y ?? 0) + (coverBox?.height ?? 0) / 2,
      ),
    ]);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
