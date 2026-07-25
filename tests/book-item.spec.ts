import { expect, test } from "@playwright/test";

test.describe("Book item page", () => {
  test("Given the homepage when cards load then unavailable library actions are absent", async ({
    page,
  }) => {
    const viewports = [320, 640, 768, 1024, 1280] as const;
    const unavailableRequests: string[] = [];
    page.on("response", (response) => {
      if (
        /\/books\/[^/]+\/add(?:\?|$)/.test(response.url()) &&
        response.status() >= 400
      ) {
        unavailableRequests.push(response.url());
      }
    });

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "networkidle" });

      await expect(
        page.getByRole("link", { name: /add to library/i }),
      ).toHaveCount(0);
      await expect(page.locator('a[href*="/add"]')).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: /view details for/i }).first(),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }

    expect(unavailableRequests).toEqual([]);
  });

  test("Given the homepage when a reader opens a book then the details page loads", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const firstCardLink = page
      .getByRole("link", { name: /view details for/i })
      .first();
    await firstCardLink.waitFor({ state: "visible" });

    await Promise.all([
      page.waitForURL(/\/books\/[^/]+$/),
      firstCardLink.click(),
    ]);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
