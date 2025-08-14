import { test, expect } from "@playwright/test";

// This test assumes seed creates books with id = "1" ... "50".
// If running against a fresh dev DB, run: bun run db:seed

test.describe("Book item page", () => {
  test("navigates from home to item and shows content", async ({ page }) => {
    await page.goto("/");
    const firstCardLink = page.locator('a[href="/books/1"]');
    await firstCardLink.first().click();
    await expect(page).toHaveURL(/\/books\/1$/);
    await expect(page.getByRole("heading")).toBeVisible();
  });
});
