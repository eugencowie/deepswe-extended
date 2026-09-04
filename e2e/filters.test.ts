import { expect, test, type Page } from "@playwright/test";

import { createLeaderboard } from "../src/data/leaderboard.ts";
import { deepsweSnapshot, modelMapping, throughputSnapshot, tiers } from "../src/data/sources.ts";

const modelCount = createLeaderboard({
  snapshot: deepsweSnapshot,
  mapping: modelMapping,
  throughput: throughputSnapshot,
  tiers,
}).modelOptions.length;

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

test("the subscriptions picker swaps a family to one tier and shows discounts", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: /^Subscriptions/ }).click();

  // Discount badges: the tier-wide figure plus Fable's non-standard limit.
  const maxTwenty = page.getByRole("menuitemradio", { name: /Max 20x/ });
  await expect(maxTwenty).toContainText("−97.5%");
  await expect(maxTwenty).toContainText("Fable: −95%");

  // The estimate disclaimer replaced the per-cell "(e)" marker.
  await expect(page.getByText("Subscription costs are estimates")).toBeVisible();

  // Picking a tier replaces the family's API rows: same count, new pricing.
  await maxTwenty.click();
  await expect(bodyRows(page)).toHaveCount(modelCount);
  await expect(page.getByRole("button", { name: "Subscriptions: Max 20x" })).toBeVisible();

  await page.keyboard.press("Escape");
  // Claude rows carry the tier tag; ChatGPT rows are untouched API rows.
  await expect(page.getByRole("cell", { name: /Claude Fable 5 \[max\]/ })).toContainText("Max 20x");
  await expect(page.getByRole("cell", { name: "GPT-5.5 [xhigh]" })).toBeVisible();

  // Back to API: the trigger goes quiet again.
  await page.getByRole("button", { name: "Subscriptions: Max 20x" }).click();
  await page.getByRole("menuitemradio", { name: "API" }).first().click();
  await expect(page.getByRole("button", { name: /^Subscriptions$/ })).toBeVisible();
});

test("tier rows show the API cost struck out beside the effective cost", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: /^Subscriptions/ }).click();
  await page.getByRole("menuitemradio", { name: /Max 20x/ }).click();
  await page.keyboard.press("Escape");

  // One struck value in Avg cost, one in Cost/perf.
  const fableRow = page.getByRole("row", { name: /Claude Fable 5 \[max\]/ });
  await expect(fableRow.locator("s")).toHaveCount(2);
  await expect(fableRow.locator("s").first()).toHaveText(/^\$/);
});

test("changing filters never resets the sort and both picks surface in the trigger", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Avg cost", exact: true }).click();
  const avgCost = page.getByRole("columnheader", { name: "Avg cost" });
  await expect(avgCost).toHaveAttribute("aria-sort", "descending");

  await page.getByRole("button", { name: "All effort levels" }).click();
  await page.getByRole("button", { name: /^Subscriptions/ }).click();
  await page.getByRole("menuitemradio", { name: /Max 5x/ }).click();
  await page.getByRole("menuitemradio", { name: /^Plus/ }).click();
  await page.keyboard.press("Escape");

  await expect(avgCost).toHaveAttribute("aria-sort", "descending");
  // Both non-API picks in the trigger, Claude first (section order).
  await expect(page.getByRole("button", { name: "Subscriptions: Max 5x · Plus" })).toBeVisible();
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
