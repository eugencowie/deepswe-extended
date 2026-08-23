import { expect, test } from "@playwright/test";

test("system theme follows OS appearance changes live", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("vite-ui-theme", "system"));
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("./");

  const html = page.locator("html");
  await expect(html).toHaveClass("light");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html).toHaveClass("dark");

  // The OS change resolves differently, but the stored preference stays "system".
  expect(await page.evaluate(() => localStorage.getItem("vite-ui-theme"))).toBe("system");
});

test("native controls follow the theme via the color-scheme property", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");

  const colorScheme = () =>
    page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  expect(await colorScheme()).toBe("dark");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass("light");
  expect(await colorScheme()).toBe("light");
});

test("mode toggle shows the active selection", async ({ page }) => {
  await page.goto("./");

  const toggle = page.getByRole("button", { name: "Toggle theme" });
  await toggle.click();
  await expect(page.getByRole("menuitemradio", { name: "System" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass("dark");

  await toggle.click();
  await expect(page.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("menuitemradio", { name: "System" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});

test("an explicit theme ignores OS appearance changes", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("vite-ui-theme", "dark"));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");

  const html = page.locator("html");
  await expect(html).toHaveClass("dark");

  await page.emulateMedia({ colorScheme: "light" });
  // No reactive path exists for explicit themes, so settle before asserting.
  await page.waitForTimeout(100);
  await expect(html).toHaveClass("dark");
  expect(await page.evaluate(() => localStorage.getItem("vite-ui-theme"))).toBe("dark");
});

test("junk in the stored preference falls back to the default theme", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("vite-ui-theme", "junk"));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");

  await expect(page.locator("html")).toHaveClass("dark");
});
