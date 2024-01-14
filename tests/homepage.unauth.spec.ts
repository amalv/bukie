import { test, expect } from "@playwright/test";

test("has title Bukie", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Bukie");
});

test('should display the "Dune (Dune, #1)" book', async ({ page }) => {
  await page.goto("/");

  const bookButton = await page.locator('text="Dune (Dune, #1)"');
  await expect(bookButton).toBeVisible();
});

test("should filter books by title", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Search by title or author").fill("Fahrenheit 451");

  const bookButton = page.locator('text="Fahrenheit 451"');
  await expect(bookButton).toBeVisible();
});

test("should prompt unauthenticated user to authenticate when favoriting a book", async ({
  page,
}) => {
  await page.goto("/");

  const favoriteButton = page.getByLabel("Add to favorites").first();
  await favoriteButton.click();

  await expect(page.getByText("Don't have an account? Sign up")).toBeVisible();
});
