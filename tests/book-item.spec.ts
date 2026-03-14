import { test, expect } from "@playwright/test";

// The home page links to book detail pages using canonical book ids.

test.describe("Book item page", () => {
  test("navigates from home to item and shows content", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Act: click the first visible book card link (accessible label on image link)
    const firstCardLink = page.getByRole("link", { name: /view details for/i }).first();
    await firstCardLink.waitFor({ state: "visible" });
    await Promise.all([
      page.waitForURL(/\/books\/[^/]+$/),
      firstCardLink.click(),
    ]);

    // Assert
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
