import { expect, test, type Page } from "@playwright/test";

const combinedUrl =
  "/?q=the&category=science-fiction&period=1950-1999&sort=publication";
const zeroResultUrl =
  "/?q=no-such-book-110&category=science-fiction&period=1950-1999&sort=publication";

async function expectDefaultControls(page: Page) {
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.locator('select[name="category"]')).toHaveValue("");
  await expect(page.getByLabel("Publication period")).toHaveValue("");
  await expect(page.getByLabel("Sort by")).toHaveValue("title");
}

test.describe("URL-driven catalog filters", () => {
  test("renders a combined-filter URL on the server with active context", async ({
    page,
    request,
  }) => {
    const response = await request.get(combinedUrl);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain("Search Results");
    expect(html).toContain("Active filters:");

    await page.goto(combinedUrl, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(combinedUrl);
    await expect(
      page.getByText(/Active filters: Search: “the”/),
    ).toContainText("Category: Science Fiction");
    await expect(
      page.getByRole("heading", { level: 2, name: "Search Results" }),
    ).toBeVisible();
    await expect(page.getByText("24 of 25 books shown")).toBeVisible();
  });

  test("keeps every active parameter in filtered pagination", async ({
    page,
  }) => {
    await page.goto(combinedUrl, { waitUntil: "domcontentloaded" });
    const links = page.getByRole("link", { name: /view details for/i });
    const firstPageHrefs = await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    );

    const requestPromise = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname === "/api/books/page" &&
        url.searchParams.get("q") === "the" &&
        url.searchParams.get("category") === "science-fiction" &&
        url.searchParams.get("period") === "1950-1999" &&
        url.searchParams.get("sort") === "publication" &&
        Boolean(url.searchParams.get("after"))
      );
    });
    const loadMore = page.getByRole("button", { name: "Load More Books" });
    await loadMore.click();
    await requestPromise;

    await expect(page.getByText("25 of 25 books shown")).toBeVisible();
    const loaded = page.getByRole("button", {
      name: "All Matching Books Loaded",
    });
    await expect(loaded).toBeVisible();
    await expect(loaded).toBeFocused();
    await expect(page).toHaveURL(combinedUrl);
    const allHrefs = await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    );
    expect(allHrefs).toHaveLength(25);
    expect(new Set(allHrefs).size).toBe(allHrefs.length);
    expect(allHrefs.slice(0, firstPageHrefs.length)).toEqual(firstPageHrefs);
  });

  test("preserves canonical state through refresh and back-forward navigation", async ({
    page,
  }) => {
    await page.goto(combinedUrl, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(combinedUrl);
    await expect(page.locator('select[name="category"]')).toHaveValue(
      "science-fiction",
    );
    await expect(page.getByLabel("Publication period")).toHaveValue(
      "1950-1999",
    );
    await expect(page.getByLabel("Sort by")).toHaveValue("publication");

    await page.getByRole("link", { name: "Reset all", exact: true }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("24 of 500 books shown")).toBeVisible();
    await expectDefaultControls(page);

    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(combinedUrl);
    await expect(page.getByText("24 of 25 books shown")).toBeVisible();
    await expect(page.getByRole("searchbox")).toHaveValue("the");
    await expect(page.locator('select[name="category"]')).toHaveValue(
      "science-fiction",
    );
    await expect(page.getByLabel("Publication period")).toHaveValue(
      "1950-1999",
    );
    await expect(page.getByLabel("Sort by")).toHaveValue("publication");

    await page.goForward({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL("/");
    await expect(page.getByText("24 of 500 books shown")).toBeVisible();
    await expectDefaultControls(page);
  });

  test("restarts safely when a cursor is reused with different filters", async ({
    request,
  }) => {
    const source = await request.get(
      "/api/books/page?category=science-fiction&sort=title&limit=50",
    );
    const sourcePage = await source.json();
    const expected = await request.get(
      "/api/books/page?category=fantasy&sort=title&limit=5",
    );
    const expectedPage = await expected.json();
    const mismatched = await request.get(
      `/api/books/page?category=fantasy&sort=title&limit=5&after=${encodeURIComponent(sourcePage.nextCursor)}`,
    );
    const mismatchedPage = await mismatched.json();
    expect(
      mismatchedPage.items.map((work: { id: string }) => work.id),
    ).toEqual(expectedPage.items.map((work: { id: string }) => work.id));
  });

  test("offers one-action recovery from zero results", async ({ page }) => {
    await page.goto(zeroResultUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("0 of 0 books shown")).toBeVisible();
    await expect(
      page.getByText("No books match the active search and filters."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Reset all filters" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("24 of 500 books shown")).toBeVisible();
    await expectDefaultControls(page);
  });
});
