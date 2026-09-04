# 05: Share refresh provenance and summary across both sources

Type: grilling
Status: needs-triage
Blocked by: 02

## Question

`deepswe-snapshot.ts` and `openrouter-snapshot.ts` each export a symbol named `origin` meaning a different host, plus one-line URL builders and set-difference helpers exported only because the shells need them. Both shells build the same `### Data summary` table with the same heredoc-delimiter comment, and both re-hardcode their `source` and `sourceUrl` literals instead of stamping `Provenance` in one place.

Recommendation strength at review: Speculative. Dependency category: in-process.

## Shape to grill

- The shared refresh notions (provenance stamping, warnings, summary table, `GITHUB_OUTPUT` heredoc, snapshot writer) as one module both runs compose with, leaving each source module with only what is source-specific (cost adjustments and mapping generation; consumer endpoint rule and disappearance audit).
- Best done as part of ticket 02, not on its own; this ticket exists so the duplication is not forgotten if ticket 02 is scoped narrowly.
