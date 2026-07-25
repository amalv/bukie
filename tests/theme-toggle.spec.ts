import { expect, test } from "@playwright/test";

test.describe("Theme toggle", () => {
  test("stays interactive and persists an accessible theme preference", async ({
    context,
    page,
  }) => {
    await context.clearCookies();
    await page.goto("/", { waitUntil: "networkidle" });

    const toggle = page.locator('header button[type="button"]');
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAccessibleName(/switch to dark mode/i);
    await expect(toggle).toHaveCSS("cursor", "pointer");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await page.keyboard.press("Tab");
    await expect(toggle).toBeFocused();
    expect(
      await toggle.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          color: style.outlineColor,
          offset: Number.parseFloat(style.outlineOffset),
          style: style.outlineStyle,
          width: Number.parseFloat(style.outlineWidth),
        };
      }),
    ).toMatchObject({
      color: "rgb(14, 165, 233)",
      offset: 2,
      style: "solid",
      width: 2,
    });

    const restingBackground = await toggle.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    await toggle.hover();
    await expect
      .poll(() =>
        toggle.evaluate((element) => getComputedStyle(element).backgroundColor),
      )
      .not.toBe(restingBackground);

    const persistenceRequests: string[] = [];
    page.on("request", (request) => {
      if (request.method() !== "GET") persistenceRequests.push(request.url());
    });

    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveAccessibleName(/switch to light mode/i);

    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveCSS("outline-color", "rgb(56, 189, 248)");

    const cookie = (await context.cookies()).find(
      ({ name }) => name === "theme",
    );
    expect(cookie).toMatchObject({
      httpOnly: false,
      name: "theme",
      path: "/",
      sameSite: "Lax",
      secure: false,
      value: "dark",
    });
    expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000 + 360 * 86400);
    await page.waitForTimeout(250);
    expect(persistenceRequests).toEqual([]);

    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  });
});
