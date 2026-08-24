import { expect, test, type Page } from "@playwright/test";

import { deriveRows } from "../src/data/derive.ts";
import { deepsweSnapshot, modelMapping, throughputSnapshot, tiers } from "../src/data/sources.ts";

const rows = deriveRows(deepsweSnapshot, modelMapping, throughputSnapshot, tiers);
const modelCount = new Set(rows.map((row) => row.model)).size;
const claudeModelCount = new Set(
  rows.filter((row) => row.family === "claude").map((row) => row.model),
).size;

const bodyRows = (page: Page) => page.getByRole("table").locator("tbody tr");

test("the effort toggle switches between best and all entries", async ({ page }) => {
  await page.goto("./");

  await expect(bodyRows(page)).toHaveCount(modelCount);
  // Best keeps the highest effort even where a lower one scores better.
  await expect(page.getByRole("cell", { name: "Claude Fable 5 [max]" })).toBeVisible();

  await page.getByRole("button", { name: "All effort levels" }).click();
  await expect(bodyRows(page)).toHaveCount(deepsweSnapshot.entries.length);

  await page.getByRole("button", { name: "Best", exact: true }).click();
  await expect(bodyRows(page)).toHaveCount(modelCount);
});

test("the subscriptions picker adds tier rows and keeps one route per section", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: /^Subscriptions/ }).click();

  // Ticking a Claude tier adds one row per Claude model in the Best view.
  await page.getByRole("menuitemcheckbox", { name: "Max 20x" }).click();
  await expect(bodyRows(page)).toHaveCount(modelCount + claudeModelCount);

  // Unticking Claude's API leaves the tier as the section's last route, which
  // must then be locked so the section cannot empty.
  await page.getByRole("menuitemcheckbox", { name: "API" }).first().click();
  await expect(bodyRows(page)).toHaveCount(modelCount);
  await expect(page.getByRole("menuitemcheckbox", { name: "Max 20x" })).toBeDisabled();

  // ChatGPT's section is untouched: its API rows are still visible.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("cell", { name: "GPT-5.5 [xhigh]" })).toBeVisible();
});

test("the models picker removes a model everywhere and can clear to empty", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: /^Models/ }).click();

  await page.getByRole("menuitemcheckbox", { name: "Claude Fable 5" }).click();
  await expect(bodyRows(page)).toHaveCount(modelCount - 1);

  await page.getByRole("menuitem", { name: "Clear" }).click();
  await expect(
    page.getByText("No models selected. Use the Models menu to pick one or more."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: `Models (0/${modelCount})` })).toBeVisible();

  await page.getByRole("menuitem", { name: "Select all" }).click();
  await expect(bodyRows(page)).toHaveCount(modelCount);
});
