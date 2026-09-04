# 04: Collapse formatting and sorting into a column module

Type: grilling
Status: needs-triage

## Question

`src/data/format.ts` is eight one-line exports whose only callers are the column specs in `leaderboard-table.tsx`. The spec array claims "adding a column means adding one entry here" but is stitched to TanStack by positional index in three places, and the neighbour lookup for the derived-column border is index arithmetic. The sort toggle and blanks-last-both-ways behaviour are tested only through Playwright. Ticket 01 left two warts here on purpose: `compareBlankLast` parked in `leaderboard-sort.ts`, and `ColumnSpec.compare` taking a fourth `compareModel` argument that only the Model column reads.

Recommendation strength at review: Worth exploring. Dependency category: in-process.

## Shape to grill

- A Columns module that turns rows into rendered cells and comparators and owns the sort transition, with the formatters as internals; header and cell correspondence carried by the spec, not by index.
- Built from the leaderboard's `compareModel` (a factory or closure) so numeric comparators return to three arguments.
- `format.test.ts` value assertions survive as cell-output tests; the sort toggle and blank-last ordering gain unit tests.

## Open questions

- Does the module render React nodes, or return strings and let the table wrap them?
- Where does the strikeout rule for tier rows live: the column module or the row?
