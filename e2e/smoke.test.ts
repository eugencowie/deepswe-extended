import { expect, test } from "@playwright/test";

import { createLeaderboard } from "../src/data/leaderboard.ts";
import { deepsweSnapshot, modelMapping, throughputSnapshot, tiers } from "../src/data/sources.ts";

// The default view: Best effort levels, API rows only (ticket 09).
const leaderboard = createLeaderboard({
  snapshot: deepsweSnapshot,
  mapping: modelMapping,
  throughput: throughputSnapshot,
  tiers,
});
const rowCount = leaderboard.visibleRows(leaderboard.defaultFilters()).length;

test("e2e build renders the table with no failed requests", async ({ page }) => {
  const failures: string[] = [];
  page.on("requestfailed", (request) => {
    failures.push(`${request.url()} (${request.failure()?.errorText})`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failures.push(`${response.url()} (HTTP ${response.status()})`);
    }
  });

  await page.goto("./");

  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  // Count against the derived rows, not a literal, so a data refresh that
  // changes the entry count or ranking cannot fail the deploy gate for a
  // reason that has nothing to do with the base path.
  await expect(table.locator("tbody tr")).toHaveCount(rowCount);

  expect(failures).toEqual([]);
});
