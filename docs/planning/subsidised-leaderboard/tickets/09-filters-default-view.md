# 09: Filters and default view

Type: task
Status: ready-for-agent
Blocked by: 08

## What to build

The table becomes filterable like the DeepSWE site's: filters for vendor (from the mapping's vendor field), access route, and effort level, plus a per-model include/exclude multi-select dropdown with every model ticked by default. The default view shows API rows only (62 rows); tiers are opt-in through the access-route filter. Effort and access are row fields, not columns (tickets 06/08), so these filters need no column to act on. The footer already exists — its lines shipped with tickets 06–08.

Per the [spec](../spec.md) (App section).

## Acceptance criteria

- [ ] First load shows only the 62 API rows; enabling tiers via the access filter reveals tier rows
- [ ] Vendor, access-route, and effort filters compose with each other and with sorting
- [ ] Unticking a model removes all its rows — every effort level and access route
- [ ] `vp run ready` passes and the deployed site has working filters
