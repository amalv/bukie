import path from "node:path";
import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

const DUNE_ID = "7adeda04-34e2-5a7d-a101-de0578138b29";
const PARTIAL_ID = "00a218bd-3005-59cd-9c23-13efb48abe5a";

function workUrl(baseURL: string | undefined, id: string): string {
  if (!baseURL) throw new Error("Playwright baseURL is required");
  return new URL(`/books/${id}`, baseURL).toString();
}

test.describe("Book item page", () => {
  test.describe.configure({ mode: "serial" });

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

  test("server renders reader-facing book content and structured data", async ({
    baseURL,
    page,
    request,
  }) => {
    const url = workUrl(baseURL, DUNE_ID);
    const response = await request.get(url);
    const html = await response.text();
    expect(response.ok()).toBe(true);
    expect(html).toContain("Dune");
    expect(html).toContain("About the book");
    expect(html).toContain("Book details");
    expect(html).not.toMatch(/preferred edition|metadata sources|provenance/i);
    expect(html).toContain('type="application/ld+json"');

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(url);
    await expect(
      page.getByRole("heading", { level: 1, name: "Dune" }),
    ).toBeVisible();
    const headings = await page.getByRole("heading").allTextContents();
    expect(headings.slice(0, 3)).toEqual([
      "Dune",
      "About the book",
      "Book details",
    ]);
    await expect(page.getByText("1965", { exact: true })).toBeVisible();
    await expect(page.getByText("ISBN-13", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Science Fiction" }),
    ).toHaveAttribute("href", "/?category=science-fiction");
    await expect(
      page.getByText(/metadata sources|view sources|resolution/i),
    ).toHaveCount(0);

    const jsonLd = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ??
        "",
    );
    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Book",
      name: "Dune",
      author: ["Frank Herbert"],
      genre: ["Science Fiction"],
    });
    expect(JSON.stringify(jsonLd)).not.toMatch(/rating|popularity|trending/i);
  });

  test("partial records recover without empty metadata groups or invented facts", async ({
    baseURL,
    page,
  }) => {
    await page.goto(workUrl(baseURL, PARTIAL_ID), {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Moby-Dick" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "About the book" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Book details" }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        /description is not available|publication details are not available/i,
      ),
    ).toHaveCount(0);
    await expect(page.getByText(/rating|publisher:/i)).toHaveCount(0);
  });

  test("catalog and category navigation have keyboard focus at responsive widths", async ({
    baseURL,
    page,
  }) => {
    for (const [width, height] of [
      [320, 900],
      [768, 1024],
      [1440, 1000],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(workUrl(baseURL, DUNE_ID), {
        waitUntil: "domcontentloaded",
      });
      await expect(
        page.getByRole("heading", { level: 1, name: "Dune" }),
      ).toBeVisible();

      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      if (width === 1440) {
        const columnGap = await page
          .locator("[data-book-detail-layout]")
          .evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).columnGap),
          );
        expect(columnGap).toBeGreaterThanOrEqual(32);
      }

      const catalogLink = page.getByRole("link", { name: "Back to catalog" });
      let catalogFocused = false;
      for (let index = 0; index < 10; index += 1) {
        await page.keyboard.press("Tab");
        if (await catalogLink.evaluate((element) => element === document.activeElement)) {
          catalogFocused = true;
          break;
        }
      }
      expect(catalogFocused).toBe(true);
      const focusStyle = await catalogLink.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          transitionDuration: style.transitionDuration,
        };
      });
      expect(focusStyle.outlineStyle).not.toBe("none");
      expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(
        2,
      );
      expect(focusStyle.transitionDuration).toBe("0s");

      const categoryLink = page.getByRole("link", {
        name: "Science Fiction",
      });
      let categoryFocused = false;
      for (let index = 0; index < 10; index += 1) {
        await page.keyboard.press("Tab");
        if (
          await categoryLink.evaluate(
            (element) => element === document.activeElement,
          )
        ) {
          categoryFocused = true;
          break;
        }
      }
      expect(categoryFocused).toBe(true);
      const categoryFocusStyle = await categoryLink.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          transitionDuration: style.transitionDuration,
        };
      });
      expect(categoryFocusStyle.outlineStyle).not.toBe("none");
      expect(
        Number.parseFloat(categoryFocusStyle.outlineWidth),
      ).toBeGreaterThanOrEqual(2);
      expect(categoryFocusStyle.transitionDuration).toBe("0s");
    }
  });

  test("withdrawn cover evidence produces an honest missing-cover treatment", async ({
    baseURL,
    page,
  }) => {
    test.skip(
      !baseURL?.startsWith("http://127.0.0.1:"),
      "Requires the isolated local Playwright catalog",
    );
    const databasePath = path.resolve(
      ".data",
      "catalog-targets",
      "playwright-runtime.sqlite",
    );
    const database = new Database(databasePath);
    database.pragma("foreign_keys = ON");
    const previous = database
      .prepare(
        `select
           h.resolution_id as resolutionId,
           r.entity_type as entityType,
           r.entity_id as entityId,
           r.field_key as fieldKey,
           r.resolver_version as resolverVersion
         from works w
         join field_resolution_heads h
           on h.entity_type = 'edition'
          and h.entity_id = w.preferred_edition_id
          and h.field_key = 'edition.covers'
         join field_resolutions r on r.id = h.resolution_id
         where w.id = ?`,
      )
      .get(DUNE_ID) as
      | {
          resolutionId: string;
          entityType: string;
          entityId: string;
          fieldKey: string;
          resolverVersion: string;
        }
      | undefined;
    expect(previous).toBeTruthy();
    if (!previous) {
      database.close();
      return;
    }

    const withdrawnResolutionId = `playwright-withdrawn-cover-${Date.now()}`;
    database.transaction(() => {
      database
        .prepare(
          `insert into field_resolutions (
             id, entity_type, entity_id, field_key, selected_observation_id,
             state, reason, previous_resolution_id, actor_ref,
             resolver_version, resolved_at
           ) values (?, ?, ?, ?, null, 'withdrawn', ?, ?, ?, ?, ?)`,
        )
        .run(
          withdrawnResolutionId,
          previous.entityType,
          previous.entityId,
          previous.fieldKey,
          "Playwright isolated withdrawn-cover fixture",
          previous.resolutionId,
          "system:playwright",
          previous.resolverVersion,
          Date.now(),
        );
      database
        .prepare(
          `update field_resolution_heads
           set resolution_id = ?
           where entity_type = ? and entity_id = ? and field_key = ?`,
        )
        .run(
          withdrawnResolutionId,
          previous.entityType,
          previous.entityId,
          previous.fieldKey,
        );
    })();

    try {
      await page.goto(workUrl(baseURL, DUNE_ID), {
        waitUntil: "domcontentloaded",
      });
      await expect(
        page.getByRole("img", { name: "No cover available for Dune" }),
      ).toBeVisible();
      await expect(page.getByText("Cover not available")).toBeVisible();
      await expect(
        page.getByText(/withdrawn|metadata sources|view sources/i),
      ).toHaveCount(0);
    } finally {
      database.transaction(() => {
        database
          .prepare(
            `update field_resolution_heads
             set resolution_id = ?
             where entity_type = ? and entity_id = ? and field_key = ?`,
          )
          .run(
            previous.resolutionId,
            previous.entityType,
            previous.entityId,
            previous.fieldKey,
          );
        database
          .prepare("delete from field_resolutions where id = ?")
          .run(withdrawnResolutionId);
      })();
      database.close();
    }
  });
});
