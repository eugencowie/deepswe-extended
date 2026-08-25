# 05: Scaffold the Vite+ workspace and deploy the template site

Type: task
Status: resolved
Blocked by: none

## What to build

A working, deployed foundation before any feature work: the Vite+ template running locally and published to GitHub Pages, so every later ticket lands on proven CI and hosting.

Per the [spec](../spec.md) (Toolchain, Repo and deploy): Vite+ template, pnpm, mise with the vite-plus plugin; public GitHub repo `deepswe-extended` (no remote exists yet); Actions workflow gated by `vp run ready` that builds and publishes to Pages with the project base path.

User-owned: repo creation and GitHub Actions setup are handled by the user.

## Acceptance criteria

- [x] Template app runs locally under pnpm + mise; `vp run ready` passes
- [x] Public GitHub repo exists with this repo's history pushed
- [x] Push to main runs `vp run ready`, builds, and deploys to GitHub Pages
- [x] The template site loads at the project Pages URL (correct `base` path)

## Answer

Deployed: the template site is live at <https://eugencowie.github.io/deepswe-extended/>. `vp run ready` passes locally and gates the deploy workflow.

Four deviations from the spec, reviewed and accepted (spec amended; rationale in [ADR 0001](../../../architecture/0001-toolchain-conventions.md)):

- The base path is derived at deploy time by `actions/configure-pages` instead of hardcoding `base: "/deepswe-extended/"`. Local builds use `/`; a Playwright smoke at a sentinel base (ticket 06) covers the gap.
- The workflow is `.github/workflows/ci.yml`, not `deploy.yml`, because it also runs the ready gate on pull requests.
- Tailnet dev/preview scripts were added so development can happen from a remote machine. Not in the spec; kept as tooling.
- Dependencies were upgraded past the template's pins (Vite+ 0.2.9, TypeScript 7.0.2) and an `upgrade:deps` mise task plus [research notes](../research/vite-plus-package-manager-pin.md) were added. Not in the spec; the template should use current versions of dependencies, not whatever the template happens to create.
