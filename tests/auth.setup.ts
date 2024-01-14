import { test as setup } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

const authFile = "playwright/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const username = process.env.VITE_AUTH0_TEST_USERNAME;
  const password = process.env.VITE_AUTH0_TEST_PASSWORD;

  await page.goto("/");
  await page.getByRole("button", { name: "Log In" }).click();
  await page.screenshot({ path: "screenshot.png" });
  await page.getByLabel("Email address").click();
  await page.getByLabel("Email address").fill(username);
  await page.getByLabel("Password").click();
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // Wait until the page receives the cookies.
  //
  // Sometimes login flow sets cookies in the process of several redirects.
  // Wait for the final URL to ensure that the cookies are actually set.
  await page.waitForNavigation();

  await page.context().storageState({ path: authFile });
});
