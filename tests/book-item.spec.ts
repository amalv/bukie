import { expect, test } from "@playwright/test";

test.describe("Book item page", () => {
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
