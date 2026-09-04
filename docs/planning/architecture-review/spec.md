# Spec: Architecture review, September 2026

An `/improve-codebase-architecture` pass on 2026-09-03 surfaced five deepening candidates, ranked by how much behaviour each would put behind one interface and how hot its files are in the commit history. Each candidate is a ticket; each is grilled before it is built, and the grilling's decisions land in the ticket, with an ADR only where the trade-off is hard to reverse.

Vocabulary: the `/codebase-design` terms (module, interface, seam, adapter, depth, leverage, locality) for the architecture; [docs/context.md](../../context.md) for the domain.

Tickets, in recommended order:

1. [Deepen the leaderboard module](tickets/01-leaderboard-module.md): resolved, ADR 0005.
2. [Put a refresh run behind each shell script](tickets/02-refresh-run-module.md)
3. [One checked-in data module validating all four snapshots](tickets/03-checked-in-data-module.md)
4. [Collapse formatting and sorting into a column module](tickets/04-column-module.md)
5. [Share refresh provenance and summary across both sources](tickets/05-shared-refresh-vocabulary.md): folds into ticket 02.
