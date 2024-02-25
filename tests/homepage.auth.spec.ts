import { expect, test } from "@playwright/test";

test("shows avatar when user is logged in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("user-avatar")).toBeVisible();
});
