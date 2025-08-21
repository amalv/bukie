import { test, expect } from "@playwright/test";

// This test assumes seed creates books with id = "1" ... "50".
// If running against a fresh dev DB, run: bun run db:seed

test.describe("Book item page", () => {
  test("navigates from home to item and shows content", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Act: click the first visible book card link (accessible label on image link)
    const firstCardLink = page.getByRole("link", { name: /view details for/i }).first();
    await firstCardLink.waitFor({ state: "visible" });
    await Promise.all([
      page.waitForURL(/\/books\/\d+$/),
      firstCardLink.click(),
    ]);

    // Assert
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
