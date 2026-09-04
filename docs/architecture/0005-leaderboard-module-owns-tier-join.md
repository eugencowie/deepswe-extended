# The Leaderboard module owns the tier join and subsidisation arithmetic

Rows were derived in `derive.ts`, filtered in `filter.ts`, and then re-joined to tiers in the table (to recover the access tag) and in the toolbar (to recompute discounts); `derive.ts` kept itself free of data imports by mirroring the tiers.json order into an `ACCESS_ROUTE_ORDER` constant held in sync by a test, and App.tsx hand-rolled the picker's model options and usage-limit notes with no tests at all. We decided one module, `src/data/leaderboard.ts`, is built once from the four snapshots and answers every question the render modules ask: rows carry their access tag, the picker receives tier discounts as numbers, filter transitions are pure exports, and the route order is read from the tiers the module was built with. The render modules stop importing data files and do presentation only; percent formatting of a tier discount stays in the toolbar.

## Considered options

- **Keep derive/filter separate and add a facade**: fails the deletion test — a pass-through that moves nothing.
- **Rows carry a route rank so `compareModel` stays module-level and pure**: widens the row with a sort key that means nothing to the domain; binding `compareModel` to the instance keeps the row about the leaderboard.
- **The module returns formatted discount labels**: would drag string formatting into the domain module and couple it to the column-formatting work that is still pending.

## Consequences

- `subsidisationFactor`, `effortRank` and the route order are no longer exported; tests exercise them only through the constructor's outputs.
- The tiers price-ordering invariant remains a live-data test, since route order follows tiers.json file order.
- `compareBlankLast` and `SortDirection` moved beside the table (`src/components/leaderboard-sort.ts`) pending a column module; they never depended on the leaderboard.
