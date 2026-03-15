import { expect, test } from "@playwright/test";

test.describe("All Books pagination", () => {
  test("Given a desktop viewport when All Books loads then rows stay full and the visible count updates", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1800 });
    await page.goto("/?section=all", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 2, name: "All Books" }),
    ).toBeVisible();
    await expect(page.getByText("24 books shown")).toBeVisible();

    const beforeRowCounts = await page
      .getByRole("link", { name: /view details for/i })
      .evaluateAll((links) => {
        const rows = new Map<number, number>();

        for (const link of links) {
          const top = Math.round(link.getBoundingClientRect().top);
          rows.set(top, (rows.get(top) ?? 0) + 1);
        }

        return Array.from(rows.values());
      });

    expect(beforeRowCounts.length).toBeGreaterThan(0);
    expect(new Set(beforeRowCounts).size).toBe(1);

    await page.getByRole("button", { name: "Load More Books" }).click();

    await expect(page.getByText("48 books shown")).toBeVisible();

    const afterRowCounts = await page
      .getByRole("link", { name: /view details for/i })
      .evaluateAll((links) => {
        const rows = new Map<number, number>();

        for (const link of links) {
          const top = Math.round(link.getBoundingClientRect().top);
          rows.set(top, (rows.get(top) ?? 0) + 1);
        }

        return Array.from(rows.values());
      });

    expect(afterRowCounts.length).toBeGreaterThan(0);
    expect(new Set(afterRowCounts).size).toBe(1);
  });
});
