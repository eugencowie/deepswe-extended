import { expect, test } from "@playwright/test";

import snapshot from "../data/deepswe-v1.1.json" with { type: "json" };

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
  // Count against the snapshot, not a literal, so a data refresh that changes
  // the entry count or ranking cannot fail the deploy gate for a reason that
  // has nothing to do with the base path.
  await expect(table.locator("tbody tr")).toHaveCount(snapshot.entries.length);

  expect(failures).toEqual([]);
});
