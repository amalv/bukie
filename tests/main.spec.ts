import { test, expect } from "@playwright/test";

test("has title Bukie", async ({ page }) => {
  await page.goto("/");

  // Expect a title "to be" Bukie.
  await expect(page).toHaveTitle("Bukie");
});
