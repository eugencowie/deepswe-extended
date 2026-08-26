import { expect, test } from "vite-plus/test";

import { modelMapping } from "@/data/sources";
import { vendorMarkSvgs } from "./vendor-mark-svgs";

// A new vendor in the model mapping must force a vendor-mark decision rather
// than silently rendering without one (ticket 16).
test("every vendor in the model mapping has a vendor mark", () => {
  const vendors = new Set(modelMapping.map((entry) => entry.vendor));
  for (const vendor of vendors) {
    expect(vendorMarkSvgs[vendor], `missing vendor mark for ${vendor}`).toBeDefined();
  }
});

test("every vendor mark is inline SVG markup", () => {
  for (const [vendor, svg] of Object.entries(vendorMarkSvgs)) {
    expect(svg.startsWith("<svg"), `${vendor} mark is not SVG markup`).toBe(true);
  }
});
